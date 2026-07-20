import type { SRSEntry } from '$lib/srs/sm2';
import { LOCAL_ACCOUNT_USERNAME } from '$lib/account/localAuth';
import type { Puzzle, SessionHistory, SessionState } from '../../stores/session';
import {
  isDailyPlan,
  isTrainingAttempt,
  moduleIdForSkill,
  type TrainingAttempt
} from '$lib/learning/trainingTypes';

export const SESSION_STORAGE_KEY = 'magnus_session';
export const SESSION_SCHEMA_VERSION = 2;

export interface VersionedSessionSnapshot {
  version: 2;
  userId: string | null;
  ratings: Record<string, number>;
  activePuzzle: Puzzle | null;
  history: SessionHistory[];
  srs: Record<string, SRSEntry>;
  streak: number;
  totalSolved: number;
  lastFailureTag: string | null;
  rebuildCount: number;
  trainingAttempts: TrainingAttempt[];
  moduleProgress?: SessionState['moduleProgress'];
  dailyPlan?: SessionState['dailyPlan'];
}

function scopedSessionKey(username: string): string {
  return `${SESSION_STORAGE_KEY}:${username}`;
}

export function readSession(username = LOCAL_ACCOUNT_USERNAME): VersionedSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const scopedKey = scopedSessionKey(username);
    let raw = localStorage.getItem(scopedKey);
    if (!raw && username === LOCAL_ACCOUNT_USERNAME) {
      raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(scopedKey, raw);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateStoredSession(parsed, username, readLegacyRatings(username));
    if (migrated && (!isVersionedSnapshot(parsed) || migrated.version !== parsed.version)) {
      localStorage.setItem(scopedKey, JSON.stringify(migrated));
    }
    return migrated;
  } catch { return null; }
}

export function writeSession(state: SessionState, username = LOCAL_ACCOUNT_USERNAME): void {
  if (typeof window === 'undefined') return;
  try {
    const { loadedPuzzles: _, ...progress } = state;
    localStorage.setItem(scopedSessionKey(username), JSON.stringify({
      version: SESSION_SCHEMA_VERSION,
      ...progress,
      history: progress.history.slice(-500),
      trainingAttempts: progress.trainingAttempts.slice(-500)
    }));
  } catch {}
}

export function clearSession(username = LOCAL_ACCOUNT_USERNAME): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(scopedSessionKey(username));
  localStorage.removeItem(`magnus_skill_ratings:${username}`);
  if (username === LOCAL_ACCOUNT_USERNAME) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('magnus_skill_ratings');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPuzzle(value: unknown): value is Puzzle {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.elo === 'number' && Number.isFinite(value.elo)
    && Array.isArray(value.tags) && value.tags.every(tag => typeof tag === 'string')
    && Array.isArray(value.solution) && value.solution.length > 0
    && value.solution.every(move => typeof move === 'string');
}

function isSessionHistory(value: unknown): value is SessionHistory {
  if (!isRecord(value)) return false;
  return typeof value.puzzleId === 'string' && typeof value.skill === 'string'
    && typeof value.subType === 'string' && Array.isArray(value.tags)
    && value.tags.every(tag => typeof tag === 'string')
    && (value.result === 'correct' || value.result === 'incorrect' || value.result === 'slow')
    && typeof value.timeMs === 'number' && Number.isFinite(value.timeMs)
    && typeof value.attemptedAt === 'number' && Number.isFinite(value.attemptedAt)
    && typeof value.scheduledAt === 'number' && Number.isFinite(value.scheduledAt);
}

function isSRSEntry(value: unknown): value is SRSEntry {
  if (!isRecord(value)) return false;
  return typeof value.puzzleId === 'string' && typeof value.interval === 'number' && Number.isFinite(value.interval)
    && typeof value.repetition === 'number' && Number.isFinite(value.repetition)
    && typeof value.easeFactor === 'number' && Number.isFinite(value.easeFactor)
    && typeof value.nextScheduledDate === 'number' && Number.isFinite(value.nextScheduledDate);
}

