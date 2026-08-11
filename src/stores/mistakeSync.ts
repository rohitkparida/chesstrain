import { writable } from 'svelte/store';
import { MistakeSyncCoordinator, type MistakeSyncState } from '$lib/chesscom/coordinator';
import { mistakeCacheKey, parseCachedMistakes, type GameMoveCandidate } from '$lib/learning/gameMistakes';
import { supabase } from '$lib/account/supabaseClient';
import { createCloudRepositories } from '$lib/cloud/repositories';

export type CachedReviewMistake = GameMoveCandidate & { bestMove: string; loss: number; gameId?: string };

export interface PreWarmedMistakeSyncState extends MistakeSyncState {
	preWarmedMistakes: CachedReviewMistake[];
}

const preWarmedCache = new Map<string, CachedReviewMistake[]>();

export function setPreWarmedMistakes(userId: string, mistakes: CachedReviewMistake[]) {
	preWarmedCache.set(userId, mistakes);
	mistakeSyncStore.update(state => ({ ...state, preWarmedMistakes: mistakes }));
}

export function preWarmMistakes(userId: string): CachedReviewMistake[] {
	const existing = preWarmedCache.get(userId);
	if (existing) return existing;
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(mistakeCacheKey(userId));
		const cached = parseCachedMistakes<CachedReviewMistake>(raw, userId);
		if (cached && Array.isArray(cached.mistakes) && cached.mistakes.length > 0) {
			setPreWarmedMistakes(userId, cached.mistakes);
		}
	} catch {
		// ignore parsing errors
	}
	return preWarmedCache.get(userId) ?? [];
}

export function getPreWarmedMistakes(userId?: string): CachedReviewMistake[] {
	if (userId && preWarmedCache.has(userId)) return preWarmedCache.get(userId) ?? [];
	if (userId) return preWarmMistakes(userId);
	return [];
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
		const cloud = supabase && userId !== 'guest' ? createCloudRepositories(supabase) : undefined;
		coordinator = new MistakeSyncCoordinator(userId, normalized, { cloud });
		coordinators.set(key, coordinator);
		coordinator.subscribe(state => {
			mistakeSyncStore.set({ ...state, preWarmedMistakes: preWarmedCache.get(userId) ?? [] });
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
