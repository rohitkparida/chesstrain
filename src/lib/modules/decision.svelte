<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Chess } from 'chess.js';
  import ChessBoard from '../../components/ChessBoard.svelte';
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import TrainingModuleShell from '../../components/TrainingModuleShell.svelte';
  import { getTerminalState } from '../chess/board';
  import { applyUciMove, sanForUciMove } from '../chess/moves';
  import { StockfishEngine } from '../chess/engine';
  import { recordTrainingAttempt } from '../../stores/session';
  import {
    DECISION_SCENARIOS,
    isDecisionProcessReady,
    scoreDecisionMove,
    scoreDecisionProcess,
    type DecisionScenario,
  } from './decisionContent';

  let scenarioIndex = $state(0);
  let scenario = $derived(DECISION_SCENARIOS[scenarioIndex]);
  let currentFen = $state(DECISION_SCENARIOS[0]?.fen ?? '');
  let threatId = $state<string | null>(null);
  let candidateIds = $state<string[]>([]);
  let refutationId = $state<string | null>(null);
  let committed = $state(false);
  let thinking = $state(false);
  let feedback = $state('');
  let rounds = $state(0);
  let lastMoveQuality = $state<number | null>(null);
  let discoveredCandidate = $state<string | null>(null);
  let discoveredReply = $state<string | null>(null);
  let requestGeneration = 0;
  let engine: StockfishEngine;

  let process = $derived(scoreDecisionProcess(scenario, { threatId, candidateIds, refutationId, committed }));
  let processReady = $derived(isDecisionProcessReady(scenario, { threatId, candidateIds, refutationId, committed }));

  function chooseThreat(id: string) { threatId = id; candidateIds = []; refutationId = null; }

  function toggleCandidate(id: string) {
    if (candidateIds.includes(id)) {
      candidateIds = candidateIds.filter((candidateId) => candidateId !== id);
      if (candidateIds.length < 2) refutationId = null;
    } else if (candidateIds.length < 3) {
      candidateIds = [...candidateIds, id];
    }
  }

  function chooseRefutation(id: string) { refutationId = id; }

  function handleMove(from: string, to: string, afterFen: string) {
    if (!processReady || thinking || committed) return;
    const generation = ++requestGeneration;
    const userMove = `${from}${to}`.toLowerCase();
    const beforeFen = currentFen;
    thinking = true;
    committed = true;
    currentFen = afterFen;
    lastMoveQuality = scoreDecisionMove(scenario, userMove);
    recordTrainingAttempt({ exerciseId: scenario.id, module: 'decision', correctness: (process.processScore + lastMoveQuality) / 2, startedAt: Date.now(), tags: ['decision'], source: 'curated', positionFingerprint: beforeFen });
    discoveredCandidate = null;
    discoveredReply = null;
    feedback = 'Commitment recorded. Waiting for the opponent reply...';

    void engine.getBestMove(beforeFen).catch(() => '').then((bestMove) => {
      if (generation !== requestGeneration) return;
      discoveredCandidate = bestMove ? sanForUciMove(beforeFen, bestMove) : null;
      const terminal = getTerminalState(new Chess(afterFen));
      if (terminal !== 'ongoing') {
        thinking = false;
        rounds++;
        feedback = `Commitment complete. Position is ${terminal}.`;
        return;
      }
      return engine.getBestMove(afterFen).catch(() => '').then((reply) => {
        if (generation !== requestGeneration) return;
        const response = reply ? applyUciMove(afterFen, reply) : null;
        if (response) currentFen = response.afterFen;
        discoveredReply = response ? response.move.san : null;
        thinking = false;
        rounds++;
        feedback = response ? `Commitment complete. Opponent played ${sanForUciMove(afterFen, reply)}.` : 'Commitment complete. No engine reply was available.';
      });
    });
  }

  function reset() {
    requestGeneration++;
    currentFen = scenario.fen ?? '';
    threatId = null;
    candidateIds = [];
    refutationId = null;
    committed = false;
    thinking = false;
    lastMoveQuality = null;
    discoveredCandidate = null;
    discoveredReply = null;
    feedback = '';
  }

  function nextScenario() {
    scenarioIndex = (scenarioIndex + 1) % DECISION_SCENARIOS.length;
    reset();
  }

  onMount(() => { engine = new StockfishEngine(); });
  onDestroy(() => { engine?.terminate(); });
</script>

