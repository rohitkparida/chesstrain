import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_ACCOUNTS } from '$lib/account/localAuth';
import { readSession, SESSION_SCHEMA_VERSION, SESSION_STORAGE_KEY } from './sessionPersistence';

describe('versioned session migration', () => {
	beforeEach(() => localStorage.clear());

	it('migrates current tactics history and cached ratings into version two', () => {
		const username = LOCAL_ACCOUNTS[0].username;
		localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
			userId: username,
			ratings: { 'tactics:fork': 1275 },
			history: [{
				puzzleId: 'fork-1', skill: 'tactics', subType: 'fork', tags: ['fork'], result: 'correct',
				timeMs: 2500, attemptedAt: 1000, scheduledAt: 2000
			}],
			srs: {}, streak: 1, totalSolved: 1
		}));
		localStorage.setItem(`magnus_skill_ratings:${username}`, JSON.stringify([
			{ skill: 'tactics', sub_type: 'pin', elo: 1310 }
		]));

		const migrated = readSession(username) as { version: number; trainingAttempts: Array<{ module: string; assistance: string }>; ratings: Record<string, number> };
		expect(migrated.version).toBe(SESSION_SCHEMA_VERSION);
		expect(migrated.trainingAttempts).toMatchObject([{ exerciseId: 'fork-1', module: 'tactics', assistance: 'none' }]);
		expect(migrated.ratings).toMatchObject({ 'tactics:fork': 1275, 'tactics:pin': 1310 });
		expect(JSON.parse(localStorage.getItem(`${SESSION_STORAGE_KEY}:${username}`) ?? '{}').version).toBe(SESSION_SCHEMA_VERSION);
	});

	it('does not let a secondary account read the unscoped legacy account', () => {
		const first = LOCAL_ACCOUNTS[0].username;
		const second = LOCAL_ACCOUNTS[1].username;
		localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: first, history: [] }));
		expect(readSession(second)).toBeNull();
		expect(readSession(first)).not.toBeNull();
		expect(localStorage.getItem(`${SESSION_STORAGE_KEY}:${second}`)).toBeNull();
	});
});
