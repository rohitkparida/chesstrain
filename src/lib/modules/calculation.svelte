<script lang="ts">
  import { onDestroy } from 'svelte';
  import ChessBoard from '../../components/ChessBoard.svelte';
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import TrainingModuleShell from '../../components/TrainingModuleShell.svelte';
  import { assessCalculation } from '../learning/calculation';
  import { recordTrainingAttempt } from '../../stores/session';
  import { buildCalculationReplay, type CalculationReplay } from '../learning/calculationReplay';
  import type { ObjectiveMetric } from '../learning/objectiveScoring';

  const solutionLine = ["Nxf7", "Rxf7", "Qd5+", "Kh8", "Qxa8"];
  let notationInput = $state("");
  let feedback = $state("");
  let steps = $state<string[]>([]);
  let showVisualizer = $state(false);
  let isBlindfold = $state(false);
  let isBoardHidden = $state(false);
  let blindfoldReady = $state(false);
  let blindfoldCountdown = $state(0);
  let locked = $state(false);
  let metrics = $state<ObjectiveMetric[]>([]);
  let blindfoldTimer: ReturnType<typeof setInterval> | null = null;
  let notationInputElement = $state<HTMLInputElement | null>(null);
  let replay = $state<CalculationReplay | null>(null);
  let replayLine = $state<'user' | 'best'>('best');
  let replayStep = $state(0);
  let startedAt = Date.now();

  const startFen = 'r3kr2/5p1p/8/6N1/8/8/PPP1PPPP/3QK3 w - - 0 1';

  function chooseReplayLine(line: 'user' | 'best') {
    replayLine = line;
    const selected = line === 'user' ? replay?.user : replay?.best;
    if (selected) replayStep = Math.min(replayStep, selected.fens.length - 1);
  }

  function submitLine() {
    const assessment = assessCalculation(notationInput, solutionLine);
    steps = assessment.userSteps;
    feedback = assessment.feedback;
    showVisualizer = assessment.revealSolution;
    replay = assessment.revealSolution
      ? buildCalculationReplay(startFen, assessment.userSteps, solutionLine, assessment.divergedIndex)
      : null;
    replayLine = 'best';
    replayStep = 0;
    locked = assessment.status === 'correct' || assessment.status === 'incorrect';
    if (assessment.status === 'correct' || assessment.status === 'incorrect') {
      recordTrainingAttempt({ exerciseId: 'calculation-core-line', module: 'calculation', correctness: (assessment.score ?? 0) / 100, startedAt, tags: ['calculation'], source: 'curated', positionFingerprint: startFen });
    }
    metrics = assessment.status === 'empty'
      ? []
      : [
          { label: 'Moves matched from the start', value: `${assessment.matchedMoves}` },
          { label: 'Line status', value: assessment.status === 'partial' ? 'Incomplete' : assessment.status === 'correct' ? 'Correct' : 'Needs review' },
          ...(assessment.score === null ? [] : [{ label: 'Line accuracy', value: `${assessment.score}%` }])
        ];
  }

  function startBlindfold() {
    if (blindfoldTimer) clearInterval(blindfoldTimer);
    isBlindfold = true;
    isBoardHidden = false;
    blindfoldReady = false;
    blindfoldCountdown = 10;
    feedback = "You have 10 seconds to look at the board before it goes dark...";
    blindfoldTimer = setInterval(() => {
      if (blindfoldCountdown <= 1) {
        if (blindfoldTimer) clearInterval(blindfoldTimer);
        blindfoldTimer = null;
        blindfoldCountdown = 0;
        isBoardHidden = true;
        blindfoldReady = true;
        feedback = "Board is hidden. Enter the line.";
      } else {
        blindfoldCountdown -= 1;
        feedback = `You have ${blindfoldCountdown} seconds to look at the board before it goes dark...`;
      }
    }, 1000);
  }

  function reset() {
    if (blindfoldTimer) clearTimeout(blindfoldTimer);
    notationInput = "";
    feedback = "";
    steps = [];
    showVisualizer = false;
    isBlindfold = false;
    isBoardHidden = false;
    blindfoldReady = false;
    locked = false;
    metrics = [];
    replay = null;
    replayLine = 'best';
    replayStep = 0;
    startedAt = Date.now();
  }

  onDestroy(() => { if (blindfoldTimer) clearTimeout(blindfoldTimer); });
</script>

<TrainingModuleShell
  title="Calculate the line"
  task="Enter the line, then check it."
  taskKeywords={['Enter the line', 'check']}
  onReset={reset}
  onSkip={reset}
