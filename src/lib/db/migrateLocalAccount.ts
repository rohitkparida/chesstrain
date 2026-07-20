import { getSupabaseClient } from './client';
import { readSession } from '$lib/session/sessionPersistence';
import { localProfileRepository } from '$lib/account/profile';

const MIGRATION_PREFIX = 'magnus:supabase-migrated:';

export interface LocalAccountMigrationResult {
	status: 'skipped' | 'migrated' | 'already-migrated';
	userId?: string;
	attempts: number;
	srsCards: number;
}

export async function migrateLocalAccount(username: string): Promise<LocalAccountMigrationResult> {
	const snapshot = readSession(username);
	const attempts = snapshot?.trainingAttempts.length ?? 0;
	const srsCards = Object.keys(snapshot?.srs ?? {}).length;
	const db = getSupabaseClient();
	if (!db || typeof window === 'undefined' || username === 'guest') return { status: 'skipped', attempts, srsCards };

	const { data: authData, error: authError } = await db.auth.getUser();
	if (authError || !authData.user) return { status: 'skipped', attempts, srsCards };
	const userId = authData.user.id;
	const markerKey = `${MIGRATION_PREFIX}${username}:${userId}`;
	if (localStorage.getItem(markerKey) === '1') return { status: 'already-migrated', userId, attempts, srsCards };

	const profile = localProfileRepository.read(username);
	const { error: profileError } = await db.from('profiles').upsert({ id: userId, username, chesscom_username: profile.chessComUsername, preferences: profile });
	if (profileError) throw profileError;

	if (snapshot) {
		if (snapshot.trainingAttempts.length) {
			const { error } = await db.from('training_attempts').upsert(snapshot.trainingAttempts.map((attempt) => ({ id: attempt.id, user_id: userId, exercise_id: attempt.exerciseId, module: attempt.module, score: attempt.score, assistance: attempt.assistance, duration_ms: attempt.durationMs, started_at: new Date(attempt.startedAt).toISOString(), completed_at: new Date(attempt.completedAt).toISOString(), result: attempt.result, source: attempt.source, tags: attempt.tags ?? [] })));
			if (error) throw error;
		}
		const cards = Object.values(snapshot.srs);
		if (cards.length) {
			const { error } = await db.from('srs_cards').upsert(cards.map((card) => ({ user_id: userId, exercise_id: card.puzzleId, repetition: card.repetition, interval_days: card.interval, ease_factor: card.easeFactor, next_review_at: new Date(card.nextScheduledDate).toISOString(), updated_at: new Date().toISOString() })));
			if (error) throw error;
		}
	}

	localStorage.setItem(markerKey, '1');
	return { status: 'migrated', userId, attempts, srsCards };
}
