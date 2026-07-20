<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Chess } from 'chess.js';
  import type { TacticsPageData } from './+page';
  import ChessBoard from '../../../components/ChessBoard.svelte';
  import ContextStrip from '../../../components/ContextStrip.svelte';
  import InstructionBanner from '../../../components/InstructionBanner.svelte';
  import ObjectiveMetrics from '../../../components/ObjectiveMetrics.svelte';
  import TacticsFeedback from './TacticsFeedback.svelte';
  import TacticsVisualFeedback from './TacticsVisualFeedback.svelte';
  import { mockPuzzles, type PuzzleData } from '$lib/chess/mockPuzzles';
  import { sessionStore, recordPuzzleAttempt, loadPuzzles, selectNextPuzzle } from '../../../stores/session';
  import { coach } from '$lib/chess/coach';
  import type { EngineEval } from '$lib/chess/engine';
  import { applyCoordinateMove } from '$lib/chess/moves';
  import type { BoardAnnotation } from '$lib/chess/annotations';
  import {
    attemptResultState,
    initialAttemptState,
    isPuzzleInteractable,
    nextPuzzleState,
    puzzleTag
  } from '$lib/learning/tacticsLifecycle';

  let { data }: { data: TacticsPageData } = $props();
  const puzzles = $derived(data.puzzles.length > 0 ? data.puzzles : mockPuzzles);

  let activePuzzle = $state<PuzzleData>(mockPuzzles[0]);
  let userElo      = $state(1200);
  let totalSolved  = $state(0);
  let attemptState = $state(initialAttemptState());
  let boardFen = $state(mockPuzzles[0].fen);
  let solutionUcis = $state<string[]>([]);
  let lineIndex = $state(0);
  let playerMoves = $state<string[]>([]);
  const showSolution = $derived(attemptState.attempted && (attemptState.feedbackType === 'correct' || attemptState.reflectionOpen));
  const solutionAnnotations = $derived<BoardAnnotation[]>(showSolution
    ? solutionUcis.map((move) => ({ from: move.slice(0, 2), to: move.slice(2, 4), kind: 'arrow' }))
    : []);
  let skipConfirm  = $state(false);
  let puzzleNum    = $state(1);
  let preMoveEval = $state<EngineEval | null>(null);
  let advancing = $state(false);
  let attemptStartedAt = Date.now();
  let skipTimer: ReturnType<typeof setTimeout> | null = null;
  let reflectionTimer: ReturnType<typeof setInterval> | null = null;
  let attemptGeneration = 0;
  let evalGeneration = 0;

  const unsubscribe = sessionStore.subscribe(s => {
    totalSolved = s.totalSolved;
    if (s.activePuzzle) activePuzzle = s.activePuzzle as PuzzleData;
    userElo = s.ratings[`tactics:${puzzleTag(activePuzzle)}`] || 1200;
  });
  onDestroy(() => {
    unsubscribe();
    if (skipTimer) clearTimeout(skipTimer);
    if (reflectionTimer) clearInterval(reflectionTimer);
  });

  onMount(() => {
    activePuzzle = puzzles[0];
    loadPuzzles(puzzles);
    try { coach.init(); } catch {}
    preparePuzzle(activePuzzle);
    prepareEvaluation(activePuzzle);
    attemptStartedAt = Date.now();
  });

  function preparePuzzle(puzzle: PuzzleData) {
    boardFen = puzzle.fen;
    lineIndex = 0;
    playerMoves = [];
    solutionUcis = buildSolutionUcis(puzzle);
  }

  function buildSolutionUcis(puzzle: PuzzleData): string[] {
    try {
      const game = new Chess(puzzle.fen);
      return puzzle.solution.flatMap((notation) => {
        const move = game.move(notation);
        return move ? [`${move.from}${move.to}${move.promotion ?? ''}`] : [];
      });
    } catch {
      return [];
    }
  }

  function expectedMove(fen: string, notation: string) {
    try { return new Chess(fen).move(notation); } catch { return null; }
  }

  function handleMove(from: string, to: string) {
    if (!isPuzzleInteractable(attemptState.attempted, advancing)) return;
    const expected = expectedMove(boardFen, activePuzzle.solution[lineIndex] ?? '');
    const applied = applyCoordinateMove(boardFen, from, to);
    if (!expected || !applied) return;

    const expectedUci = `${expected.from}${expected.to}${expected.promotion ?? ''}`;
    const attemptedUci = `${from}${to}${applied.move.promotion ?? ''}`;
    const userMove = attemptedUci;
    boardFen = applied.afterFen;

    const generation = ++attemptGeneration;

    if (attemptedUci !== expectedUci) {
      commitAttempt(false, userMove, applied.afterFen);
      return;
    }

    playerMoves = [...playerMoves, userMove];
    lineIndex += 1;
    const reply = activePuzzle.solution[lineIndex];
    if (reply) {
      const replyMove = expectedMove(boardFen, reply);
      if (replyMove) {
        const replyResult = applyCoordinateMove(boardFen, replyMove.from, replyMove.to, replyMove.promotion ?? 'q');
        if (replyResult) {
          boardFen = replyResult.afterFen;
          lineIndex += 1;
        }
      }
    }

    if (lineIndex >= activePuzzle.solution.length) {
      commitAttempt(true, userMove, boardFen, generation);
      return;
    }

    attemptState.inputNotice = 'Correct. The opponent reply is automatic. Find the next move.';
  }

  function commitAttempt(correct: boolean, userMove: string, afterFen: string, generation = ++attemptGeneration) {
    if (reflectionTimer) clearInterval(reflectionTimer);
    attemptState = attemptResultState(correct, Date.now() - attemptStartedAt, userMove, afterFen);
    attemptState.coachLoading = false;
    const outcome = recordPuzzleAttempt(activePuzzle, 'tactics', correct, attemptState.attemptTimeMs ?? 0);
    attemptState.eloDelta = outcome.eloDelta;

    if (!correct) {
      reflectionTimer = setInterval(() => {
        if (attemptState.reflectionSeconds <= 1) {
          attemptState = { ...attemptState, reflectionSeconds: 0 };
          if (reflectionTimer) clearInterval(reflectionTimer);
        } else {
          attemptState = { ...attemptState, reflectionSeconds: attemptState.reflectionSeconds - 1 };
        }
      }, 1000);
    }

    if (correct && preMoveEval) {
      attemptState.coachLoading = true;
      coach.explain({ preMoveEval, userMove, newFen: afterFen, correct: true })
        .then(result => {
          if (generation === attemptGeneration) {
            attemptState.coachText = result.explanation;
            attemptState.cpLoss = result.cpLoss;
          }
        })
        .catch(() => { if (generation === attemptGeneration) attemptState.coachText = 'Good move. The full line is complete.'; })
        .finally(() => { if (generation === attemptGeneration) attemptState.coachLoading = false; });
    }
  }

  function prepareEvaluation(puzzle: PuzzleData) {
    const generation = ++evalGeneration;
    preMoveEval = null;
    coach.getPreMoveEval(puzzle.fen)
      .then(result => {
        if (generation === evalGeneration && result.bestMove) preMoveEval = result;
      })
      .catch(() => {});
  }

  function nextPuzzle() {
    if (advancing) return;
    advancing = true;
    if (reflectionTimer) clearInterval(reflectionTimer);
    attemptGeneration++;
    if (skipTimer) clearTimeout(skipTimer);
    puzzleNum++;
    const selected = selectNextPuzzle('tactics', puzzleTag(activePuzzle));
    const next = selected as PuzzleData | null;
    if (next) {
      activePuzzle = next;
      preparePuzzle(next);
      prepareEvaluation(next);
    }
    attemptState = nextPuzzleState(); skipConfirm = false;
    attemptStartedAt = Date.now();
    advancing = false;
  }

  function requestSkip() {
    if (attemptState.attempted || advancing) return;
    skipConfirm = true;
    if (skipTimer) clearTimeout(skipTimer);
    skipTimer = setTimeout(() => skipConfirm = false, 3000);
  }
  function skipPuzzle() {
    if (attemptState.attempted || advancing) return;
    recordPuzzleAttempt(activePuzzle, 'tactics', false, Date.now() - attemptStartedAt);
    nextPuzzle();
  }

  function explainInvalidMove() {
    attemptState.inputNotice = 'That destination is not a legal move. Select a piece and try again.';
  }

	function revealCoach() {
		attemptState.reflectionOpen = true;
		attemptState.reflectionSeconds = 0;
		attemptState.coachLoading = false;
		if (!preMoveEval) { attemptState.coachLoading = false; return; }
		attemptState.coachLoading = true;
		coach.explain({ preMoveEval, userMove: attemptState.attemptedMove, newFen: attemptState.attemptedFen, correct: false })
			.then(result => { attemptState.coachText = result.explanation; attemptState.cpLoss = result.cpLoss; })
			.catch(() => { attemptState.coachText = `Engine preferred ${preMoveEval?.bestMove ?? 'another move'}.`; })
			.finally(() => { attemptState.coachLoading = false; });
	}
