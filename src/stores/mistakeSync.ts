import { writable } from 'svelte/store';
import { MistakeSyncCoordinator, type MistakeSyncState } from '$lib/chesscom/coordinator';
import { mistakeCacheKey, parseCachedMistakes } from '$lib/learning/gameMistakes';

export interface PreWarmedMistakeSyncState extends MistakeSyncState {
	preWarmedMistakes: any[];
}

let preWarmedCache: any[] = [];

export function setPreWarmedMistakes(mistakes: any[]) {
	preWarmedCache = mistakes;
	mistakeSyncStore.update(state => ({ ...state, preWarmedMistakes: mistakes }));
}

export function preWarmMistakes(userId: string): any[] {
	if (preWarmedCache.length > 0) return preWarmedCache;
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') return preWarmedCache;
	try {
		const raw = localStorage.getItem(mistakeCacheKey(userId));
		const cached = parseCachedMistakes<any>(raw, userId);
		if (cached && Array.isArray(cached.mistakes) && cached.mistakes.length > 0) {
			setPreWarmedMistakes(cached.mistakes);
		}
	} catch {
		// ignore parsing errors
	}
	return preWarmedCache;
}

export function getPreWarmedMistakes(userId?: string): any[] {
	if (preWarmedCache.length > 0) return preWarmedCache;
	if (userId) return preWarmMistakes(userId);
	return preWarmedCache;
}

export const mistakeSyncStore = writable<PreWarmedMistakeSyncState>({
	status: 'idle',
	gamesFound: 0,
	gamesAnalyzed: 0,
	mistakesFound: 0,
	error: null,
	lastSyncAt: null,
	preWarmedMistakes: []
});

const coordinators = new Map<string, MistakeSyncCoordinator>();

export function startMistakeSync(userId: string, username: string, force = false): MistakeSyncCoordinator | null {
	const normalized = username.trim();
	if (!normalized || typeof window === 'undefined') return null;

	preWarmMistakes(userId);

	const key = `${userId}:${normalized.toLocaleLowerCase()}`;
	let coordinator = coordinators.get(key);
	if (!coordinator) {
		coordinator = new MistakeSyncCoordinator(userId, normalized);
		coordinators.set(key, coordinator);
		coordinator.subscribe(state => {
			mistakeSyncStore.set({ ...state, preWarmedMistakes: preWarmedCache });
		});
	}
	void coordinator.run(force).catch(() => {});
	return coordinator;
}

export function stopMistakeSync(userId: string, username: string) {
	const key = `${userId}:${username.trim().toLocaleLowerCase()}`;
	const coordinator = coordinators.get(key);
	if (!coordinator) return;
	coordinator.destroy();
	coordinators.delete(key);
}
