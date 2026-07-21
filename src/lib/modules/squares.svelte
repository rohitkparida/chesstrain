<script lang="ts">
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import BoardGripBoard from '../../components/BoardGripBoard.svelte';
  import TrainingModuleShell from '../../components/TrainingModuleShell.svelte';
  import { nextBoardGripRound, randomBoardGripView, type BoardGripRound } from '../learning/boardGrip';
  import { accuracyPercent } from '../learning/objectiveScoring';
  import { recordTrainingAttempt } from '../../stores/session';
  import { ALL_SQUARES, piecesFromFen } from '../learning/nameTheSquare';
  import type { BoardRotation } from '../chess/board';

  type GripOrientation = 'white' | 'black';
  const initialRound = nextBoardGripRound();
  const initialView = randomBoardGripView(initialRound.kind);
  let round = $state<BoardGripRound>(initialRound);
  let attempts = $state(0);
  let correct = $state(0);
  let streak = $state(0);
  let bestStreak = $state(0);
  let totalCorrectTimeMs = $state(0);
  let startedAt = Date.now();
  let feedback = $state('');
  let orientation = $state<GripOrientation>(initialView.orientation);
  let rotation = $state<BoardRotation>(initialView.rotation);
  let selected = $state<Set<string>>(new Set());
  let roundComplete = $state(false);

  let pieces = $derived(piecesFromFen(round.fen));

  function sameSquares(candidate: Set<string>) {
    return candidate.size === round.answers.length && round.answers.every((square) => candidate.has(square));
  }

  function advanceRound() {
    round = nextBoardGripRound(round);
    const view = randomBoardGripView(round.kind);
    selected = new Set();
    orientation = view.orientation;
    rotation = view.rotation;
    roundComplete = false;
    startedAt = Date.now();
  }

  function markCorrect() {
    const solvedLabel = round.label;
    const responseMs = Date.now() - startedAt;
    attempts++;
    correct++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    totalCorrectTimeMs += responseMs;
    recordTrainingAttempt({ exerciseId: `board-grip:${round.kind}`, module: 'board-grip', correctness: 1, startedAt, completedAt: Date.now(), tags: [round.kind], source: 'generated', positionFingerprint: round.fen });
    advanceRound();
    feedback = `Correct: ${solvedLabel}. Next drill ready.`;
  }

  function markWrong(message: string) {
    attempts++;
    streak = 0;
    recordTrainingAttempt({ exerciseId: `board-grip:${round.kind}`, module: 'board-grip', correctness: 0, startedAt, completedAt: Date.now(), tags: [round.kind], source: 'generated', positionFingerprint: round.fen });
    const names: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
    const answerText = round.answers.map((square) => {
      const piece = pieces[square];
      return piece ? `${square} ${piece.color === 'w' ? 'white' : 'black'} ${names[piece.type] ?? 'piece'}` : square;
    }).join(', ');
    feedback = `${message} Correct squares: ${answerText || 'none'}.`;
    roundComplete = true;
  }

  function evaluate(candidate: Set<string>, usedNone = false) {
    if (sameSquares(candidate)) {
      markCorrect();
      return;
    }

    if (usedNone) {
      markWrong('Not quite. This round has one or more marked squares.');
    } else if (round.answers.length === 0) {
      markWrong('No squares this time. Use No squares.');
    } else {
      markWrong('Not quite. The round is complete; continue to see the next drill.');
    }
  }

  function chooseSquare(square: string) {
    if (roundComplete) return;
    if (round.kind === 'name-square') {
      evaluate(new Set([square]));
      return;
    }

    const next = new Set(selected);
    if (next.has(square)) next.delete(square);
    else next.add(square);
    selected = next;
    feedback = `${selected.size} selected. Check when ready, or choose None.`;
  }

  function reset() {
    round = nextBoardGripRound(round);
    const view = randomBoardGripView(round.kind);
    attempts = 0;
    correct = 0;
    streak = 0;
    bestStreak = 0;
    totalCorrectTimeMs = 0;
    selected = new Set();
    orientation = view.orientation;
    rotation = view.rotation;
    roundComplete = false;
    startedAt = Date.now();
    feedback = '';
  }

  function continueAfterWrong() {
    if (!roundComplete) return;
    advanceRound();
    feedback = '';
  }
