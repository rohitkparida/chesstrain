import { describe, expect, it } from 'vitest';
import { classifyAttempt, createAttemptOutcome } from './attempts';
import { makePuzzle } from '../test/fixtures';

const puzzle = makePuzzle();

describe('attempt learning signals', () => {
	it('distinguishes fast, slow, and incorrect retrievals', () => {
		expect(classifyAttempt(true, 3000)).toBe('correct');
		expect(classifyAttempt(true, 15000)).toBe('slow');
		expect(classifyAttempt(false, 1000)).toBe('incorrect');
	});

	it('updates the puzzle tag rating instead of a hardcoded subtype', () => {
		expect(createAttemptOutcome({ puzzle, userElo: 1200, correct: true, timeMs: 3000 }).subType).toBe('fork');
	});

	it('schedules misses sooner than retained answers', () => {
		const correct = createAttemptOutcome({ puzzle, userElo: 1200, correct: true, timeMs: 3000 });
		const repeatedCorrect = createAttemptOutcome({
			puzzle,
			userElo: 1200,
			correct: true,
			timeMs: 3000,
			previous: { ...correct.srs, repetition: 2, interval: 6 }
		});
		const miss = createAttemptOutcome({ puzzle, userElo: 1200, correct: false, timeMs: 3000 });
		expect(repeatedCorrect.srs.interval).toBeGreaterThan(miss.srs.interval);
	});
});
