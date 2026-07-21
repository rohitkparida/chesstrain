import type { EngineEval, StockfishEngine } from '$lib/chess/engine';
import { Chess } from 'chess.js';
import type { ImportedChessComGame, MistakeKind, PersonalMistakeExercise } from '$lib/chesscom/types';
import { mistakeExerciseId } from '$lib/chesscom/types';
import { extractGameMoves, type GameMoveCandidate } from './gameMistakes';

export const MISTAKE_ANALYSIS_VERSION = 'stockfish-v2';
export const QUICK_ANALYSIS_MS = 150;
export const VERIFY_ANALYSIS_MS = 750;
export const QUICK_THRESHOLD_CP = 60;
export const MISTAKE_THRESHOLD_CP = 80;

export interface AnalyzedMove { candidate: GameMoveCandidate; game: ImportedChessComGame; before: EngineEval; after: EngineEval; }

export function isSacrificeIdea(fen: string, evaluation: EngineEval): boolean {
	if (evaluation.principalVariation.length < 2) return false;
	try {
		const game = new Chess(fen);
		const mover = game.turn();
		const material = () => game.board().flat().reduce((total, piece) => total + (piece?.color === mover ? ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }[piece.type] ?? 0) : 0), 0);
		const before = material();
		const first = evaluation.principalVariation[0];
		const reply = evaluation.principalVariation[1];
		game.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] as 'q' | 'r' | 'b' | 'n' | undefined });
		game.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] as 'q' | 'r' | 'b' | 'n' | undefined });
		return before - material() >= 2 && evaluation.evalCp >= -80;
	} catch { return false; }
}

export function playerPerspectiveLoss(before: EngineEval, after: EngineEval): number {
	const beforeScore = before.mateIn === null ? before.evalCp : before.mateIn > 0 ? 100000 - before.mateIn : -100000 - before.mateIn;
	const afterMate = after.mateIn === null ? null : -after.mateIn;
	const afterScore = afterMate === null ? -after.evalCp : afterMate > 0 ? 100000 - afterMate : -100000 - afterMate;
	return beforeScore - afterScore;
}

export function mistakeKind(before: EngineEval, after: EngineEval, lossCp: number): MistakeKind | null {
	if (before.mateIn !== null && before.mateIn > 0 && (after.mateIn === null || after.mateIn <= 0)) return 'missed-mate';
	if (after.mateIn !== null && after.mateIn > 0) return 'allowed-mate';
	return lossCp >= MISTAKE_THRESHOLD_CP ? 'evaluation-loss' : null;
}

export async function analyzeCandidate(engine: StockfishEngine, game: ImportedChessComGame, candidate: GameMoveCandidate, signal?: AbortSignal): Promise<AnalyzedMove | null> {
	const quick = await quickAnalyzeCandidate(engine, game, candidate, signal);
	return quick ? verifyCandidate(engine, quick, signal) : null;
}

export async function quickAnalyzeCandidate(engine: StockfishEngine, game: ImportedChessComGame, candidate: GameMoveCandidate, signal?: AbortSignal): Promise<AnalyzedMove | null> {
	const before = await engine.getEval(candidate.fen, { moveTimeMs: QUICK_ANALYSIS_MS, signal });
	const after = await engine.getEval(candidate.afterFen, { moveTimeMs: QUICK_ANALYSIS_MS, signal });
	const quickLoss = playerPerspectiveLoss(before, after);
	if (quickLoss < QUICK_THRESHOLD_CP && !(before.mateIn !== null && before.mateIn > 0) && !(after.mateIn !== null && after.mateIn < 0)) return null;
	return { candidate, game, before, after };
}

export async function verifyCandidate(engine: StockfishEngine, analysis: AnalyzedMove, signal?: AbortSignal): Promise<AnalyzedMove> {
	const before = await engine.getEval(analysis.candidate.fen, { moveTimeMs: VERIFY_ANALYSIS_MS, signal });
	const after = await engine.getEval(analysis.candidate.afterFen, { moveTimeMs: VERIFY_ANALYSIS_MS, signal });
	return { ...analysis, before, after };
}

export function exerciseFromAnalysis(analysis: AnalyzedMove, verificationStatus: 'provisional' | 'verified' = 'verified'): PersonalMistakeExercise | null {
	const lossCp = Math.max(0, Math.round(playerPerspectiveLoss(analysis.before, analysis.after)));
	const kind = isSacrificeIdea(analysis.candidate.fen, analysis.before) ? 'sacrifice-idea' : mistakeKind(analysis.before, analysis.after, lossCp) ?? (verificationStatus === 'provisional' && lossCp >= QUICK_THRESHOLD_CP ? 'evaluation-loss' : null);
	if (!kind || !analysis.before.bestMove) return null;
	return {
		id: mistakeExerciseId(analysis.game.id, analysis.candidate.ply), gameId: analysis.game.id, ply: analysis.candidate.ply,
		fen: analysis.candidate.fen, afterFen: analysis.candidate.afterFen,
		playedMove: analysis.candidate.move.from + analysis.candidate.move.to, bestMove: analysis.before.bestMove,
		playedSan: analysis.candidate.move.san, bestSan: analysis.before.bestMove, lossCp, kind, verificationStatus,
		principalVariation: analysis.before.principalVariation.slice(0, 3), engineVersion: MISTAKE_ANALYSIS_VERSION, analyzedAt: Date.now()
	};
}

export function candidatesForGame(game: ImportedChessComGame): GameMoveCandidate[] {
	const username = game.userColor === 'w' ? game.white.username : game.black.username;
	return extractGameMoves(game.pgn, game.userColor, username);
}
