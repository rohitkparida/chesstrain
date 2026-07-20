import { describe, expect, it } from 'vitest';
import { attemptResultState, initialAttemptState, isPuzzleInteractable, nextPuzzleState, puzzleTag } from './tacticsLifecycle';
import { makePuzzleData } from '$lib/test/fixtures';

describe('tactics lifecycle helpers', () => {
	it('uses the first tag and falls back to general', () => {
		expect(puzzleTag(makePuzzleData({ tags: ['fork', 'knight'] }))).toBe('fork');
		expect(puzzleTag(makePuzzleData({ tags: [] }))).toBe('general');
	});

	it('creates a timed attempt state without deciding persistence', () => {
		expect(attemptResultState(false, 1200, 'd8f6', 'fen-after')).toMatchObject({
		feedbackType: 'wrong', attempted: true, reflectionSeconds: 30,
		attemptTimeMs: 1200, attemptedMove: 'd8f6', attemptedFen: 'fen-after'
		});
	});

	it('resets all attempt fields together', () => {
		expect(nextPuzzleState()).toEqual(initialAttemptState());
	});

	it('blocks interaction after an attempt or while advancing', () => {
		expect(isPuzzleInteractable(false, false)).toBe(true);
		expect(isPuzzleInteractable(true, false)).toBe(false);
		expect(isPuzzleInteractable(false, true)).toBe(false);
	});
});
