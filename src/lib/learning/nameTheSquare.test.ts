import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
	ALL_SQUARES,
	REALISTIC_FENS,
	isDarkSquare,
	piecesFromFen,
	randomRealisticFen,
	randomSquare
} from './nameTheSquare';

describe('name the square helpers', () => {
	it('contains every board coordinate once', () => {
		expect(ALL_SQUARES).toHaveLength(64);
		expect(new Set(ALL_SQUARES).size).toBe(64);
		expect(ALL_SQUARES).toContain('a1');
		expect(ALL_SQUARES).toContain('h8');
	});

	it('does not repeat the current target', () => {
		expect(randomSquare('a8', () => 0)).not.toBe('a8');
	});

	it('identifies square colors', () => {
		expect(isDarkSquare('a1')).toBe(true);
		expect(isDarkSquare('h1')).toBe(false);
	});

	it('provides legal, populated chess positions', () => {
		for (const fen of REALISTIC_FENS) {
			expect(() => new Chess(fen)).not.toThrow();
			const pieces = Object.values(piecesFromFen(fen));
			expect(pieces).toContainEqual({ color: 'w', type: 'k' });
			expect(pieces).toContainEqual({ color: 'b', type: 'k' });
			expect(pieces.length).toBeGreaterThan(20);
		}
	});

	it('does not immediately repeat a realistic position', () => {
		expect(randomRealisticFen(REALISTIC_FENS[0], () => 0)).toBe(REALISTIC_FENS[1]);
	});
});
