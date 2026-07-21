<script lang="ts">
  import ChessBoard from '../../components/ChessBoard.svelte';
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import TrainingModuleShell from '../../components/TrainingModuleShell.svelte';
  import type { BoardAnnotation } from '../chess/annotations';
  import { scorePositionalAnalysis, type PositionalRubricScore } from '../learning/objectiveScoring';
  import { recordTrainingAttempt } from '../../stores/session';
  
  let evalScore = $state(0);
  let feedback = $state("");
  let spaceAdv = $state("");
  let weakSquares = $state("");
  let pawnStructure = $state("");
  let feedbackError = $state(false);
  let rubric = $state<PositionalRubricScore | null>(null);
  let overlayIndex = $state(0);
  let step = $state(1);
  let startedAt = Date.now();

  const positionFen = 'r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 3 8';
  const overlays = [
    { label: 'Weak squares', annotations: [{ from: 'd6', color: '#ef5c5c', kind: 'highlight' }, { from: 'c5', color: '#ef5c5c', kind: 'highlight' }], detail: 'd6 is the main pressure point; c5 is a useful supporting square.' },
    { label: 'Open files', annotations: [{ from: 'd1', to: 'd8', color: '#4696eb' }], detail: 'The d-file is the clearest route for pressure against the d6 pawn.' },
    { label: 'Pawn break', annotations: [{ from: 'c4', to: 'c5', color: '#f5b041' }], detail: 'c4 is the useful break: it challenges the centre and opens routes for the pieces.' },
    { label: 'Preferred route', annotations: [{ from: 'c3', to: 'd3', color: '#49be7d' }, { from: 'd3', to: 'e4', color: '#49be7d' }, { from: 'e4', to: 'e5', color: '#49be7d' }], detail: 'The knight can reroute from c3 through d3 toward the strong e5 square.' }
  ];

  // Plan ranking structures
  let plans = $state([
    { id: "a", text: "Push the queenside pawns (spatial expansion)" },
    { id: "b", text: "Reroute the knight to e5 via d3" },
    { id: "c", text: "Simplify center structure via exchanges" },
    { id: "d", text: "Open the f-file for the active rook" }
  ]);

  function submitAnalysis() {
    if (![spaceAdv, weakSquares, pawnStructure].some(value => value.trim().length > 0)) {
      feedbackError = true;
      feedback = "Add at least one written observation before reviewing the position.";
      rubric = null;
      return;
    }
    feedbackError = false;
    overlayIndex = 0;
    rubric = scorePositionalAnalysis({
      evaluation: evalScore,
      space: spaceAdv,
      weakSquares,
      pawnStructure,
      planOrder: plans.map((plan) => plan.id),
    });
    recordTrainingAttempt({ exerciseId: 'positional-core-analysis', module: 'positional', correctness: rubric.total / 100, startedAt, tags: ['positional'], source: 'curated', positionFingerprint: positionFen });
    feedback = `Reference model: White is slightly better (about +0.5), with pressure on d6. Preferred plan: B, reroute the knight toward e5.`;
  }

  function movePlanUp(index: number) {
    if (index === 0) return;
    const temp = plans[index];
    plans[index] = plans[index - 1];
    plans[index - 1] = temp;
  }

  function movePlanDown(index: number) {
    if (index === plans.length - 1) return;
    const temp = plans[index];
    plans[index] = plans[index + 1];
    plans[index + 1] = temp;
  }

  function advanceStep() {
    step = Math.min(3, step + 1);
  }
</script>

<TrainingModuleShell
  title="Understanding the Position"
  task="Evaluate the position and rank the plans."
  taskKeywords={['Evaluate', 'rank the plans']}
