import { writable } from 'svelte/store';
import { MistakeSyncCoordinator, type MistakeSyncState } from '$lib/chesscom/coordinator';

export const mistakeSyncStore = writable<MistakeSyncState>({ status: 'idle', gamesFound: 0, gamesAnalyzed: 0, mistakesFound: 0, error: null, lastSyncAt: null });

const coordinators = new Map<string, MistakeSyncCoordinator>();

export function startMistakeSync(userId: string, username: string, force = false): MistakeSyncCoordinator | null {
	const normalized = username.trim();
	if (!normalized || typeof window === 'undefined') return null;
	const key = `${userId}:${normalized.toLocaleLowerCase()}`;
	let coordinator = coordinators.get(key);
	if (!coordinator) {
		coordinator = new MistakeSyncCoordinator(userId, normalized);
		coordinators.set(key, coordinator);
		coordinator.subscribe(state => mistakeSyncStore.set(state));
	}
	void coordinator.run(force);
	return coordinator;
}

export function stopMistakeSync(userId: string, username: string) {
	const key = `${userId}:${username.trim().toLocaleLowerCase()}`;
	const coordinator = coordinators.get(key);
	if (!coordinator) return;
	coordinator.destroy();
	coordinators.delete(key);
	}
