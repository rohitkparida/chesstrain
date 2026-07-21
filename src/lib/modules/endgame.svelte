<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Chess } from 'chess.js';
  import ChessBoard from '../../components/ChessBoard.svelte';
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import TrainingModuleShell from '../../components/TrainingModuleShell.svelte';
  import { getTerminalState, type TerminalState } from '../chess/board';
  import { applyUciMove, sanForUciMove } from '../chess/moves';
  import { StockfishEngine } from '../chess/engine';
  import { recordTrainingAttempt } from '../../stores/session';
  import {
    ENDGAME_SCENARIOS,
    legalCueAnnotations,
    resultForTerminalState,
    scoreEndgameResult,
    scoreResultPreservation,
    type EndgameScenario,
    type TheoreticalResult,
  } from './endgameContent';

  let scenarioIndex = $state(0);
  let scenario = $derived(ENDGAME_SCENARIOS[scenarioIndex]);
  let currentFen = $state(ENDGAME_SCENARIOS[0]?.fen ?? '');
  let thinking = $state(false);
  let feedback = $state('');
  let terminalState = $state<TerminalState>('ongoing');
  let rounds = $state(0);
  let preserved = $state(0);
  let lastResult = $state<TheoreticalResult | null>(null);
  let revealedCues = $state(false);
  let requestGeneration = 0;
  let engine: StockfishEngine;
  let cueAnnotations = $derived(legalCueAnnotations(scenario.fen ?? '', scenario.cues.flatMap((cue) => cue.annotations)));

  function classifyTerminal(fen: string): TheoreticalResult | null {
    const game = new Chess(fen);
    const state = getTerminalState(game);
    terminalState = state;
    return resultForTerminalState(state, game.turn(), scenario.perspective);
  }

  function handleMove(from: string, to: string, afterFen: string) {
    if (thinking || terminalState !== 'ongoing') return;
    const generation = ++requestGeneration;
    const beforeFen = currentFen;
    const userMove = `${from}${to}`.toLowerCase();
    const movePreserves = scenario.preservingMoves.includes(userMove);
    thinking = true;
    revealedCues = false;
    currentFen = afterFen;
    const immediateResult = classifyTerminal(afterFen);
    lastResult = immediateResult ?? (movePreserves ? scenario.theoreticalResult : null);
    recordTrainingAttempt({ exerciseId: scenario.id, module: 'endgame', correctness: movePreserves ? 1 : 0, startedAt: Date.now(), tags: ['endgame'], source: 'curated', positionFingerprint: beforeFen });
    feedback = 'Calculating the engine reply...';

    if (immediateResult) {
      thinking = false;
      rounds++;
      if (scoreResultPreservation(scenario.theoreticalResult, immediateResult) === 1) preserved++;
      feedback = `Terminal outcome: ${terminalState}.`;
      return;
    }
    void engine.getBestMove(afterFen).catch(() => '').then((reply) => {
        if (generation !== requestGeneration) return;
        const response = reply ? applyUciMove(afterFen, reply) : null;
        if (response) {
          currentFen = response.afterFen;
          const replyResult = classifyTerminal(response.afterFen);
          if (replyResult) lastResult = replyResult;
        }
        thinking = false;
        revealedCues = true;
        rounds++;
        if (lastResult && scoreEndgameResult(scenario.theoreticalResult, lastResult).preserved) preserved++;
        feedback = response ? `Result ${lastResult === scenario.theoreticalResult ? 'preserved' : 'at risk'}. Opponent played ${sanForUciMove(afterFen, reply)}.` : 'Move recorded. No engine reply was available.';
    });
  }

  function reset() {
    requestGeneration++;
    currentFen = scenario.fen ?? '';
    classifyTerminal(currentFen);
    thinking = false;
    rounds = 0;
    preserved = 0;
    lastResult = null;
    revealedCues = false;
    feedback = '';
  }

  function nextScenario() {
    scenarioIndex = (scenarioIndex + 1) % ENDGAME_SCENARIOS.length;
    reset();
  }

  onMount(() => {
    engine = new StockfishEngine();
    classifyTerminal(currentFen);
  });
  onDestroy(() => { engine?.terminate(); });
</script>

<TrainingModuleShell title="Endgame practice" task={scenario.goal ?? 'Keep the expected result.'} taskKeywords={['win', 'stalemate', 'king and rook', 'winning result']} onReset={reset}>
  <p class="scenario-meta">{scenario.title}</p>
  <ChessBoard
    fen={currentFen}
    onMove={handleMove}
    playable={!thinking && terminalState === 'ongoing'}
    annotations={revealedCues ? cueAnnotations : []}
    showUndo={false}
    inactiveLabel={thinking ? 'Engine thinking...' : terminalState === 'ongoing' ? 'Choose a move.' : terminalState}
  />

  {#if rounds > 0}
    <ObjectiveMetrics title="Endgame results" items={[
      { label: 'Kept expected result', value: `${Math.round((preserved / rounds) * 100)}%` },
      { label: 'Results kept', value: `${preserved}/${rounds}` },
      { label: 'Game result', value: terminalState }
    ]} note="A move is scored by preserving the theoretical result, not by matching Stockfish's first choice." />
  {/if}

  {#if revealedCues && cueAnnotations.length > 0}
    <div class="technique-cue" aria-label="Endgame hint">
      <strong>{scenario.cues[0].label}</strong>
      <span>{scenario.cues[0].copy}</span>
    </div>
  {/if}
  {#if lastResult}<p class="result-text" role="status">Result: {lastResult}</p>{/if}
  <p class="status-text" role="status">{feedback}</p>
  {#if rounds > 0 && !thinking}<button class="next" onclick={nextScenario}>Next</button>{/if}
</TrainingModuleShell>

<style>
  .scenario-meta { margin: 0; color: var(--text-4); font-size: 0.85rem; }
  .technique-cue { display: flex; flex-direction: column; gap: 0.25rem; border-top: 1px solid var(--border); padding-top: 0.7rem; color: var(--text-3); }
  .technique-cue strong { color: var(--accent); }
  .result-text, .status-text { margin: 0; border-top: 1px solid var(--border); padding-top: 0.7rem; color: var(--text-3); }
  button { align-self: flex-start; color: var(--accent); background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 0.55rem 0.7rem; cursor: pointer; }
</style>