function isVersionedSnapshot(value: unknown): value is { version: number } {
  return isRecord(value) && typeof value.version === 'number';
}

function readLegacyRatings(username: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`magnus_skill_ratings:${username}`)
      ?? (username === LOCAL_ACCOUNT_USERNAME ? localStorage.getItem('magnus_skill_ratings') : null);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      return Object.fromEntries(parsed.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.skill !== 'string' || typeof entry.sub_type !== 'string'
          || typeof entry.elo !== 'number' || !Number.isFinite(entry.elo)) return [];
        return [[`${entry.skill}:${entry.sub_type}`, entry.elo] as const];
      }));
    }
    if (isRecord(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter(([, elo]) =>
        typeof elo === 'number' && Number.isFinite(elo)
      ) as Array<[string, number]>);
    }
  } catch {}
  return {};
}

function migrateLegacyAttempts(history: readonly SessionHistory[], username: string): TrainingAttempt[] {
  return history.map((entry, index) => {
    const completedAt = Number.isFinite(entry.attemptedAt) ? entry.attemptedAt : 0;
    const durationMs = Number.isFinite(entry.timeMs) ? Math.max(0, entry.timeMs) : 0;
    return {
      id: `legacy:${entry.puzzleId}:${completedAt}:${index}`,
      userId: username,
      exerciseId: entry.puzzleId,
      module: moduleIdForSkill(entry.skill),
      score: entry.result === 'correct' ? 1 : entry.result === 'slow' ? 0.75 : 0,
      assistance: 'none',
      startedAt: Math.max(0, completedAt - durationMs),
      completedAt,
      durationMs,
      correct: entry.result !== 'incorrect',
      result: entry.result,
      tags: entry.tags,
      scheduledAt: entry.scheduledAt
    };
  });
}

export function migrateStoredSession(
  value: unknown,
  username: string,
  legacyRatings: Record<string, number> = {}
): VersionedSessionSnapshot | null {
  if (!isRecord(value)) return null;
  const ratings = {
    ...legacyRatings,
    ...(isRecord(value.ratings) ? Object.fromEntries(Object.entries(value.ratings).filter(([, elo]) =>
      typeof elo === 'number' && Number.isFinite(elo)
    ) as Array<[string, number]>) : {})
  };
  const history = Array.isArray(value.history) ? value.history.filter(isSessionHistory).slice(-500) : [];
  const existingAttempts = Array.isArray(value.trainingAttempts)
    ? value.trainingAttempts.filter(isTrainingAttempt).slice(-500)
    : [];
  return {
    version: SESSION_SCHEMA_VERSION,
    userId: typeof value.userId === 'string' || value.userId === null ? value.userId : username,
    ratings,
    activePuzzle: isPuzzle(value.activePuzzle) ? value.activePuzzle : null,
    history,
    srs: isRecord(value.srs)
      ? Object.fromEntries(Object.entries(value.srs).filter(([, entry]) => isSRSEntry(entry)) as Array<[string, SRSEntry]>)
      : {},
    streak: typeof value.streak === 'number' && value.streak >= 0 ? Math.floor(value.streak) : 0,
    totalSolved: typeof value.totalSolved === 'number' && value.totalSolved >= 0 ? Math.floor(value.totalSolved) : 0,
    lastFailureTag: typeof value.lastFailureTag === 'string' ? value.lastFailureTag : null,
    rebuildCount: typeof value.rebuildCount === 'number' && value.rebuildCount >= 0 ? Math.floor(value.rebuildCount) : 0,
    trainingAttempts: existingAttempts.length > 0 ? existingAttempts : migrateLegacyAttempts(history, username),
    moduleProgress: isRecord(value.moduleProgress) ? value.moduleProgress as SessionState['moduleProgress'] : undefined,
    dailyPlan: isDailyPlan(value.dailyPlan) ? value.dailyPlan : undefined
  };
}

export function sanitizeStoredSession(value: unknown): Partial<SessionState> {
  const migrated = migrateStoredSession(value, 'local-user');
  if (!migrated) return {};
  const { version: _, ...session } = migrated;
  return session;
}
