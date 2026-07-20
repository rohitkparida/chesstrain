import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadPuzzles, recordPuzzleAttempt, recordTrainingAttempt, resetSession, sanitizeStoredSession, sessionStore, switchSessionOwner } from './session';
import { GUEST_USERNAME } from '$lib/account/localAuth';
import { LOCAL_ACCOUNTS } from '$lib/account/localAuth';
import { makePuzzle } from '$lib/test/fixtures';

const puzzle = makePuzzle({ elo: 1300 });

describe('session learning integration', () => {
	beforeEach(() => {
		resetSession();
		loadPuzzles([puzzle]);
	});

	it('records real timing, tags, rating, and SRS schedule together', () => {
		recordPuzzleAttempt(puzzle, 'tactics', true, 4321);
		const session = get(sessionStore);
		const attempt = session.history[0];

		expect(attempt).toMatchObject({ puzzleId: 'fork-1', subType: 'fork', timeMs: 4321, tags: ['fork', 'knight'] });
		expect(session.ratings['tactics:fork']).toBeGreaterThan(1200);
		expect(session.srs['fork-1'].nextScheduledDate).toBeGreaterThan(Date.now());
	});

	it('records a skip or miss as a weakness without increasing solved count', () => {
		recordPuzzleAttempt(puzzle, 'tactics', false, 2500);
		const session = get(sessionStore);
		expect(session.history[0].result).toBe('incorrect');
		expect(session.totalSolved).toBe(0);
	});

	it('records non-tactics modules through the same SRS and mastery path', () => {
		recordTrainingAttempt({ exerciseId: 'calculation-1', module: 'calculation', correctness: 0.75, startedAt: 100, completedAt: 2100, source: 'curated', positionFingerprint: 'fen-a' });
		const session = get(sessionStore);
		expect(session.trainingAttempts[0]).toMatchObject({ module: 'calculation', score: 0.75, source: 'curated', positionFingerprint: 'fen-a' });
		expect(session.srs['calculation-1'].nextScheduledDate).toBeGreaterThan(Date.now());
	});

	it('drops malformed legacy fields instead of crashing newer session code', () => {
		expect(sanitizeStoredSession({
			ratings: null,
			history: [{ puzzleId: 'legacy', result: 'correct', timeMs: 100 }],
			srs: { broken: { puzzleId: 'broken', interval: 'tomorrow' } },
			streak: -100,
			totalSolved: 'many',
			activePuzzle: { id: 'broken' }
		})).toMatchObject({
			ratings: {},
			history: [],
			srs: {},
			streak: 0,
			totalSolved: 0,
			activePuzzle: null
		});
	});

	it('reset clears progress instead of restoring the originally persisted state', () => {
		recordPuzzleAttempt(puzzle, 'tactics', true, 1000);
		resetSession();
		expect(get(sessionStore)).toMatchObject({ history: [], srs: {}, streak: 0, totalSolved: 0, activePuzzle: null });
	});

	it('replaces a stale saved active puzzle with one from the current puzzle bank', () => {
		sessionStore.update(session => ({ ...session, activePuzzle: { ...puzzle, id: 'removed' } }));
		loadPuzzles([puzzle]);
		expect(get(sessionStore).activePuzzle?.id).toBe('fork-1');
	});

	it('advances past an already-recorded active puzzle after refresh', () => {
		const nextPuzzle = { ...puzzle, id: 'pin-1', tags: ['pin'] };
		recordPuzzleAttempt(puzzle, 'tactics', true, 1000);
		loadPuzzles([puzzle, nextPuzzle]);
		expect(get(sessionStore).activePuzzle?.id).toBe('pin-1');
	});

	it('keeps progress isolated between local accounts', () => {
		const [first, second] = LOCAL_ACCOUNTS;
		switchSessionOwner(first.username);
		resetSession();
		loadPuzzles([puzzle]);
		recordPuzzleAttempt(puzzle, 'tactics', true, 1000);

		switchSessionOwner(second.username);
		expect(get(sessionStore)).toMatchObject({ userId: second.username, totalSolved: 0, history: [] });

		switchSessionOwner(first.username);
		expect(get(sessionStore)).toMatchObject({ userId: first.username, totalSolved: 1 });
	});

	it('gives the guest owner a separate fully unlocked session', () => {
		switchSessionOwner(GUEST_USERNAME);
		expect(get(sessionStore).userId).toBe(GUEST_USERNAME);
		expect(Object.values(get(sessionStore).moduleProgress).every((progress) => progress.unlocked)).toBe(true);
	});
});