<TrainingModuleShell title="Choosing a Move" task={scenario.prompt} taskKeywords={['changed', 'forcing replies', 'practical candidates']} onReset={reset} onSkip={nextScenario}>
  <p class="scenario-meta">Position after {scenario.opponentMove}</p>

  <ChessBoard
    fen={currentFen}
    onMove={handleMove}
    playable={processReady && !thinking && !committed}
    showUndo={false}
    inactiveLabel={thinking ? 'Engine thinking...' : committed ? 'Move played. Continue.' : `Step ${process.completed} of ${process.total - 1}`}
  />

  <div class="steps">
    <fieldset>
      <legend>1. Identify the threat</legend>
      <div class="choice-list" role="group" aria-label="Threat choices">
        {#each scenario.threatOptions as choice}
          <button class:selected={threatId === choice.id} aria-pressed={threatId === choice.id} onclick={() => chooseThreat(choice.id)}>{choice.label}</button>
        {/each}
      </div>
    </fieldset>

    {#if threatId}<fieldset>
      <legend>2. Name at least two candidates</legend>
      <div class="choice-list" role="group" aria-label="Candidate choices">
        {#each scenario.candidateOptions as choice}
          <button class:selected={candidateIds.includes(choice.id)} aria-pressed={candidateIds.includes(choice.id)} onclick={() => toggleCandidate(choice.id)}>{choice.label}</button>
        {/each}
      </div>
      <small>{candidateIds.length}/2 candidates selected</small>
    </fieldset>{/if}

    {#if candidateIds.length >= 2}<fieldset>
      <legend>3. Check the refutation</legend>
      <div class="choice-list" role="group" aria-label="Refutation choices">
        {#each scenario.refutationOptions as choice}
          <button class:selected={refutationId === choice.id} aria-pressed={refutationId === choice.id} onclick={() => chooseRefutation(choice.id)}>{choice.label}</button>
        {/each}
      </div>
    </fieldset>{/if}

    {#if candidateIds.length >= 2}
      <div class="commitment-step" aria-label="Final commitment">
        <strong>4. Final commitment</strong>
        <span>{processReady ? 'Play your move on the board.' : 'Choose the best reply, then play your move.'}</span>
      </div>
    {/if}
  </div>

  {#if rounds > 0}
    <ObjectiveMetrics title="Decision evidence" items={[
      { label: 'Process score', value: `${Math.round(process.processScore * 100)}%` },
      { label: 'Move result', value: lastMoveQuality === null ? 'Pending' : lastMoveQuality === 1 ? 'Kept the expected result' : 'Needs review' },
      { label: 'Positions attempted', value: `${rounds}` }
    ]} note="Process quality measures the checklist. Move quality is scored separately from the process." />
  {/if}

  {#if discoveredCandidate || discoveredReply}
    <div class="engine-state" role="status">
      {#if discoveredCandidate}<span>Engine candidate: {discoveredCandidate}</span>{/if}
      {#if discoveredReply}<span>Engine reply: {discoveredReply}</span>{/if}
    </div>
  {/if}
  <p class="status-text">{feedback}</p>
      {#if committed && !thinking}<button class="next" onclick={nextScenario}>Next</button>{/if}
</TrainingModuleShell>

<style>
  .scenario-meta { margin: 0; color: var(--text-4); font-size: 0.85rem; }
  .steps { display: flex; flex-direction: column; gap: 0.7rem; border-top: 1px solid var(--border); padding-top: 0.7rem; }
  fieldset { display: flex; flex-direction: column; gap: 0.45rem; min-width: 0; border: 0; padding: 0; margin: 0; }
  fieldset:disabled { opacity: 0.5; }
  legend { color: var(--text-1); font-weight: 700; font-size: 0.95rem; padding: 0; }
  .choice-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  button { color: var(--text-2); background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 0.55rem 0.7rem; cursor: pointer; text-align: left; }
  button:hover, button.selected { color: var(--text-1); border-color: var(--accent); background: var(--accent-dim); }
  small { color: var(--text-4); }
  .commitment-step { display: flex; flex-direction: column; gap: 0.2rem; color: var(--text-3); }
  .commitment-step strong { color: var(--text-1); }
  .engine-state, .status-text { border-top: 1px solid var(--border); padding-top: 0.7rem; color: var(--text-3); }
  .engine-state { display: flex; flex-wrap: wrap; gap: 0.8rem; font-size: 0.88rem; }
  .status-text { margin: 0; }
  .next { align-self: flex-start; color: var(--accent); }
</style>