</script>

<TrainingModuleShell title="Board Vision" task="Solve the current board-vision drill." onReset={reset}>
  <div class="prompt" aria-live="polite">
    <span>{round.label}</span>
    <strong>{round.prompt}</strong>
    <span class="mode">{round.kind === 'name-square' ? 'One-tap answer' : 'Multi-select answer'}</span>
    <button onclick={() => orientation = orientation === 'black' ? 'white' : 'black'}>
      {orientation === 'black' ? 'White view' : 'Black view'}
    </button>
  </div>

  {#if round.kind !== 'name-square' && !roundComplete}
    <div class="drill-actions">
      <button onclick={() => evaluate(selected)} disabled={selected.size === 0}>Check</button>
      <button onclick={() => evaluate(new Set(), true)}>None</button>
      {#if selected.size > 0}
        <button class="ghost" onclick={() => selected = new Set()}>Clear</button>
      {/if}
    </div>
  {/if}

  <div class:locked={roundComplete}>
    <BoardGripBoard
    squares={ALL_SQUARES}
      {pieces}
      {selected}
      orientation={orientation}
      rotation={round.kind === 'name-square' ? rotation : 0}
      markedSquare={round.kind === 'attackers' ? round.targetSquare : undefined}
      correctSquares={roundComplete ? round.answers : []}
      onChoose={chooseSquare}
    />
  </div>

  <p class="feedback" role="status">{feedback}</p>

  {#if roundComplete}
    <button class="continue" onclick={continueAfterWrong}>Continue</button>
  {/if}

  {#if attempts > 0}
    <ObjectiveMetrics
      title="Board vision results"
      items={[
        { label: 'Accuracy', value: `${accuracyPercent(correct, attempts) ?? 0}%` },
        { label: 'Current / best streak', value: `${streak} / ${bestStreak}` },
        { label: 'Average solved time', value: correct ? `${(totalCorrectTimeMs / correct / 1000).toFixed(1)}s` : 'No solved drill yet' }
      ]}
      note="Accuracy counts checked answers, wrong square taps in name-square mode, and wrong No squares calls."
    />
  {/if}
</TrainingModuleShell>

<style>
  .prompt { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: 'label task' 'mode action'; align-items: center; gap: 0.55rem 0.8rem; }
  .prompt > span:first-child { grid-area: label; }
  .prompt > strong { grid-area: task; min-width: 0; }
  .prompt .mode { grid-area: mode; }
  .prompt > button { grid-area: action; justify-self: start; }
  .prompt span { color: var(--text-4); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.1em; }
  .prompt .mode { color: var(--text-3); font-size: 0.7rem; white-space: nowrap; }
  .prompt strong { color: var(--accent); font-size: clamp(1.1rem, 2.6vw, 1.55rem); line-height: 1.25; }
  .prompt button, .drill-actions button { padding: 0.45rem 0.7rem; background: transparent; border: 1px solid var(--border-sub); border-radius: 6px; color: var(--text-3); cursor: pointer; }
  .prompt button:hover, .drill-actions button:hover { border-color: var(--accent-border); color: var(--accent); }
  .drill-actions { display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap; }
  .drill-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
  .drill-actions .ghost { color: var(--text-4); }
  .locked { pointer-events: none; opacity: 0.72; }
  .continue { align-self: center; padding: 0.55rem 1rem; border: 0; border-radius: 6px; background: var(--accent); color: var(--bg); cursor: pointer; font-weight: 700; }
  .feedback { margin: 0; padding-top: 0.75rem; border-top: 1px solid var(--border); color: var(--text-3); }
  @media (max-width: 640px) { .prompt { grid-template-columns: 1fr; grid-template-areas: 'label' 'task' 'mode' 'action'; } .prompt button { width: fit-content; } }
</style>