</script>

<ContextStrip module="Tactics Training" skill="Pattern Recognition" puzzleNum={puzzleNum} puzzleTotal={puzzles.length} />

<div class="tactics-layout">
  <div class="board-col">
    <InstructionBanner
      title="Find the best move for {activePuzzle?.fen?.includes(' b ') ? 'Black' : 'White'}."
      hint="Click a piece, then its destination square. Legal-move hints stay hidden during the attempt."
    />

    {#if activePuzzle}
      <div class="board-wrap">
        <ChessBoard
          fen={boardFen}
          onMove={handleMove}
          onInvalidMove={explainInvalidMove}
          playable={!attemptState.attempted && !advancing}
          showLegalTargets={false}
          showUndo={false}
          orientation="side-to-move"
          annotations={solutionAnnotations}
          inactiveLabel={advancing ? "Loading next puzzle..." : "Attempt complete"}
        />
      </div>
    {/if}

    <TacticsFeedback
      inputNotice={attemptState.inputNotice}
      feedbackType={attemptState.feedbackType}
      feedback={attemptState.feedback}
      eloDelta={attemptState.eloDelta}
      coachLoading={attemptState.coachLoading}
      reflectionOpen={attemptState.reflectionOpen}
      reflectionSeconds={attemptState.reflectionSeconds}
      canReveal={attemptState.reflectionSeconds <= 0}
      coachText={attemptState.coachText}
      solutionLine={showSolution ? activePuzzle.solution : []}
      onReveal={revealCoach}
    />

    {#if attemptState.attempted}
      <TacticsVisualFeedback
        fen={activePuzzle.fen}
        attemptedMove={attemptState.attemptedMove}
        bestMove={preMoveEval?.bestMove ?? ''}
        solutionMoves={showSolution ? solutionUcis : []}
        showBest={showSolution}
      />
    {/if}

    <div class="actions">
      {#if attemptState.attempted}
        <button class="btn-primary" onclick={nextPuzzle} disabled={advancing}>
          {advancing ? 'Loading next...' : 'Continue'}
        </button>
      {:else if skipConfirm}
        <div class="confirm-row">
          <span>Skip this puzzle?</span>
          <button class="confirm-yes" onclick={skipPuzzle}>Yes, skip</button>
          <button class="confirm-no" onclick={() => skipConfirm = false}>Cancel</button>
        </div>
      {:else}
        <button class="btn-outline" onclick={requestSkip}>Skip</button>
      {/if}
    </div>

    {#if attemptState.attempted && attemptState.attemptTimeMs !== null}
      <ObjectiveMetrics
        title="Tactics evidence"
        items={[
          { label: 'Exact solution move', value: attemptState.feedbackType === 'correct' ? 'Yes' : 'No' },
          { label: 'Response time', value: `${(attemptState.attemptTimeMs / 1000).toFixed(1)}s` },
          ...(attemptState.cpLoss === null ? [] : [{ label: 'Engine loss', value: `${attemptState.cpLoss.toFixed(1)} pawns` }])
        ]}
        note="Credit requires the exact solution move. Engine loss is shown only when analysis is available."
      />
    {/if}
  </div>

  {#if attemptState.attempted}
  <div class="info-col">
    <div class="info-card">
      <div class="info-label">YOUR LEVEL</div>
      <div class="info-big">{userElo}</div>
      <div class="info-sub">Tactics ELO</div>
    </div>
    <div class="info-card">
      <div class="info-label">SOLVED</div>
      <div class="info-big">{totalSolved}</div>
      <div class="info-sub">puzzles</div>
    </div>
    {#if attemptState.feedbackType && activePuzzle?.description}
      <div class="info-card">
        <div class="info-label">HINT</div>
        <p class="hint-text">{activePuzzle.description}</p>
      </div>
    {/if}
  </div>
  {/if}
</div>

<style>
  .tactics-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: start;
  }
  @media(max-width:700px) { .tactics-layout { grid-template-columns: 1fr; } }

  .board-col { display: flex; flex-direction: column; gap: 1rem; }

  .board-wrap { display: flex; justify-content: flex-start; }

  .actions { display: flex; gap: 0.75rem; }
  .btn-primary {
    padding: 0.6rem 1.2rem; border-radius: 6px; border: none;
    background: var(--accent); color: var(--bg); cursor: pointer; font-weight: 700;
  }
  .btn-primary:disabled { opacity: 0.55; cursor: wait; }
  .btn-outline {
    padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600;
    cursor: pointer; font-size: 0.88rem;
    background: var(--surface-1); color: var(--text-4);
    border: 1px solid var(--border);
    transition: color 0.15s, border-color 0.15s;
  }
  .btn-outline:hover { color: var(--text-2); border-color: var(--border-sub); }

  .confirm-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; color: var(--text-4); }
  .confirm-yes {
    background: var(--error-dim); color: var(--error);
    border: 1px solid rgba(220,38,38,0.3);
    padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 600;
  }
  .confirm-no {
    background: var(--surface-1); color: var(--text-4);
    border: 1px solid var(--border);
    padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;
  }

  .info-col { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
  .info-card {
    background: var(--surface-1); border: 1px solid var(--border);
    border-radius: 8px; padding: 1rem;
  }
  .info-label {
    font-size: 0.65rem; font-weight: 700; letter-spacing: 1.5px;
    color: var(--text-6); margin-bottom: 0.4rem;
  }
  .info-big { font-size: 2rem; font-weight: 700; color: var(--text-1); line-height: 1; }
  .info-sub { font-size: 0.75rem; color: var(--text-4); margin-top: 0.2rem; }
  .hint-text { margin: 0; color: var(--text-4); font-size: 0.85rem; line-height: 1.5; }
  @media(max-width:520px) { .info-col { grid-template-columns: 1fr; } }
</style>
