<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Chess } from 'chess.js';
  import ChessBoard from '../../../components/ChessBoard.svelte';
  import TrainingModuleShell from '../../../components/TrainingModuleShell.svelte';
  import { StockfishEngine } from '$lib/chess/engine';
  import { extractGameMoves, hasAmbiguousAccountColor, mistakeCacheKey, parseCachedMistakes, serializeMistakes, type GameMoveCandidate } from '$lib/learning/gameMistakes';
  import { applyCoordinateMove, sanForUciMove } from '$lib/chess/moves';
  import MistakeReplayBoard from './MistakeReplayBoard.svelte';
  import { recordTrainingAttempt } from '../../../stores/session';
  import { get } from 'svelte/store';
import { sessionStore } from '../../../stores/session';
import { profileStore } from '../../../stores/profile';
import { mistakeSyncStore, startMistakeSync } from '../../../stores/mistakeSync';
import { createIndexedDbMistakeRepository } from '$lib/chesscom/repository';
import type { PersonalMistakeExercise } from '$lib/chesscom/types';
import type { MistakeSyncCoordinator } from '$lib/chesscom/coordinator';

  type Mistake = GameMoveCandidate & { bestMove: string; loss: number; gameId?: string };
  let pgn = $state(''); let username = $state(''); let color = $state<'w' | 'b'>('w');
    let status = $state('Load your public games or paste a PGN to begin.');
  let candidates = $state<GameMoveCandidate[]>([]); let mistakes = $state<Mistake[]>([]);
  let active = $state(0); let analyzing = $state(false); let feedback = $state(''); let engine: StockfishEngine | null = null;
  let reviewFinished = $state(false); let activeAttempted = $state(false);
  let showImportOptions = $state(false);
  let replay = $state<{ fen: string; move: string; label: string }[]>([]); let replayStep = $state(0); let replayReady = $state(false);
  let analysisGeneration = 0;
  let syncUnsubscribe: (() => void) | null = null;
  let backgroundCoordinator: MistakeSyncCoordinator | null = null;
  const mistakeRepository = createIndexedDbMistakeRepository();

  function savedMistakeToReview(exercise: PersonalMistakeExercise): Mistake | null {
    const board = new Chess(exercise.fen);
    const played = board.move({ from: exercise.playedMove.slice(0, 2), to: exercise.playedMove.slice(2, 4), promotion: exercise.playedMove[4] as 'q' | 'r' | 'b' | 'n' | undefined });
    if (!played) return null;
    return { ply: exercise.ply, moveNumber: Math.ceil(exercise.ply / 2), color: played.color, move: played, fen: exercise.fen, afterFen: exercise.afterFen, bestMove: exercise.bestMove, loss: exercise.lossCp, gameId: exercise.gameId };
  }

  async function loadBackgroundMistakes() {
    const userId = get(sessionStore).userId ?? 'local-player';
    const connection = await mistakeRepository.getConnection(userId);
    if (!connection) return;
    const saved = await mistakeRepository.listMistakes(userId, connection.playerId);
    const reviewable = saved.map(savedMistakeToReview).filter((value): value is Mistake => value !== null);
    if (reviewable.length) { mistakes = reviewable; active = 0; reviewFinished = false; status = `Loaded ${reviewable.length} saved mistake${reviewable.length === 1 ? '' : 's'}.`; }
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
    mistakes = []; active = 0; reviewFinished = false; activeAttempted = false; analyzing = true; analysisGeneration++;
    status = `Analyzing move 1 of ${candidates.length}...`;
    engine?.terminate(); engine = new StockfishEngine(); void analyzeNext(0, analysisGeneration);
  }
  async function analyzeNext(index: number, generation = analysisGeneration) {
    if (generation !== analysisGeneration) return;
    const candidate = candidates[index];
    if (!candidate || !engine) { analyzing = false; status = mistakes.length ? `Found ${mistakes.length} move${mistakes.length === 1 ? '' : 's'} that need review.` : 'No moves worsened your position by about 0.8 pawn or more.'; persistMistakes(); return; }
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
      void analyzeNext(index + 1, generation);
    } catch {
      if (generation === analysisGeneration) { analyzing = false; persistMistakes(); status = 'Analysis stopped.'; }
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
    if (!applyCoordinateMove(mistake.fen, from, to)) return false;
    const exerciseId = mistake.gameId ? `chesscom:${mistake.gameId}:${mistake.ply}` : `mistake:${mistake.fen}`;
    if (`${from}${to}` === mistake.bestMove) { feedback = `Correct. Stockfish recommends ${sanForUciMove(mistake.fen, mistake.bestMove)}. This avoids about ${(mistake.loss / 100).toFixed(1)} pawns of evaluation loss.`; replayReady = true; prepareReplay(mistake); if (!activeAttempted) recordTrainingAttempt({ exerciseId, module: 'mistakes', correctness: 1, startedAt: Date.now(), tags: ['personal-game'], source: 'personal-game', positionFingerprint: mistake.fen }); activeAttempted = true; return true; }
    feedback = 'That move is legal, but it does not address the problem Stockfish found. Try again.'; if (!activeAttempted) { recordTrainingAttempt({ exerciseId, module: 'mistakes', correctness: 0, startedAt: Date.now(), tags: ['personal-game'], source: 'personal-game', positionFingerprint: mistake.fen }); activeAttempted = true; } return false;
  }
  async function prepareReplay(mistake: Mistake) {
    replay = []; replayStep = 0;
    const best = applyCoordinateMove(mistake.fen, mistake.bestMove.slice(0, 2), mistake.bestMove.slice(2, 4));
    if (!best || !engine) return;
    const steps = [{ fen: best.afterFen, move: mistake.bestMove, label: mistake.bestMove }];
    const activeEngine = engine;
    let fen = best.afterFen;
    for (let count = 1; count < 3; count++) {
      const move = await activeEngine.getBestMove(fen).catch(() => '');
      const applied = move ? applyCoordinateMove(fen, move.slice(0, 2), move.slice(2, 4)) : null;
      if (!applied) break;
      steps.push({ fen: applied.afterFen, move, label: move });
      fen = applied.afterFen;
    }
    replay = steps;
  }
  function advanceReplay() { if (replayStep < replay.length) replayStep++; }
  function nextMistake() { if (active < mistakes.length - 1) { active++; feedback = ''; replay = []; replayStep = 0; replayReady = false; activeAttempted = false; } else { reviewFinished = true; replayReady = false; feedback = 'Review complete. Your saved mistakes are ready for another pass.'; } }
  function reviewAgain() { active = 0; reviewFinished = false; feedback = ''; replay = []; replayStep = 0; replayReady = false; activeAttempted = false; status = 'Review the saved mistakes again.'; }
  async function analyzeNewerGames() {
    const userId = get(sessionStore).userId ?? 'local-player';
    const coordinator = startMistakeSync(userId, username, true);
    if (!coordinator) return;
    backgroundCoordinator = coordinator;
    analyzing = true;
    status = 'Finding newer mistakes...';
    await loadBackgroundMistakes();
  }
  function reset() { pgn = ''; username = ''; candidates = []; mistakes = []; active = 0; reviewFinished = false; activeAttempted = false; showImportOptions = false; feedback = ''; replay = []; replayStep = 0; replayReady = false; status = 'Enter a Chess.com name or paste a PGN.'; }
  function persistMistakes() {
    if (typeof localStorage === 'undefined') return;
    const userId = get(sessionStore).userId ?? 'local-player';
    localStorage.setItem(mistakeCacheKey(userId), serializeMistakes(userId, username, mistakes));
  }
  onMount(() => {
    const userId = get(sessionStore).userId ?? 'local-player';
    const cached = parseCachedMistakes<Mistake>(localStorage.getItem(mistakeCacheKey(userId)), userId);
    if (cached) { username = cached.username; mistakes = cached.mistakes; status = `Loaded ${mistakes.length} saved mistake${mistakes.length === 1 ? '' : 's'}.`; }
    else username = get(profileStore).chessComUsername;
    syncUnsubscribe = mistakeSyncStore.subscribe((state) => {
      if (state.status === 'syncing' || state.status === 'analyzing') analyzing = true;
      if (state.status === 'complete') { analyzing = false; backgroundCoordinator = null; void loadBackgroundMistakes(); }
      if (state.status === 'paused' || state.status === 'error') { analyzing = false; backgroundCoordinator = null; }
      if (state.error) status = state.error;
    });
    backgroundCoordinator = startMistakeSync(userId, username);
    void loadBackgroundMistakes();
    return () => { syncUnsubscribe?.(); };
  });
  onDestroy(() => { if (analyzing) persistMistakes(); engine?.terminate(); });
