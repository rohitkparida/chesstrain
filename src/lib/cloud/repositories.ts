import type { SupabaseClient } from '@supabase/supabase-js';

/** Public, typed boundary for the persisted learning data.  All methods take
 * an explicit user id; callers must never rely on a global/current account. */
export interface ProfileRecord {
  id: string; username: string; chesscomUsername: string | null;
  preferences: Record<string, unknown>; createdAt: Date; updatedAt: Date;
}
export interface SkillRatingRecord { userId: string; skill: string; subtype: string; elo: number; confidence: number; updatedAt: Date }
export interface TrainingAttemptRecord {
  id: string; userId: string; exerciseId: string; module: string; score: number;
  assistance: string; durationMs: number; startedAt: Date; completedAt: Date;
  result: string | null; source: string | null; tags: string[]; createdAt: Date;
}
export interface SrsCardRecord {
  userId: string; exerciseId: string; repetition: number; intervalDays: number;
  easeFactor: number; nextReviewAt: Date; lapses: number; updatedAt: Date;
}
export interface ChessComGameRecord {
  userId: string; gameId: string; pgn: string; gameMetadata: Record<string, unknown>;
  analyzedVersion: string | null; importedAt: Date;
}
export interface MistakeExerciseRecord {
  userId: string; id: string; gameId: string; ply: number; fen: string;
  exercise: Record<string, unknown>; createdAt: Date;
}

type Row = Record<string, any>;
const date = (v: string | Date) => v instanceof Date ? v : new Date(v);
const fail = (error: { message?: string } | null) => { if (error) throw new Error(error.message ?? 'Supabase request failed'); };
const unwrap = <T>(result: { data: T | null; error: { message?: string } | null }) => { fail(result.error); return result.data as T; };

export function createCloudRepositories(client: SupabaseClient) {
  const profiles = {
    async get(userId: string): Promise<ProfileRecord | null> {
      const r = unwrap<Row | null>(await client.from('profiles').select('*').eq('id', userId).maybeSingle());
      return r && { id: r.id, username: r.username, chesscomUsername: r.chesscom_username ?? null, preferences: r.preferences ?? {}, createdAt: date(r.created_at), updatedAt: date(r.updated_at) };
    },
    async upsert(userId: string, value: Partial<Omit<ProfileRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProfileRecord> {
      const r = unwrap<Row>(await client.from('profiles').upsert({ id: userId, ...(value.username !== undefined && { username: value.username }), ...(value.chesscomUsername !== undefined && { chesscom_username: value.chesscomUsername }), ...(value.preferences !== undefined && { preferences: value.preferences }) }).select().single());
      return { id: r.id, username: r.username, chesscomUsername: r.chesscom_username ?? null, preferences: r.preferences ?? {}, createdAt: date(r.created_at), updatedAt: date(r.updated_at) };
    }
  };
  const ratings = {
    async list(userId: string): Promise<SkillRatingRecord[]> { const r = unwrap<Row[]>(await client.from('skill_ratings').select('*').eq('user_id', userId)); return r.map(x => ({ userId: x.user_id, skill: x.skill, subtype: x.subtype, elo: Number(x.elo), confidence: Number(x.confidence), updatedAt: date(x.updated_at) })); },
    async upsert(value: Omit<SkillRatingRecord, 'updatedAt'>): Promise<void> { fail((await client.from('skill_ratings').upsert({ user_id: value.userId, skill: value.skill, subtype: value.subtype, elo: value.elo, confidence: value.confidence })).error); }
  };
  const attempts = {
    async list(userId: string, limit = 500): Promise<TrainingAttemptRecord[]> { const r = unwrap<Row[]>(await client.from('training_attempts').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(limit)); return r.map(x => ({ id: x.id, userId: x.user_id, exerciseId: x.exercise_id, module: x.module, score: Number(x.score), assistance: x.assistance, durationMs: x.duration_ms, startedAt: date(x.started_at), completedAt: date(x.completed_at), result: x.result ?? null, source: x.source ?? null, tags: x.tags ?? [], createdAt: date(x.created_at) })); },
    async insert(value: Omit<TrainingAttemptRecord, 'createdAt'>): Promise<void> { fail((await client.from('training_attempts').upsert({ id: value.id, user_id: value.userId, exercise_id: value.exerciseId, module: value.module, score: value.score, assistance: value.assistance, duration_ms: value.durationMs, started_at: value.startedAt.toISOString(), completed_at: value.completedAt.toISOString(), result: value.result, source: value.source, tags: value.tags })).error); }
  };
  const srs = {
    async list(userId: string): Promise<SrsCardRecord[]> { const r = unwrap<Row[]>(await client.from('srs_cards').select('*').eq('user_id', userId)); return r.map(x => ({ userId: x.user_id, exerciseId: x.exercise_id, repetition: x.repetition, intervalDays: Number(x.interval_days), easeFactor: Number(x.ease_factor), nextReviewAt: date(x.next_review_at), lapses: x.lapses, updatedAt: date(x.updated_at) })); },
    async upsert(v: SrsCardRecord): Promise<void> { fail((await client.from('srs_cards').upsert({ user_id: v.userId, exercise_id: v.exerciseId, repetition: v.repetition, interval_days: v.intervalDays, ease_factor: v.easeFactor, next_review_at: v.nextReviewAt.toISOString(), lapses: v.lapses })).error); }
  };
  const games = { async list(userId: string, limit = 500): Promise<ChessComGameRecord[]> { const r = unwrap<Row[]>(await client.from('chesscom_games').select('*').eq('user_id', userId).order('imported_at', { ascending: false }).limit(limit)); return r.map(x => ({ userId: x.user_id, gameId: x.game_id, pgn: x.pgn, gameMetadata: x.game_metadata ?? {}, analyzedVersion: x.analyzed_version ?? null, importedAt: date(x.imported_at) })); }, async upsert(v: ChessComGameRecord): Promise<void> { fail((await client.from('chesscom_games').upsert({ user_id: v.userId, game_id: v.gameId, pgn: v.pgn, game_metadata: v.gameMetadata, analyzed_version: v.analyzedVersion, imported_at: v.importedAt.toISOString() })).error); } };
  const mistakes = { async list(userId: string): Promise<MistakeExerciseRecord[]> { const r = unwrap<Row[]>(await client.from('mistake_exercises').select('*').eq('user_id', userId).order('created_at', { ascending: false })); return r.map(x => ({ userId: x.user_id, id: x.id, gameId: x.game_id, ply: x.ply, fen: x.fen, exercise: x.exercise ?? {}, createdAt: date(x.created_at) })); }, async upsert(v: MistakeExerciseRecord): Promise<void> { fail((await client.from('mistake_exercises').upsert({ user_id: v.userId, id: v.id, game_id: v.gameId, ply: v.ply, fen: v.fen, exercise: v.exercise, created_at: v.createdAt.toISOString() })).error); } };
  return { profiles, ratings, attempts, srs, games, mistakes };
}
