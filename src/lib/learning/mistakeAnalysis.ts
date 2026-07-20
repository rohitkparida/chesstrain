import type { EngineEval, StockfishEngine } from '$lib/chess/engine';
import type { ImportedChessComGame, MistakeKind, PersonalMistakeExercise } from '$lib/chesscom/types';
import { mistakeExerciseId } from '$lib/chesscom/types';
import { extractGameMoves, type GameMoveCandidate } from './gameMistakes';

export const MISTAKE_ANALYSIS_VERSION = 'stockfish-v2';
export const QUICK_ANALYSIS_MS = 150;
export const VERIFY_ANALYSIS_MS = 750;
export const QUICK_THRESHOLD_CP = 60;
export const MISTAKE_THRESHOLD_CP = 80;

export interface AnalyzedMove { candidate: GameMoveCandidate; game: ImportedChessComGame; before: EngineEval; after: EngineEval; }

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
	const before = await engine.getEval(candidate.fen, { moveTimeMs: QUICK_ANALYSIS_MS, signal });
	const after = await engine.getEval(candidate.afterFen, { moveTimeMs: QUICK_ANALYSIS_MS, signal });
	const quickLoss = playerPerspectiveLoss(before, after);
	if (quickLoss < QUICK_THRESHOLD_CP && !(before.mateIn !== null && before.mateIn > 0) && !(after.mateIn !== null && after.mateIn < 0)) return null;
	const verifiedBefore = await engine.getEval(candidate.fen, { moveTimeMs: VERIFY_ANALYSIS_MS, signal });
	const verifiedAfter = await engine.getEval(candidate.afterFen, { moveTimeMs: VERIFY_ANALYSIS_MS, signal });
	return { candidate, game, before: verifiedBefore, after: verifiedAfter };
}

export function exerciseFromAnalysis(analysis: AnalyzedMove): PersonalMistakeExercise | null {
	const lossCp = Math.max(0, Math.round(playerPerspectiveLoss(analysis.before, analysis.after)));
	const kind = mistakeKind(analysis.before, analysis.after, lossCp);
	if (!kind || !analysis.before.bestMove) return null;
	return {
		id: mistakeExerciseId(analysis.game.id, analysis.candidate.ply), gameId: analysis.game.id, ply: analysis.candidate.ply,
		fen: analysis.candidate.fen, afterFen: analysis.candidate.afterFen,
		playedMove: analysis.candidate.move.from + analysis.candidate.move.to, bestMove: analysis.before.bestMove,
		playedSan: analysis.candidate.move.san, bestSan: analysis.before.bestMove, lossCp, kind,
		principalVariation: analysis.before.principalVariation.slice(0, 3), engineVersion: MISTAKE_ANALYSIS_VERSION, analyzedAt: Date.now()
	};
}

export function candidatesForGame(game: ImportedChessComGame): GameMoveCandidate[] {
	const username = game.userColor === 'w' ? game.white.username : game.black.username;
	return extractGameMoves(game.pgn, game.userColor, username);
}
