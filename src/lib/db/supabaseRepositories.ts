import type { ImportedChessComGame, MistakeAnalysisJob, PersonalMistakeExercise } from '$lib/chesscom/types';
import type { SRSEntry } from '$lib/srs/sm2';
import type { TrainingAttempt } from '$lib/learning/trainingTypes';
import type { LearningRecordRepository, SkillRatingRecord, UserContentRepository } from '$lib/storage/contracts';
import { getSupabaseClient } from './client';

export function createSupabaseLearningRepository(): LearningRecordRepository {
	return {
		async listRatings(userId) {
			const db = getSupabaseClient();
			if (!db) return [];
			const { data, error } = await db.from('skill_ratings').select('*').eq('user_id', userId);
			if (error) throw error;
			return (data ?? []).map((row) => ({ userId, skill: String(row.skill), subType: String(row.subtype), elo: Number(row.elo), updatedAt: Date.parse(String(row.updated_at)) || Date.now() }));
		},
		async putRating(record: SkillRatingRecord) {
			const db = getSupabaseClient();
			if (!db) return;
			const { error } = await db.from('skill_ratings').upsert({ user_id: record.userId, skill: record.skill, subtype: record.subType, elo: record.elo, updated_at: new Date(record.updatedAt).toISOString() });
			if (error) throw error;
		},
		async listAttempts(userId) {
			const db = getSupabaseClient();
			if (!db) return [];
			const { data, error } = await db.from('training_attempts').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(1000);
			if (error) throw error;
			return (data ?? []) as unknown as TrainingAttempt[];
		},
		async putAttempt(attempt) {
			const db = getSupabaseClient();
			if (!db) return;
			const { error } = await db.from('training_attempts').upsert({ id: attempt.id, user_id: attempt.userId, exercise_id: attempt.exerciseId, module: attempt.module, score: attempt.score, assistance: attempt.assistance, duration_ms: attempt.durationMs, started_at: new Date(attempt.startedAt).toISOString(), completed_at: new Date(attempt.completedAt).toISOString(), result: attempt.result, source: attempt.source, tags: attempt.tags ?? [] });
			if (error) throw error;
		},
		async listSrsCards(userId) {
			const db = getSupabaseClient();
			if (!db) return {};
			const { data, error } = await db.from('srs_cards').select('*').eq('user_id', userId);
			if (error) throw error;
			return Object.fromEntries((data ?? []).map((row) => [String(row.exercise_id), { puzzleId: String(row.exercise_id), repetition: Number(row.repetition), interval: Number(row.interval_days), easeFactor: Number(row.ease_factor), nextScheduledDate: Date.parse(String(row.next_review_at)) || Date.now() } satisfies SRSEntry]));
		},
		async putSrsCard(userId, exerciseId, card) {
			const db = getSupabaseClient();
			if (!db) return;
			const { error } = await db.from('srs_cards').upsert({ user_id: userId, exercise_id: exerciseId, repetition: card.repetition, interval_days: card.interval, ease_factor: card.easeFactor, next_review_at: new Date(card.nextScheduledDate).toISOString(), updated_at: new Date().toISOString() });
			if (error) throw error;
		}
	};
}

export function createSupabaseUserContentRepository(): UserContentRepository {
	return {
		async listGames(userId, playerId) {
			const db = getSupabaseClient();
			if (!db) return [];
			const { data, error } = await db.from('chesscom_games').select('pgn,game_metadata').eq('user_id', userId);
			if (error) throw error;
			return (data ?? []).map((row) => ({ ...(row.game_metadata as ImportedChessComGame), pgn: String(row.pgn) })).filter((game) => Number((game as ImportedChessComGame).id) || playerId) as ImportedChessComGame[];
		},
		async putGames(userId, games) {
			const db = getSupabaseClient();
			if (!db || !games.length) return;
			const { error } = await db.from('chesscom_games').upsert(games.map((game) => ({ user_id: userId, game_id: game.id, pgn: game.pgn, game_metadata: game })));
			if (error) throw error;
		},
		async getAnalysisJob(userId, playerId) { void userId; void playerId; return null; },
		async putAnalysisJob(job) { void job; },
		async listMistakes(userId, playerId) {
			const db = getSupabaseClient();
			if (!db) return [];
			const { data, error } = await db.from('mistake_exercises').select('exercise').eq('user_id', userId);
			if (error) throw error;
			return (data ?? []).map((row) => row.exercise as PersonalMistakeExercise);
		},
		async putMistakes(userId, mistakes) {
			const db = getSupabaseClient();
			if (!db || !mistakes.length) return;
			const { error } = await db.from('mistake_exercises').upsert(mistakes.map((mistake) => ({ user_id: userId, id: mistake.id, game_id: mistake.gameId, ply: mistake.ply, fen: mistake.fen, exercise: mistake })));
			if (error) throw error;
		}
	};
}