>
  
  <div class="board-layout">
    <ChessBoard
      fen={positionFen}
      playable={false}
      annotations={rubric ? overlays[overlayIndex].annotations as BoardAnnotation[] : []}
    />
  </div>
  
  <div class="analysis-card">
    <p class="step-label">Step {step} of 3</p>
    {#if step === 1}
      <div class="input-group">
        <label for="eval-range">How does the position feel?</label>
        <input id="eval-range" type="range" min="-3" max="3" step="0.5" bind:value={evalScore} aria-label={`Evaluation ${evalScore}`} />
        <span class="range-value">{evalScore > 0 ? '+' : ''}{evalScore}</span>
      </div>
      <button class="step-btn" onclick={advanceStep}>Continue</button>
    {:else if step === 2}
      <div class="input-group">
        <label for="space-adv">What matters most in the position?</label>
        <input id="space-adv" type="text" bind:value={spaceAdv} placeholder="Name one feature you noticed" />
      </div>
      <div class="input-group">
        <label for="weak-sq">Which squares or pawn features matter?</label>
        <input id="weak-sq" type="text" bind:value={weakSquares} placeholder="e.g. d6 or an isolated pawn" />
      </div>
      <button class="step-btn" onclick={advanceStep}>Continue</button>
    {:else}
      <div class="input-group">
        <label for="pawn-struct">Add one final observation (optional)</label>
        <input id="pawn-struct" type="text" bind:value={pawnStructure} placeholder="Anything else you noticed" />
      </div>
      <div class="input-group">
        <div class="group-label">Rank Plans (Top to Bottom)</div>
        <div class="plans-list">
          {#each plans as plan, index}
            <div class="plan-item">
              <span class="plan-badge">Plan {plan.id.toUpperCase()}</span>
              <span class="plan-text">{plan.text}</span>
              <div class="plan-actions">
                <button class="arrow-btn" onclick={() => movePlanUp(index)} aria-label="Move plan up">&#9650;</button>
                <button class="arrow-btn" onclick={() => movePlanDown(index)} aria-label="Move plan down">&#9660;</button>
              </div>
            </div>
          {/each}
        </div>
      </div>
      <button class="submit-btn" onclick={submitAnalysis}>Check position</button>
    {/if}
  </div>

  {#if rubric}
    <div class="overlay-controls" aria-live="polite">
      <div>
        <strong>{overlays[overlayIndex].label}</strong>
        <span>{overlays[overlayIndex].detail}</span>
      </div>
      <button class="overlay-btn" onclick={() => overlayIndex = (overlayIndex + 1) % overlays.length}>
        Show next visual
      </button>
    </div>
    <ObjectiveMetrics
      title="How your analysis compared"
      items={[
        { label: 'Overall match', value: `${rubric.total}/100` },
        { label: 'Position assessment', value: `${rubric.evaluation}/30` },
        { label: 'Plan ranking', value: `${rubric.plan}/30` },
        { label: 'Key features found', value: `${rubric.observations}/40`, note: rubric.matchedEvidence.join(', ') || 'No key features matched' }
      ]}
      note="This scores agreement with a disclosed reference model. It does not claim there is only one valid positional explanation."
    />
  {/if}
  {#if rubric}<button class="continue" onclick={() => { rubric = null; feedback = ''; step = 1; startedAt = Date.now(); }}>Try this position again</button>{/if}

  {#if feedback}
    <div class="feedback-card">
      <h3>Analysis Feedback</h3>
      <p class:error={feedbackError} role="status">{feedback}</p>
    </div>
  {/if}
</TrainingModuleShell>

<style>
  .board-layout {
    display: flex;
    justify-content: center;
  }
  .overlay-controls { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .overlay-controls div { display: flex; flex-direction: column; gap: 0.2rem; }
  .overlay-controls strong { color: var(--text-1); }
  .overlay-controls span { color: var(--text-3); font-size: 0.9rem; }
  .overlay-btn { border: 1px solid var(--accent-border); background: transparent; color: var(--accent); padding: 0.5rem 0.75rem; border-radius: 5px; cursor: pointer; white-space: nowrap; }
  .analysis-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 0.25rem;
    border-top: 1px solid var(--border);
  }
  .step-label { margin: 0; color: var(--text-5); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .range-value { color: var(--text-2); font-size: 0.82rem; }
  .step-btn { align-self: flex-start; border: 1px solid var(--accent-border); border-radius: 6px; background: transparent; color: var(--accent); padding: 0.6rem 0.9rem; font: inherit; font-weight: 700; cursor: pointer; }
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  label,
  .group-label {
    font-weight: 500;
    color: var(--text-3);
    font-size: 0.95rem;
  }
  input[type="text"] {
    padding: 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-1);
    border-radius: 6px;
    font-family: inherit;
  }
  input[type="range"] {
    accent-color: var(--accent);
  }
  .plans-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .plan-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 0;
    border-bottom: 1px solid var(--border);
  }
  .plan-badge {
    color: var(--accent);
    padding: 0;
    font-size: 0.8rem;
    font-weight: bold;
  }
  .plan-text {
    flex-grow: 1;
    margin-left: 1rem;
    color: var(--text-3);
    font-size: 0.9rem;
  }
  .plan-actions {
    display: flex;
    gap: 0.25rem;
  }
  .arrow-btn {
    background: transparent;
    color: var(--text-2);
    border: 1px solid var(--border-sub);
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .arrow-btn:hover {
    background: var(--surface-4);
    color: var(--text-1);
  }
  .submit-btn {
    background: var(--accent);
    color: var(--bg);
    border: none;
    padding: 0.75rem;
    font-weight: bold;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 0.5rem;
  }
  .feedback-card {
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    white-space: pre-line;
  }
  .feedback-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--text-1);
  }
  .feedback-card p {
    margin: 0;
    color: var(--text-3);
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .feedback-card p.error { color: var(--warning); }
</style>