>
  <details class="mode-actions">
    <summary>Try blindfold mode</summary>
    <button class="blindfold-btn" onclick={startBlindfold} disabled={isBlindfold}>Start blindfold</button>
  </details>

  <div class="board-layout">
    {#if !isBoardHidden}
      <ChessBoard fen={startFen} playable={false} />
    {:else}
      <div class="blindfold-placeholder">Board state hidden. Calculate from memory.</div>
    {/if}
  </div>

  <form class="controls" onsubmit={(event) => { event.preventDefault(); submitLine(); }}>
    <div class="input-row">
      <input bind:value={notationInput} placeholder="e.g. Nf3 d5 Nxe5" disabled={locked || (isBlindfold && !blindfoldReady)} />
      <button class="verify-btn" type="submit" disabled={locked || (isBlindfold && !blindfoldReady)}>Check line</button>
    </div>
  </form>

  {#if feedback}<p class="feedback">{feedback}</p>{/if}
  {#if metrics.length > 0}
    <ObjectiveMetrics
      title="Calculation results"
      items={metrics}
      note="Accuracy measures agreement with this reference line, not every playable alternative."
    />
  {/if}

  {#if showVisualizer}
    <div class="tree-diff">
      <h3>Line Replay</h3>
      {#if replay}
        {@const activeLine = replayLine === 'user' ? replay.user : replay.best}
        <div class="replay-header">
          <p>Step through each line on the board. The first divergence is marked below.</p>
          <div class="replay-line-buttons">
            <button class:active={replayLine === 'user'} onclick={() => chooseReplayLine('user')}>Your line</button>
            <button class:active={replayLine === 'best'} onclick={() => chooseReplayLine('best')}>Best line</button>
          </div>
        </div>
        <div class="replay-board">
          <ChessBoard fen={activeLine.fens[replayStep] ?? startFen} playable={false} inactiveLabel={`${activeLine.label} · ${replayStep === 0 ? 'Starting position' : activeLine.moves[replayStep - 1]}`} />
        </div>
        <div class="replay-controls">
          <button class="replay-arrow" aria-label="Previous position" title="Previous position" onclick={() => replayStep = Math.max(0, replayStep - 1)} disabled={replayStep === 0}>&#8592;</button>
          <span>Position {replayStep} of {activeLine.fens.length - 1}</span>
          <button class="replay-arrow" aria-label="Next position" title="Next position" onclick={() => replayStep = Math.min(activeLine.fens.length - 1, replayStep + 1)} disabled={replayStep >= activeLine.fens.length - 1}>&#8594;</button>
        </div>
        {#if replay.divergedIndex !== null}
          <p class="divergence">First difference: move {replay.divergedIndex + 1}</p>
        {/if}
      {/if}
      <div class="tree-grid">
        <div><h4>Your path</h4>{#each steps as move}<div class="move-node user-move">{move}</div>{/each}</div>
        <div><h4>Best path</h4>{#each solutionLine as move}<div class="move-node engine-move">{move}</div>{/each}</div>
      </div>
    </div>
  {/if}
  {#if locked}<button class="continue-btn" onclick={reset}>Try again</button>{/if}
</TrainingModuleShell>

<style>
  .mode-actions { text-align: right; }
  .mode-actions summary { display: inline-block; padding: 0.35rem 0; color: var(--text-5); cursor: pointer; font-size: 0.76rem; }
  .mode-actions[open] { display: grid; justify-items: end; gap: 0.35rem; }
  .blindfold-btn, .verify-btn {
    border-radius: 6px;
    padding: 0.65rem 1rem;
    cursor: pointer;
    font-weight: 700;
  }
  .continue-btn { align-self: flex-start; border: 1px solid var(--accent-border); background: var(--accent-dim); color: var(--accent); border-radius: 6px; padding: 0.65rem 1rem; cursor: pointer; font-weight: 700; }
  .blindfold-btn { background: transparent; color: var(--accent); border: 1px solid var(--accent-border); }
  button:disabled, input:disabled { opacity: 0.5; cursor: not-allowed; }
  .board-layout { display: flex; justify-content: center; }
  .blindfold-placeholder {
    width: min(480px, 100%);
    aspect-ratio: 1;
    height: auto;
    display: grid;
    place-items: center;
    border: 3px dashed var(--border);
    border-radius: 8px;
    color: var(--text-4);
  }
  .controls, .feedback, .tree-diff { padding-top: 0.75rem; border-top: 1px solid var(--border); }
  .feedback { color: var(--text-3); }
  .input-row { display: flex; gap: 0.5rem; }
  input {
    flex: 1;
    padding: 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-1);
    border-radius: 6px;
  }
  .verify-btn { background: var(--accent); color: var(--bg); border: 0; }
  .tree-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; text-align: center; }
  .replay-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .replay-header p { color: var(--text-3); }
  .replay-line-buttons, .replay-controls { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .replay-line-buttons button, .replay-controls button { padding: 0.45rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-2); cursor: pointer; }
  .replay-line-buttons button.active { border-color: var(--accent); color: var(--accent); }
  .replay-controls { margin: 0.75rem 0; color: var(--text-3); }
  .replay-controls button:disabled { opacity: 0.45; cursor: not-allowed; }
  .divergence { color: var(--warning); text-align: center; font-weight: 700; }
  .replay-board { display: flex; justify-content: center; margin-top: 0.75rem; }
  @media(max-width:540px) { .replay-header { align-items: flex-start; flex-direction: column; } }
  .move-node { margin: 0.35rem auto; width: 110px; padding: 0.5rem; border-radius: 6px; font-weight: 700; }
  .user-move { background: var(--error-dim); border: 1px solid var(--error); color: var(--error); }
  .engine-move { background: var(--success-dim); border: 1px solid var(--success); color: var(--success); }
  @media(max-width: 540px) { .blindfold-placeholder { width: 90vw; height: 90vw; } }
</style>
