import { Chess, type Move } from 'chess.js';
import type { PersonalMistakeExercise } from '$lib/chesscom/types';
import type { EngineEval } from '$lib/chess/engine';

export interface GameMoveCandidate { ply: number; moveNumber: number; color: 'w' | 'b'; move: Move; fen: string; afterFen: string; }
export type ReviewMistake = GameMoveCandidate & { bestMove: string; loss: number; gameId?: string };

export interface ReviewAnalysisProgress {
	completed: number;
	total: number;
}

export function reviewMistakeFromEvaluation(
	candidate: GameMoveCandidate,
	before: EngineEval,
	after: EngineEval,
	perspective: 'w' | 'b',
	minimumLossCp = 80
): ReviewMistake | null {
	if (!before.bestMove) return null;
	const beforeScore = perspective === 'w' ? before.evalCp : -before.evalCp;
	const afterScore = perspective === 'w' ? -after.evalCp : after.evalCp;
	const loss = Math.max(0, Math.round(beforeScore - afterScore));
	return loss >= minimumLossCp ? { ...candidate, bestMove: before.bestMove, loss } : null;
}

export function personalMistakeToReview(exercise: PersonalMistakeExercise): ReviewMistake | null {
  if (exercise.verificationStatus === 'discarded' || exercise.ply <= 10 || exercise.lossCp < 150) return null;
  const board = new Chess(exercise.fen);
  let played: Move | null = null;
  if (exercise.playedMove && exercise.playedMove.length >= 4) {
    try {
      played = board.move({ from: exercise.playedMove.slice(0, 2), to: exercise.playedMove.slice(2, 4), promotion: (exercise.playedMove[4] as 'q' | 'r' | 'b' | 'n' | undefined) || 'q' });
    } catch { /* try SAN below */ }
  }
  if (!played && exercise.playedSan) {
    try { played = board.move(exercise.playedSan); } catch { /* malformed persisted move */ }
  }
  if (!played) return null;
  return { ply: exercise.ply, moveNumber: Math.ceil(exercise.ply / 2), color: played.color, move: played, fen: exercise.fen, afterFen: exercise.afterFen, bestMove: exercise.bestMove, loss: exercise.lossCp, gameId: exercise.gameId };
}

/**
 * Runs the lightweight review analysis used by pasted games. Keeping the
 * candidate/evaluation loop here means every source (pasted PGN or imported
 * games) feeds the same review model instead of rebuilding it in a route.
 */
export async function analyzeCandidatesForReview(
	engine: { getEval(fen: string, options?: { moveTimeMs?: number; signal?: AbortSignal }): Promise<EngineEval> },
	candidates: GameMoveCandidate[],
	perspective: AccountColor,
	options: { minimumLossCp?: number; moveTimeMs?: number; signal?: AbortSignal; onProgress?: (progress: ReviewAnalysisProgress) => void; onResult?: (review: ReviewMistake) => void } = {}
): Promise<ReviewMistake[]> {
	const minimumLossCp = options.minimumLossCp ?? 80;
	const moveTimeMs = options.moveTimeMs ?? 250;
	const found: ReviewMistake[] = [];
	for (let index = 0; index < candidates.length; index += 1) {
		if (options.signal?.aborted) return found;
		const candidate = candidates[index];
		const before = await engine.getEval(candidate.fen, { moveTimeMs, signal: options.signal });
		const after = await engine.getEval(candidate.afterFen, { moveTimeMs, signal: options.signal });
		const review = reviewMistakeFromEvaluation(candidate, before, after, perspective, minimumLossCp);
		if (review) { found.push(review); options.onResult?.(review); }
		options.onProgress?.({ completed: index + 1, total: candidates.length });
	}
	return found;
}

export interface CachedMistakeSet<T> { username: string; savedAt: number; mistakes: T[]; }

export type AccountColor = 'w' | 'b';

export function mistakeCacheKey(userId: string): string {
  return `magnus:mistakes:${userId}`;
}

export function serializeMistakes<T>(userId: string, username: string, mistakes: T[], savedAt = Date.now()): string {
  return JSON.stringify({ userId, username, savedAt, mistakes });
}

export function parseCachedMistakes<T>(raw: string | null, userId: string): CachedMistakeSet<T> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('userId' in value) || !('mistakes' in value) || !Array.isArray(value.mistakes)) return null;
    const record = value as { userId?: unknown; username?: unknown; savedAt?: unknown; mistakes: T[] };
    if (record.userId !== userId || typeof record.savedAt !== 'number') return null;
    return { username: typeof record.username === 'string' ? record.username : '', savedAt: record.savedAt, mistakes: record.mistakes };
  } catch { return null; }
}

function normalizePlayerName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function playerNamesMatch(headerName: string, accountName: string): boolean {
  const header = normalizePlayerName(headerName);
  const account = normalizePlayerName(accountName);
  return Boolean(account) && (header === account || header.startsWith(`${account} (`) || header.startsWith(`${account} `));
}

function headersFromPgn(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of pgn.replace(/\r\n?/g, '\n').split('\n')) {
    const match = line.match(/^\s*\[([A-Za-z][A-Za-z0-9_]*)\s+"((?:\\.|[^"\\])*)"\]\s*$/);
    if (!match) {
      if (Object.keys(headers).length) break;
      continue;
    }
    headers[match[1]] = match[2].replace(/\\([\\"])/g, '$1');
  }
  return headers;
}

export function splitPgnGames(pgn: string): string[] {
  const normalized = pgn.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const starts = [...normalized.matchAll(/^\s*\[Event(?:\s|\")/gim)].map((match) => match.index ?? 0);
  if (starts.length <= 1) return [normalized];

  return starts.map((start, index) => normalized.slice(start, starts[index + 1]).trim()).filter(Boolean);
}

export function accountColorFromHeaders(headers: Record<string, string>, accountName: string | undefined): AccountColor | null {
  if (!accountName?.trim()) return null;
  const whiteMatches = typeof headers.White === 'string' && playerNamesMatch(headers.White, accountName);
  const blackMatches = typeof headers.Black === 'string' && playerNamesMatch(headers.Black, accountName);
  if (whiteMatches === blackMatches) return null;
  return whiteMatches ? 'w' : 'b';
}

export function hasAmbiguousAccountColor(pgn: string, accountName: string | undefined): boolean {
  const games = splitPgnGames(pgn);
  if (!games.length || !accountName?.trim()) return true;
  return games.some((gamePgn) => accountColorFromHeaders(headersFromPgn(gamePgn), accountName) === null);
}

export function extractGameMoves(pgn: string, fallbackColor: AccountColor, accountName?: string): GameMoveCandidate[] {
  const candidates: GameMoveCandidate[] = [];
  for (const gamePgn of splitPgnGames(pgn)) {
    const game = new Chess();
    game.loadPgn(gamePgn);
    const selectedColor = accountColorFromHeaders(game.getHeaders(), accountName) ?? fallbackColor;
    const replay = new Chess();
    for (const move of game.history({ verbose: true })) {
      const fen = replay.fen();
      const played = replay.move(move);
      if (played.color === selectedColor) candidates.push({ ply: replay.history().length, moveNumber: Math.ceil(replay.history().length / 2), color: played.color, move: played, fen, afterFen: replay.fen() });
    }
  }
  return candidates;
}
