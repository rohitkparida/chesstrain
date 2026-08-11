import { describe, expect, it } from 'vitest';
import { forcedMateCandidates, generateForcedMatePuzzle, proveForcedMate } from './forcedMate';

const cases = [
	['forced-mate-1-back-rank', '3r2k1/p4ppp/1p2p3/8/2P5/1P6/P4PPP/3R2K1 b - - 0 1', 'd8d1', 1],
	['forced-mate-2-promotion-net', '6k1/5pPp/4pPQP/3pP3/2pP4/1pP5/pP5K/R7 w - - 0 1', 'g6b1', 2]
] as const;

describe('forced mate generator', () => {
	it('keeps a bounded deterministic candidate bank', () => {
		expect(forcedMateCandidates()).toHaveLength(3);
	});

	for (const [id, fen, firstMove, mateIn] of cases) {
		it(`proves ${id}`, () => {
			const proof = proveForcedMate(fen, firstMove, mateIn);
			expect(proof.forced).toBe(true);
			expect(proof.uniqueFirstMove).toBe(true);
			expect(proof.winningMoves).toEqual([firstMove]);
			expect(proof.elapsedMs).toBeGreaterThan(0);
		});
	}

	it('generates the highest supported mate bound', () => {
		const started = performance.now();
		const puzzle = generateForcedMatePuzzle({ maxMateIn: 2, random: () => 0.99 });
		expect(puzzle.mateIn).toBe(2);
		expect(puzzle.uniqueFirstMove).toBe(true);
		expect(performance.now() - started).toBeLessThan(2000);
	});

	it('selects the benchmark mate-in-3 candidate without changing the rapid bound', () => {
		const puzzle = generateForcedMatePuzzle({ maxMateIn: 3, random: () => 0.999999 });
		expect(puzzle.id).toBe('forced-mate-3-promotion-net');
		expect(puzzle.mateIn).toBe(3);
		expect(puzzle.uniqueFirstMove).toBe(true);
	});
});
