import { describe, expect, it, vi } from 'vitest';

/**
 * Keep this benchmark separate from the correctness suite.  The module is
 * loaded afresh for every sample so proof-cache hits do not hide cold work.
 * A generous per-operation budget makes the test useful on slower CI/phones
 * without asserting a brittle performance ranking.
 */
const CASES = [
	{
		id: 'forced-mate-1-back-rank',
		fen: '3r2k1/p4ppp/1p2p3/8/2P5/1P6/P4PPP/3R2K1 b - - 0 1',
		firstMove: 'd8d1',
		mateIn: 1 as const,
		random: 0
	},
	{
		id: 'forced-mate-2-promotion-net',
		fen: '6k1/5pPp/4pPQP/3pP3/2pP4/1pP5/pP5K/R7 w - - 0 1',
		firstMove: 'g6b1',
		mateIn: 2 as const,
		random: 0.999999
	},
	{
		id: 'forced-mate-3-promotion-net',
		fen: '6k1/5pPp/4pPQP/3pP3/2pP4/1pP5/pP5K/R7 w - - 0 1',
		firstMove: 'g6c2',
		mateIn: 3 as const,
		random: 0.999999
	}
] as const;

const TEN_SECOND_BUDGET_MS = 10_000;
const BUDGET_SWEEP_MS = Array.from({ length: 9 }, (_, index) => (index + 2) * 1_000);

async function loadColdForcedMate() {
	vi.resetModules();
	return import('./forcedMate');
}

describe('forced mate cold benchmark', () => {
	it(
		'generates and exactly proves every supported tier within the 10-second budget',
		{ timeout: 60_000 },
		async () => {
			const samples: Array<{ id: string; mateIn: number; generationMs: number; proofMs: number }> = [];

			for (const candidate of CASES) {
				const generationModule = await loadColdForcedMate();
				const generationStarted = performance.now();
				const puzzle = generationModule.generateForcedMatePuzzle({
					maxMateIn: candidate.mateIn,
					random: () => candidate.random
				});
				const generationMs = performance.now() - generationStarted;

				expect(puzzle.id).toBe(candidate.id);
				expect(puzzle.mateIn).toBe(candidate.mateIn);
				expect(puzzle.uniqueFirstMove).toBe(true);
				expect(generationMs).toBeLessThan(TEN_SECOND_BUDGET_MS);

				const proofModule = await loadColdForcedMate();
				const proofStarted = performance.now();
				const proof = proofModule.proveForcedMate(candidate.fen, candidate.firstMove, candidate.mateIn);
				const proofMs = performance.now() - proofStarted;

				expect(proof.forced).toBe(true);
				expect(proof.uniqueFirstMove).toBe(true);
				expect(proof.winningMoves).toEqual([candidate.firstMove]);
				expect(proofMs).toBeLessThan(TEN_SECOND_BUDGET_MS);
				samples.push({ id: candidate.id, mateIn: candidate.mateIn, generationMs, proofMs });
			}

			const budgetSweep = BUDGET_SWEEP_MS.map(budgetMs => ({
				budgetMs,
				highestMateIn: samples
					.filter(sample => sample.generationMs < budgetMs && sample.proofMs < budgetMs)
					.at(-1)?.mateIn ?? 0
			}));
			expect(budgetSweep.at(-1)?.highestMateIn).toBe(3);

			// Keep timing and the 2s..10s budget sweep visible in CI logs.
			console.info('[forced-mate benchmark]', JSON.stringify(samples));
			console.info('[forced-mate budget sweep]', JSON.stringify(budgetSweep));
		}
	);
});
