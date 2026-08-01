<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Chess } from 'chess.js';
  import ChessBoard from '../../../components/ChessBoard.svelte';
  import TrainingModuleShell from '../../../components/TrainingModuleShell.svelte';
  import ActionButton from '../../../components/ActionButton.svelte';
  import { StockfishEngine } from '$lib/chess/engine';
  import { extractGameMoves, hasAmbiguousAccountColor, mistakeCacheKey, parseCachedMistakes, serializeMistakes, type GameMoveCandidate } from '$lib/learning/gameMistakes';
  import { applyCoordinateMove, applyUciMove, sanForUciMove, type AppliedMove } from '$lib/chess/moves';
  import MistakeReplayBoard from './MistakeReplayBoard.svelte';
  import { recordModuleAttempt } from '../../../stores/session';
  import { get } from 'svelte/store';
import { sessionStore } from '../../../stores/session';
import { profileStore } from '../../../stores/profile';
import { mistakeSyncStore, startMistakeSync, getPreWarmedMistakes, setPreWarmedMistakes } from '../../../stores/mistakeSync';
import { createIndexedDbMistakeRepository } from '$lib/chesscom/repository';
import type { PersonalMistakeExercise } from '$lib/chesscom/types';
import type { MistakeSyncCoordinator } from '$lib/chesscom/coordinator';

  import { authStore } from '../../../stores/auth';

  type Mistake = GameMoveCandidate & { bestMove: string; loss: number; gameId?: string };

  function getInitialMistakesData() {
    if (typeof window === 'undefined') {
      return { mistakes: [] as Mistake[], username: '', status: 'Load your public games or paste a PGN to begin.' };
    }
    const auth = get(authStore);
    if (!auth.authenticated || auth.guest) {
      return { mistakes: [] as Mistake[], username: '', status: 'Load your public games or paste a PGN to begin.' };
    }

    const userId = get(sessionStore).userId ?? 'local-player';
    let loadedMistakes: Mistake[] = [];

    const syncStateObj = get(mistakeSyncStore);
    if (syncStateObj.preWarmedMistakes && syncStateObj.preWarmedMistakes.length > 0) {
      loadedMistakes = syncStateObj.preWarmedMistakes as Mistake[];
    } else {
      loadedMistakes = getPreWarmedMistakes(userId) as Mistake[];
    }

    let loadedUsername = get(profileStore).chessComUsername || '';
    if (typeof localStorage !== 'undefined') {
      const cached = parseCachedMistakes<Mistake>(localStorage.getItem(mistakeCacheKey(userId)), userId);
      if (cached) {
        if (cached.username) loadedUsername = cached.username;
        if (!loadedMistakes.length && cached.mistakes.length) {
          loadedMistakes = cached.mistakes;
          setPreWarmedMistakes(loadedMistakes);
        }
      }
    }

    const loadedStatus = loadedMistakes.length
      ? `Loaded ${loadedMistakes.length} saved mistake${loadedMistakes.length === 1 ? '' : 's'}.`
      : 'Load your public games or paste a PGN to begin.';

    return { mistakes: loadedMistakes, username: loadedUsername, status: loadedStatus };
  }

  const initialData = getInitialMistakesData();
  let pgn = $state('');
  let username = $state(initialData.username);
  let color = $state<'w' | 'b'>('w');
  let status = $state(initialData.status);
  let candidates = $state<GameMoveCandidate[]>([]);
  let mistakes = $state<Mistake[]>(initialData.mistakes);
  let active = $state(0); let analyzing = $state(false); let feedback = $state(''); let engine: StockfishEngine | null = null;
  let reviewFinished = $state(false); let activeAttempted = $state(false);
  let showImportOptions = $state(false);
  let replay = $state<{ fen: string; move: string; label: string }[]>([]); let replayStep = $state(0); let replayReady = $state(false);
  let analysisIndex = $state(0);
  let syncState = $state(get(mistakeSyncStore));
  let analysisGeneration = 0;
  let syncUnsubscribe: (() => void) | null = null;
  let backgroundCoordinator: MistakeSyncCoordinator | null = null;
  const mistakeRepository = createIndexedDbMistakeRepository();

  let replayCache = new Map<number, { fen: string; move: string; label: string }[]>();
  let precalculatingIndices = new Set<number>();

  function isCorrectMove(fen: string, from: string, to: string, applied: AppliedMove, bestMove: string): boolean {
    const cleanBest = bestMove.trim();
    if (!cleanBest) return false;

    const playedUci = `${from}${to}`;
    const playedProm = applied.move.promotion;
    const playedUciProm = `${from}${to}${playedProm ?? ''}`;
    const playedSan = applied.move.san;

    if (
      cleanBest === playedUci ||
      cleanBest === playedUciProm ||
      cleanBest === playedSan ||
      cleanBest.toLowerCase() === playedUci.toLowerCase() ||
      cleanBest.toLowerCase() === playedUciProm.toLowerCase() ||
      cleanBest.toLowerCase() === playedSan.toLowerCase()
    ) {
      return true;
    }

    const bestSan = sanForUciMove(fen, cleanBest);
    if (bestSan && (bestSan === playedSan || bestSan.toLowerCase() === playedSan.toLowerCase())) {
      return true;
    }

    const playedUciSan = sanForUciMove(fen, playedUciProm);
    if (playedUciSan && (playedUciSan === cleanBest || playedUciSan.toLowerCase() === cleanBest.toLowerCase())) {
      return true;
    }

    return false;
  }

  async function precalculateReplay(index: number) {
    if (index < 0 || index >= mistakes.length) return;
    if (replayCache.has(index) || precalculatingIndices.has(index)) return;

    precalculatingIndices.add(index);
    const mistake = mistakes[index];
    if (!mistake) {
      precalculatingIndices.delete(index);
      return;
    }

    const best = applyCoordinateMove(mistake.fen, mistake.bestMove.slice(0, 2), mistake.bestMove.slice(2, 4), mistake.bestMove.slice(4, 5) || 'q')
      || applyUciMove(mistake.fen, mistake.bestMove);

    if (!best) {
      precalculatingIndices.delete(index);
      return;
    }

    const initialSteps: { fen: string; move: string; label: string }[] = [
      { fen: best.afterFen, move: mistake.bestMove, label: mistake.bestMove }
    ];
    replayCache.set(index, [...initialSteps]);

    if (!engine) {
      engine = new StockfishEngine();
    }
    const activeEngine = engine;
    let fen = best.afterFen;
    const steps = [...initialSteps];

    try {
      for (let count = 1; count < 3; count++) {
        const move = await activeEngine.getBestMove(fen).catch(() => '');
        if (!move) break;
        const applied = applyCoordinateMove(fen, move.slice(0, 2), move.slice(2, 4), move.slice(4, 5) || 'q')
          || applyUciMove(fen, move);
        if (!applied) break;
        steps.push({ fen: applied.afterFen, move, label: move });
        fen = applied.afterFen;
      }
      replayCache.set(index, steps);
    } catch {
      // Keep initial step on failure
    } finally {
      precalculatingIndices.delete(index);
    }

    if (active === index && replayReady) {
      replay = replayCache.get(index) ?? initialSteps;
    }
  }

  function precalculateUpcoming(currentIndex = active) {
    if (!mistakes.length) return;
    void precalculateReplay(currentIndex);
    void precalculateReplay(currentIndex + 1);
  }

  function activateReplayForActive() {
    replayReady = true;
    const cached = replayCache.get(active);
    if (cached && cached.length > 0) {
      replay = cached;
    } else {
      const mistake = mistakes[active];
      if (mistake) {
        const best = applyCoordinateMove(mistake.fen, mistake.bestMove.slice(0, 2), mistake.bestMove.slice(2, 4), mistake.bestMove.slice(4, 5) || 'q')
          || applyUciMove(mistake.fen, mistake.bestMove);
        if (best) {
          replay = [{ fen: best.afterFen, move: mistake.bestMove, label: mistake.bestMove }];
        }
        void precalculateReplay(active);
      }
    }
  }

  $effect(() => {
    if (mistakes.length > 0 && active < mistakes.length) {
      precalculateUpcoming(active);
    }
  });

  function savedMistakeToReview(exercise: PersonalMistakeExercise): Mistake | null {
    if (exercise.verificationStatus === 'discarded') return null;
    const board = new Chess(exercise.fen);
    let played = null;
    if (exercise.playedMove && exercise.playedMove.length >= 4) {
      try {
        played = board.move({ from: exercise.playedMove.slice(0, 2), to: exercise.playedMove.slice(2, 4), promotion: (exercise.playedMove[4] as 'q' | 'r' | 'b' | 'n' | undefined) || 'q' });
      } catch {}
    }
    if (!played && exercise.playedSan) {
      try { played = board.move(exercise.playedSan); } catch {}
    }
    if (!played) return null;
    return { ply: exercise.ply, moveNumber: Math.ceil(exercise.ply / 2), color: played.color, move: played, fen: exercise.fen, afterFen: exercise.afterFen, bestMove: exercise.bestMove, loss: exercise.lossCp, gameId: exercise.gameId };
  }

  async function loadBackgroundMistakes() {
    const userId = get(sessionStore).userId ?? 'local-player';
    const connection = await mistakeRepository.getConnection(userId);
    if (!connection) return;
    const saved = await mistakeRepository.listMistakes(userId, connection.playerId);
    const reviewable = saved.map(savedMistakeToReview).filter((value): value is Mistake => value !== null);
    if (reviewable.length) { mistakes = reviewable; active = 0; reviewFinished = false; status = `Loaded ${reviewable.length} saved mistake${reviewable.length === 1 ? '' : 's'}.`; precalculateUpcoming(0); }
  }

  async function importUsername() {
    const userId = get(sessionStore).userId ?? 'local-player';
    const coordinator = startMistakeSync(userId, username, true);
    if (!coordinator) { status = 'Enter your Chess.com name first.'; return; }
    backgroundCoordinator = coordinator;
    status = 'Finding mistakes...';
    analyzing = true;
    await loadBackgroundMistakes();
  }

  function analyzeGame() {
    try { candidates = extractGameMoves(pgn, color, username.trim() || undefined); } catch { status = 'That PGN could not be read. Check the pasted game.'; return; }
    if (!candidates.length) { status = 'No moves found for that side.'; return; }
    mistakes = []; active = 0; reviewFinished = false; activeAttempted = false; analyzing = true; analysisIndex = 0; analysisGeneration++;
    replayCache.clear(); precalculatingIndices.clear();
    status = `Analyzing move 1 of ${candidates.length}...`;
    engine?.terminate(); engine = new StockfishEngine(); void analyzeNext(0, analysisGeneration);
  }
  async function analyzeNext(index: number, generation = analysisGeneration) {
    if (generation !== analysisGeneration) return;
    const candidate = candidates[index];
    if (!candidate || !engine) { analyzing = false; status = mistakes.length ? `Found ${mistakes.length} move${mistakes.length === 1 ? '' : 's'} that need review.` : 'No moves worsened your position by about 0.8 pawn or more.'; persistMistakes(); precalculateUpcoming(0); return; }
      status = `Analyzing move ${index + 1} of ${candidates.length}...`;
    const activeEngine = engine;
    try {
      const before = await activeEngine.getEval(candidate.fen);
      const after = await activeEngine.getEval(candidate.afterFen);
      if (generation !== analysisGeneration) return;
      const beforePerspective = color === 'w' ? before.evalCp : -before.evalCp;
      const afterPerspective = color === 'w' ? -after.evalCp : after.evalCp;
      const loss = beforePerspective - afterPerspective;
      if (loss >= 80 && before.bestMove) mistakes = [...mistakes, { ...candidate, bestMove: before.bestMove, loss }];
      persistMistakes();
      precalculateUpcoming(active);
      analysisIndex = index + 1;
      void analyzeNext(index + 1, generation);
    } catch {
      if (generation === analysisGeneration) { analyzing = false; persistMistakes(); status = 'Analysis stopped.'; precalculateUpcoming(active); }
    }
  }
  function cancelAnalysis() {
    if (backgroundCoordinator && analyzing) {
      backgroundCoordinator.cancel();
      analyzing = false;
      status = 'Background analysis paused. You can resume it from this page.';
      return;
    }
    analysisGeneration++;
    analyzing = false;
    persistMistakes();
    engine?.terminate();
    engine = null;
    status = 'Analysis stopped. You can change the game or start again.';
  }
  function handleMove(from: string, to: string) {
    const mistake = mistakes[active]; if (!mistake) return false;
    const applied = applyCoordinateMove(mistake.fen, from, to);
    if (!applied) return false;
    const exerciseId = mistake.gameId ? `chesscom:${mistake.gameId}:${mistake.ply}` : `mistake:${mistake.fen}`;
    const correct = isCorrectMove(mistake.fen, from, to, applied, mistake.bestMove);
    if (correct) {
      feedback = `Correct. Stockfish recommends ${sanForUciMove(mistake.fen, mistake.bestMove)}. This avoids about ${(mistake.loss / 100).toFixed(1)} pawns of evaluation loss.`;
      activateReplayForActive();
      if (!activeAttempted) { recordModuleAttempt({ exerciseId, module: 'mistakes', correctness: 1, tags: ['personal-game'], source: 'personal-game', positionFingerprint: mistake.fen }); activeAttempted = true; }
      return true;
    }
    feedback = 'That move is legal, but it does not address the problem Stockfish found. Try again.';
    if (!activeAttempted) { recordModuleAttempt({ exerciseId, module: 'mistakes', correctness: 0, tags: ['personal-game'], source: 'personal-game', positionFingerprint: mistake.fen }); activeAttempted = true; }
    return false;
  }
  function giveUp() {
    const mistake = mistakes[active]; if (!mistake || activeAttempted) return;
    const exerciseId = mistake.gameId ? `chesscom:${mistake.gameId}:${mistake.ply}` : `mistake:${mistake.fen}`;
    activeAttempted = true;
    activateReplayForActive();
    feedback = `You gave up. The best move was ${sanForUciMove(mistake.fen, mistake.bestMove)}. Review the line, then continue.`;
    recordModuleAttempt({ exerciseId, module: 'mistakes', correctness: 0, assistance: 'solution', tags: ['personal-game', 'assisted'], source: 'personal-game', positionFingerprint: mistake.fen });
  }
  function advanceReplay() { if (replayStep < replay.length) replayStep++; }
  function nextMistake() {
    if (active < mistakes.length - 1) {
      active++;
      feedback = '';
      replayStep = 0;
      replayReady = false;
      activeAttempted = false;
      replay = replayCache.get(active) ?? [];
      precalculateUpcoming(active);
    } else {
      reviewFinished = true;
      replayReady = false;
      feedback = 'Review complete. Your saved mistakes are ready for another pass.';
    }
  }
  function reviewAgain() {
    active = 0;
    reviewFinished = false;
    feedback = '';
    replay = [];
    replayStep = 0;
    replayReady = false;
    activeAttempted = false;
    replayCache.clear();
    precalculatingIndices.clear();
    status = 'Review the saved mistakes again.';
    precalculateUpcoming(0);
  }
  async function analyzeNewerGames() {
    const userId = get(sessionStore).userId ?? 'local-player';
    const coordinator = startMistakeSync(userId, username, true);
    if (!coordinator) return;
    backgroundCoordinator = coordinator;
    analyzing = true;
    status = 'Finding newer mistakes...';
    await loadBackgroundMistakes();
  }
  function reset() {
    if (backgroundCoordinator && analyzing) {
      backgroundCoordinator.cancel();
      backgroundCoordinator = null;
    }
    engine?.terminate();
    engine = null;
    analyzing = false;

    active = 0;
    reviewFinished = false;
    activeAttempted = false;
    feedback = '';
    replay = [];
    replayStep = 0;
    replayReady = false;
    replayCache.clear();
    precalculatingIndices.clear();

    if (mistakes.length > 0) {
      status = `Review reset to position 1 of ${mistakes.length}.`;
      precalculateUpcoming(0);
    } else {
      pgn = '';
      showImportOptions = false;
      const auth = get(authStore);
      username = (!auth.authenticated || auth.guest) ? '' : get(profileStore).chessComUsername;
      status = username ? 'Enter your Chess.com name or paste a PGN.' : 'Load your public games or paste a PGN to begin.';
    }
  }
  function persistMistakes() {
    if (typeof localStorage === 'undefined') return;
    const userId = get(sessionStore).userId ?? 'local-player';
    localStorage.setItem(mistakeCacheKey(userId), serializeMistakes(userId, username, mistakes));
  }
  onMount(() => {
    const auth = get(authStore);
    if (!auth.authenticated || auth.guest) {
      username = '';
      mistakes = [];
      status = 'Load your public games or paste a PGN to begin.';
      return;
    }
    const userId = get(sessionStore).userId ?? 'local-player';
    const cached = parseCachedMistakes<Mistake>(localStorage.getItem(mistakeCacheKey(userId)), userId);
    if (cached) { username = cached.username; mistakes = cached.mistakes; status = `Loaded ${mistakes.length} saved mistake${mistakes.length === 1 ? '' : 's'}.`; precalculateUpcoming(0); }
    if (!username) username = get(profileStore).chessComUsername;
    syncUnsubscribe = mistakeSyncStore.subscribe((state) => {
      syncState = state;
      if (state.status === 'syncing' || state.status === 'analyzing') analyzing = true;
      if (state.status === 'analyzing' && state.mistakesFound > mistakes.length) void loadBackgroundMistakes();
      if (state.status === 'complete') { analyzing = false; backgroundCoordinator = null; void loadBackgroundMistakes(); }
      if (state.status === 'paused' || state.status === 'error') { analyzing = false; backgroundCoordinator = null; }
      if (state.error) status = state.error;
    });
    if (username) {
      backgroundCoordinator = startMistakeSync(userId, username);
      void loadBackgroundMistakes();
    }
    return () => { syncUnsubscribe?.(); };
  });
  onDestroy(() => { if (analyzing) persistMistakes(); engine?.terminate(); });