</script>

<TrainingModuleShell title="My Mistakes" task="Turn your mistakes into puzzles." taskKeywords={['mistakes', 'puzzles']} source="personal-game" onReset={reset} onSkip={nextMistake}>
  {#if mistakes.length === 0 && !analyzing}
    <div class="import-panel">
      <label for="username">Chess.com name</label>
      <div class="row"><input id="username" bind:value={username} placeholder="e.g. hikaru" /><button class="primary" onclick={importUsername}>Find mistakes</button></div>
      <button class="secondary-link" type="button" onclick={() => showImportOptions = !showImportOptions} aria-expanded={showImportOptions}>{showImportOptions ? 'Hide PGN' : 'Paste a PGN'}</button>
      {#if showImportOptions}
        <label for="pgn">PGN</label>
        <textarea id="pgn" bind:value={pgn} placeholder="Paste PGN here..."></textarea>
        <div class="row">{#if hasAmbiguousAccountColor(pgn, username)}<label for="side">Your color</label><select id="side" bind:value={color}><option value="w">White</option><option value="b">Black</option></select>{:else}<span class="detected">Color detected from PGN</span>{/if}<button class="primary" onclick={analyzeGame}>Analyze</button></div>
      {/if}
    </div>
  {/if}
  <p class="status" role="status">{status}</p>
  {#if analyzing}<div class="analysis-progress"><p class="status">Analyzing games...</p><button class="quiet" onclick={cancelAnalysis}>Pause</button></div>{/if}
  {#if mistakes.length > 0 && !analyzing && !reviewFinished}<div class="puzzle-head"><strong>Position {active + 1} of {mistakes.length}</strong><span>Find the move that improves your position.</span></div>{#if mistakes[active]}<ChessBoard fen={mistakes[active].fen} orientation={mistakes[active].color === 'b' ? 'black' : 'white'} onMove={handleMove} showUndo={false} />{/if}{#if feedback}<p class="feedback" role="status">{feedback}</p>{/if}<button class="primary" onclick={nextMistake} disabled={!feedback}>{active === mistakes.length - 1 ? 'Finish review' : 'Next position'}</button>{/if}
  {#if reviewFinished}<div class="review-complete"><p class="feedback" role="status">{feedback}</p><div class="row"><button class="primary" onclick={reviewAgain}>Review again</button><button class="quiet" onclick={analyzeNewerGames}>Analyze newer games</button></div></div>{/if}
  {#if replayReady && mistakes[active]}
    <MistakeReplayBoard fen={replayStep === 0 ? mistakes[active].fen : replay[replayStep - 1]?.fen ?? mistakes[active].fen} arrows={[{ from: mistakes[active].move.from, to: mistakes[active].move.to, tone: 'played' }, { from: mistakes[active].bestMove.slice(0, 2), to: mistakes[active].bestMove.slice(2, 4), tone: 'engine' }]} continuation={replay.slice(1)} step={Math.max(0, replayStep - 1)} onNext={advanceReplay} />
  {/if}
</TrainingModuleShell>

<style>
  .import-panel { display: grid; gap: 0.75rem; } label { color: var(--text-2); font-weight: 700; } input, textarea { background: var(--surface-2); color: var(--text-1); border: 1px solid var(--border); border-radius: 6px; padding: 0.65rem; font: inherit; } textarea { min-height: 180px; resize: vertical; } .row, .puzzle-head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; } select { background: var(--surface-2); color: var(--text-1); border: 1px solid var(--border); padding: 0.5rem; border-radius: 6px; } .primary, .quiet { border-radius: 6px; padding: 0.6rem 1rem; font-weight: 700; cursor: pointer; } .primary { background: var(--accent); color: var(--bg); border: 0; } .quiet { background: transparent; color: var(--accent); border: 1px solid var(--accent-border); } .secondary-link { width: fit-content; border: 0; background: transparent; color: var(--accent); padding: 0; font: inherit; font-size: 0.82rem; cursor: pointer; } .primary:disabled { opacity: 0.5; cursor: not-allowed; } .status, .feedback { color: var(--text-3); } .feedback { border-top: 1px solid var(--border); padding-top: 0.75rem; } .analysis-progress { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; } .detected { color: var(--text-3); } .review-complete { display: grid; gap: 0.75rem; }
</style>
