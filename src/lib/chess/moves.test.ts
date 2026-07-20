import { describe, expect, it } from 'vitest';
import { applyCoordinateMove, applyUciMove } from './moves';

describe('move application', () => {
	it('returns the authoritative FEN after a legal move', () => {
		const result = applyCoordinateMove(
			'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
			'e2',
			'e4'
		);
		expect(result?.afterFen).toContain(' b KQkq ');
	});

	it('rejects illegal coordinate moves', () => {
		expect(applyCoordinateMove(
			'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
			'e2',
			'e5'
		)).toBeNull();
	});

	it('applies engine UCI responses', () => {
		const result = applyUciMove(
			'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
			'e7e5'
		);
		expect(result?.move.san).toBe('e5');
	});
});
