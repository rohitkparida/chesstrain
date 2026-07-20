export interface ChessComRatingStat {
	rating?: number;
	played?: number;
}

export type ChessComRatingStats = Readonly<Record<string, ChessComRatingStat>>;

export function normalizeChessComStats(stats: ChessComStats): ChessComRatingStats {
	return Object.fromEntries(Object.entries(stats).map(([key, value]) => {
		const record = value.record;
		return [key, { rating: value.last?.rating, played: (record?.win ?? 0) + (record?.loss ?? 0) + (record?.draw ?? 0) }];
	}));
}

export function mostPlayedChessComRating(stats: ChessComRatingStats, fallback = 1200): number {
	const eligible = Object.entries(stats)
		.filter(([key, value]) => key.startsWith('chess_') && key !== 'chess_daily' && typeof value.rating === 'number' && Number.isFinite(value.rating))
		.sort(([, a], [, b]) => (b.played ?? 0) - (a.played ?? 0));
	return eligible[0]?.[1].rating ?? fallback;
}

export function targetLichessRating(initialRating: number, difficultyOffset: number): number {
	const offset = Math.max(-300, Math.min(300, difficultyOffset));
	return Math.max(400, Math.min(3000, Math.round(initialRating + offset)));
}
import type { ChessComStats } from '$lib/chesscom/types';
