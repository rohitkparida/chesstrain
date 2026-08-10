<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Chess } from 'chess.js';
  import type { TacticsPageData } from './+page';
  import ChessBoard from '../../../components/ChessBoard.svelte';
  import TrainingModuleShell from '../../../components/TrainingModuleShell.svelte';
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
  import { createLatestRequest } from '$lib/async/latestRequest';

  let { data }: { data: TacticsPageData } = $props();
  const puzzles = $derived(data.puzzles?.length > 0 ? data.puzzles : mockPuzzles);

  let activePuzzle = $state<PuzzleData>(mockPuzzles[0]);
  let userElo = $state(1200);
  let totalSolved = $state(0);
  let attemptState = $state(initialAttemptState());
  let boardFen = $state(mockPuzzles[0].fen);
  let solutionUcis = $state<string[]>([]);
  let lineIndex = $state(0);
  let playerMoves = $state<string[]>([]);
  const showSolution = $derived(attemptState.attempted && (attemptState.feedbackType === 'correct' || attemptState.reflectionOpen));
  const solutionAnnotations = $derived<BoardAnnotation[]>(showSolution
    ? solutionUcis.map((move) => ({ from: move.slice(0, 2), to: move.slice(2, 4), kind: 'arrow' as const }))
    : []);
  let puzzleNum = $state(1);
  let preMoveEval = $state<EngineEval | null>(null);
  let advancing = $state(false);
  let attemptStartedAt = Date.now();
  let reflectionTimer: ReturnType<typeof setInterval> | null = null;
  const attemptRequests = createLatestRequest();
  const evaluationRequests = createLatestRequest();

  const unsubscribe = sessionStore.subscribe((s) => {
    totalSolved = s.totalSolved;
    if (s.activePuzzle) activePuzzle = s.activePuzzle as PuzzleData;
    userElo = s.ratings[`tactics:${puzzleTag(activePuzzle)}`] || s.ratings['tactics'] || 1200;
  });

  onDestroy(() => {
    unsubscribe();
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

    const requestId = attemptRequests.begin();

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
      commitAttempt(true, userMove, boardFen, requestId);
      return;
    }

    attemptState.inputNotice = 'Correct. The opponent reply is automatic. Find the next move.';
  }

  function commitAttempt(correct: boolean, userMove: string, afterFen: string, requestId = attemptRequests.begin()) {
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
        .then((result) => {
          if (attemptRequests.isCurrent(requestId)) {
            attemptState.coachText = result.explanation;
            attemptState.cpLoss = result.cpLoss;
          }
        })
        .catch(() => {
          if (attemptRequests.isCurrent(requestId)) attemptState.coachText = 'Good move. The full line is complete.';
        })
        .finally(() => {
          if (attemptRequests.isCurrent(requestId)) attemptState.coachLoading = false;
        });
    }
  }

  function prepareEvaluation(puzzle: PuzzleData) {
    const requestId = evaluationRequests.begin();
    preMoveEval = null;
    coach.getPreMoveEval(puzzle.fen)
      .then((result) => {
        if (evaluationRequests.isCurrent(requestId) && result.bestMove) preMoveEval = result;
      })
      .catch(() => {});
  }

  function nextPuzzle() {
    if (advancing) return;
    advancing = true;
    if (reflectionTimer) clearInterval(reflectionTimer);
    attemptRequests.cancel();
    puzzleNum++;
    const selected = selectNextPuzzle('tactics', puzzleTag(activePuzzle));
    const next = selected as PuzzleData | null;
    if (next) {
      activePuzzle = next;
      preparePuzzle(next);
      prepareEvaluation(next);
    } else {
      preparePuzzle(activePuzzle);
      prepareEvaluation(activePuzzle);
    }
    attemptState = nextPuzzleState();
    attemptStartedAt = Date.now();
    advancing = false;
  }

  function explainInvalidMove() {
    attemptState.inputNotice = 'That destination is not a legal move. Select a piece and try again.';
  }

  function revealCoach() {
    attemptState.reflectionOpen = true;
    attemptState.reflectionSeconds = 0;
    attemptState.coachLoading = false;
    if (!preMoveEval) {
      attemptState.coachLoading = false;
      return;
    }
    attemptState.coachLoading = true;
    coach.explain({ preMoveEval, userMove: attemptState.attemptedMove, newFen: attemptState.attemptedFen, correct: false })
      .then((result) => {
        attemptState.coachText = result.explanation;
        attemptState.cpLoss = result.cpLoss;
      })
      .catch(() => {
        attemptState.coachText = `Engine preferred ${preMoveEval?.bestMove ?? 'another move'}.`;
      })
      .finally(() => {
        attemptState.coachLoading = false;
      });
  }
</script>

<TrainingModuleShell
  title="Tactics"
  task="Find the best move for {activePuzzle?.fen?.includes(' b ') ? 'Black' : 'White'}. Select a piece, then a square."
  taskKeywords={['best move', activePuzzle?.fen?.includes(' b ') ? 'Black' : 'White']}
  onSkip={attemptState.attempted ? undefined : nextPuzzle}
  onContinue={nextPuzzle}
  continueVisible={attemptState.attempted && !attemptState.coachLoading}
  continueLabel="Continue"
>
<div class="tactics-layout">
  <div class="board-col">
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
          inactiveLabel={advancing ? 'Loading next puzzle...' : 'Attempt complete'}
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

    {#if advancing}<div class="actions"><span class="loading-next">Loading next...</span></div>{/if}

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
</TrainingModuleShell>

<style>
  .tactics-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: start;
    width: min(100%, var(--content-width));
    margin: 0 auto;
  }
  @media (max-width: 700px) {
    .tactics-layout {
      grid-template-columns: 1fr;
    }
  }

  .board-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .board-wrap {
    display: flex;
    justify-content: center;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
  }
  .loading-next { color: var(--text-4); font-size: 0.85rem; }

  .info-col {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .info-card {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }
  .info-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text-6);
    margin-bottom: 0.4rem;
  }
  .info-big {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-1);
    line-height: 1;
  }
  .info-sub {
    font-size: 0.75rem;
    color: var(--text-4);
    margin-top: 0.2rem;
  }
  .hint-text {
    margin: 0;
    color: var(--text-4);
    font-size: 0.85rem;
    line-height: 1.5;
  }
  @media (max-width: 520px) {
    .info-col {
      grid-template-columns: 1fr;
    }
  }
</style>