</script>

<TrainingModuleShell title="My Mistakes" task="Turn your mistakes into puzzles." taskKeywords={['mistakes', 'puzzles']} source="personal-game" onReset={reset} onSkip={nextMistake}>
  {#if mistakes.length === 0 && !analyzing}
    <div class="import-panel">
      <label for="username">Chess.com name</label>
      <div class="row"><input class="form-control" id="username" bind:value={username} placeholder="e.g. hikaru" /><ActionButton variant="primary" onclick={importUsername}>Find mistakes</ActionButton></div>
      <button class="secondary-link" type="button" onclick={() => showImportOptions = !showImportOptions} aria-expanded={showImportOptions}>{showImportOptions ? 'Hide PGN' : 'Paste a PGN'}</button>
      {#if showImportOptions}
        <label for="pgn">PGN</label>
        <textarea class="form-control" id="pgn" bind:value={pgn} placeholder="Paste PGN here..."></textarea>
        <div class="row">{#if hasAmbiguousAccountColor(pgn, username)}<label for="side">Your color</label><select class="form-control" id="side" bind:value={color}><option value="w">White</option><option value="b">Black</option></select>{:else}<span class="detected">Color detected from PGN</span>{/if}<ActionButton variant="primary" onclick={analyzeGame}>Analyze</ActionButton></div>
      {/if}
    </div>
  {/if}
  <p class="status" role="status">{status}</p>
  {#if analyzing}
    {@const usingPgn = candidates.length > 0}
    {@const progressTotal = usingPgn ? candidates.length : syncState.gamesFound}
    {@const progressValue = usingPgn ? analysisIndex : syncState.gamesAnalyzed}
    <div class="analysis-progress" role="status" aria-live="polite">
      <div class="progress-copy">
        <p class="status">{usingPgn ? status : syncState.gamesFound > 0 ? `Analyzing game ${Math.min(progressValue + 1, progressTotal)} of ${progressTotal}...` : 'Finding and analyzing games...'}</p>
        {#if progressTotal > 0}<progress max={progressTotal} value={Math.min(progressValue, progressTotal)} aria-label="Mistake analysis progress"></progress><small>{Math.min(progressValue, progressTotal)} / {progressTotal} games</small>{:else}<span class="progress-indeterminate" aria-label="Analysis in progress"></span>{/if}
      </div>
      <ActionButton variant="quiet" onclick={cancelAnalysis}>Pause</ActionButton>
    </div>
  {/if}
  {#if mistakes.length > 0 && !reviewFinished}<div class="puzzle-head"><strong>Position {active + 1} of {mistakes.length}</strong><span>Find the move that improves your position.</span></div>{#if mistakes[active]}<ChessBoard fen={mistakes[active].fen} orientation={mistakes[active].color === 'b' ? 'black' : 'white'} onMove={handleMove} showUndo={false} />{/if}{#if feedback}<p class="feedback" role="status">{feedback}</p>{/if}<div class="review-actions">{#if !activeAttempted}<ActionButton variant="quiet" onclick={giveUp}>Give up</ActionButton>{/if}<ActionButton variant="primary" onclick={nextMistake} disabled={!feedback}>{active === mistakes.length - 1 ? 'Finish review' : 'Next position'}</ActionButton></div>{/if}
  {#if reviewFinished}<div class="review-complete"><p class="feedback" role="status">{feedback}</p><div class="row"><ActionButton variant="primary" onclick={reviewAgain}>Review again</ActionButton><ActionButton variant="quiet" onclick={analyzeNewerGames}>Analyze newer games</ActionButton></div></div>{/if}
  {#if replayReady && mistakes[active]}
    <MistakeReplayBoard fen={mistakes[active].fen} arrows={[{ from: mistakes[active].move.from, to: mistakes[active].move.to, tone: 'played' }, { from: mistakes[active].bestMove.slice(0, 2), to: mistakes[active].bestMove.slice(2, 4), tone: 'engine' }]} continuation={replay} step={replayStep} onNext={advanceReplay} />
  {/if}
</TrainingModuleShell>

<style>
  .import-panel { display: grid; gap: 0.75rem; } label { color: var(--text-2); font-weight: 700; } textarea.form-control { min-height: 180px; resize: vertical; } .row, .puzzle-head, .review-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; } .secondary-link { width: fit-content; border: 0; background: transparent; color: var(--accent); padding: 0; font: inherit; font-size: 0.82rem; cursor: pointer; } .status, .feedback { color: var(--text-3); } .feedback { border-top: 1px solid var(--border); padding-top: 0.75rem; } .analysis-progress { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 0.75rem; } .progress-copy { display: grid; gap: 0.35rem; min-width: min(100%, 260px); } .progress-copy p { margin: 0; } progress { width: min(100%, 360px); height: 0.5rem; accent-color: var(--accent); } .progress-copy small { color: var(--text-5); font-size: 0.74rem; } .progress-indeterminate { display: block; width: min(100%, 360px); height: 0.5rem; overflow: hidden; border-radius: 999px; background: linear-gradient(90deg, var(--accent-dim), var(--accent), var(--accent-dim)); background-size: 200% 100%; animation: progress-shimmer 1.4s linear infinite; } .detected { color: var(--text-3); } .review-complete { display: grid; gap: 0.75rem; } @keyframes progress-shimmer { to { background-position: -200% 0; } }
</style>
