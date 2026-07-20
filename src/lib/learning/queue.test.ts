import { describe, expect, it } from 'vitest';
import { chooseNextPuzzle } from './queue';
import type { Puzzle, SessionHistory } from '../../stores/session';
import { makeQueuePuzzles } from '../test/fixtures';

const puzzles: Puzzle[] = makeQueuePuzzles();

describe('adaptive queue', () => {
	it('does not immediately repeat the current puzzle when alternatives exist', () => {
		expect(chooseNextPuzzle({ puzzles, userElo: 1200, currentPuzzleId: 'current', history: [], srs: {} })?.id)
			.not.toBe('current');
	});

	it('prioritizes scheduled due review over a new target-range puzzle', () => {
		expect(chooseNextPuzzle({
			puzzles,
			userElo: 1200,
			history: [],
			srs: { due: { puzzleId: 'due', interval: 1, repetition: 1, easeFactor: 2.5, nextScheduledDate: 1 } },
			now: 10
		})?.id).toBe('due');
	});

	it('uses repeated misses as a weakness signal', () => {
		const miss: SessionHistory = {
			puzzleId: 'old-fork',
			skill: 'tactics',
			subType: 'fork',
			tags: ['fork'],
			result: 'incorrect',
			timeMs: 1000,
			attemptedAt: 1,
			scheduledAt: 2
		};
		expect(chooseNextPuzzle({
			puzzles: [puzzles[1], puzzles[2]],
			userElo: 1200,
			history: Array(10).fill(miss),
			srs: {
				due: { puzzleId: 'due', interval: 1, repetition: 1, easeFactor: 2.5, nextScheduledDate: 100 },
				target: { puzzleId: 'target', interval: 1, repetition: 1, easeFactor: 2.5, nextScheduledDate: 100 }
			},
			now: 10
		})?.id).toBe('due');
	});
});
