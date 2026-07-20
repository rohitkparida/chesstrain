import { describe, expect, it } from 'vitest';
import { mostPlayedChessComRating, normalizeChessComStats, targetLichessRating } from './difficulty';

describe('difficulty targeting', () => {
	it('uses the rating from the most played non-daily mode', () => {
		expect(mostPlayedChessComRating({ chess_blitz: { rating: 1300, played: 40 }, chess_rapid: { rating: 1500, played: 10 } })).toBe(1300);
	});

	it('normalizes the public Chess.com stats response', () => {
		expect(mostPlayedChessComRating(normalizeChessComStats({ chess_blitz: { last: { rating: 1300 }, record: { win: 10, loss: 2, draw: 1 } } }))).toBe(1300);
	});

	it('applies a bounded profile offset', () => {
		expect(targetLichessRating(1300, 150)).toBe(1450);
		expect(targetLichessRating(1300, 1000)).toBe(1600);
	});
});
