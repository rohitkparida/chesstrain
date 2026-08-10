import { get, writable } from 'svelte/store';
import { createAttemptOutcome, type AttemptResult } from '$lib/learning/attempts';
import { chooseNextPuzzle } from '$lib/learning/queue';
import { clearSession, readSession, writeSession } from '$lib/session/sessionPersistence';
export { sanitizeStoredSession } from '$lib/session/sessionPersistence';
import type { SRSEntry } from '$lib/srs/sm2';
import { calculateSRS } from '$lib/srs/sm2';
import { supabase, supabaseConfigured } from '$lib/account/supabaseClient';
import { createCloudRepositories, type TrainingAttemptRecord } from '$lib/cloud/repositories';
import { GUEST_USERNAME, LOCAL_ACCOUNT_USERNAME } from '$lib/account/localAuth';
import {
	createProgressMap,
	createTrainingAttempt,
	type DailyPlan,
	type ModuleProgress,
	type TrainingAttempt,
	type TrainingModuleId
} from '$lib/learning/training';

export interface Puzzle {
  id: string;
  elo: number;
  tags: string[];
  pgn?: string;
  fen?: string;
  solution: string[];
  description?: string;
}

export interface SessionState {
  userId: string | null;
  ratings: Record<string, number>;
  activePuzzle: Puzzle | null;
  history: SessionHistory[];
  srs: Record<string, SRSEntry>;
  loadedPuzzles: Puzzle[];
  streak: number;
  totalSolved: number;
	lastFailureTag: string | null;
	rebuildCount: number;
	trainingAttempts: TrainingAttempt[];
	moduleProgress: Record<TrainingModuleId, ModuleProgress>;
	dailyPlan: DailyPlan | null;
}

export interface SessionHistory {
  puzzleId: string;
  skill: string;
  subType: string;
  tags: string[];
  result: AttemptResult;
  timeMs: number;
  attemptedAt: number;
  scheduledAt: number;
}

const defaultSession: SessionState = {
  userId: LOCAL_ACCOUNT_USERNAME,
  ratings: { 'tactics:back-rank': 1200 },
  activePuzzle: null,
  history: [],
  srs: {},
  loadedPuzzles: [],
  streak: 0,
  totalSolved: 0,
	lastFailureTag: null,
	rebuildCount: 0,
	trainingAttempts: [],
	moduleProgress: createProgressMap([]),
	dailyPlan: null,
};

const guestSessionDefaults: SessionState = {
	...defaultSession,
	userId: GUEST_USERNAME,
	moduleProgress: createProgressMap([], true)
};

let sessionOwner = LOCAL_ACCOUNT_USERNAME;
let cloudUserId: string | null = null;
const cloudEnabled = supabaseConfigured && import.meta.env.MODE !== 'test';
const cloudRepositories = supabase ? createCloudRepositories(supabase) : null;

export type PersistenceSyncStatus = 'local' | 'syncing' | 'synced' | 'error';
/** Observable status for optional UI/diagnostics; local progress is always authoritative. */
export const persistenceSyncStatus = writable<PersistenceSyncStatus>('local');
let pendingCloudWrites = 0;
function beginCloudWrite() { pendingCloudWrites++; persistenceSyncStatus.set('syncing'); }
function finishCloudWrite(ok: boolean) {
	pendingCloudWrites = Math.max(0, pendingCloudWrites - 1);
	if (!ok) persistenceSyncStatus.set('error');
	else if (pendingCloudWrites === 0) persistenceSyncStatus.set('synced');
}

const CLOUD_MODULES = new Set<TrainingModuleId>(['board-grip', 'tactics', 'openings', 'calculation', 'positional', 'decision', 'endgame', 'mistakes']);

/** Replace the local cache with the authenticated user's cloud learning data. */
export async function hydrateCloudSession(userId: string, username: string): Promise<void> {
	if (!cloudEnabled || !cloudRepositories || username === GUEST_USERNAME) return;
	cloudUserId = userId;
	sessionOwner = username;
	persistenceSyncStatus.set('syncing');
	let ratings: Awaited<ReturnType<typeof cloudRepositories.ratings.list>>;
	let cards: Awaited<ReturnType<typeof cloudRepositories.srs.list>>;
	let attempts: Awaited<ReturnType<typeof cloudRepositories.attempts.list>>;
	try {
		[ratings, cards, attempts] = await Promise.all([
			cloudRepositories.ratings.list(userId), cloudRepositories.srs.list(userId), cloudRepositories.attempts.list(userId)
		]);
	} catch {
		// Keep the local-first session intact when the network is unavailable.
		persistenceSyncStatus.set('error');
		return;
	}
	const ratingMap: Record<string, number> = { ...defaultSession.ratings };
	for (const rating of ratings) ratingMap[`${rating.skill}:${rating.subtype}`] = rating.elo;
	const srsMap: Record<string, SRSEntry> = {};
	for (const card of cards) srsMap[card.exerciseId] = { puzzleId: card.exerciseId, repetition: card.repetition, interval: card.intervalDays, easeFactor: card.easeFactor, nextScheduledDate: card.nextReviewAt.getTime() };
	const trainingAttempts = attempts.filter((a) => CLOUD_MODULES.has(a.module as TrainingModuleId)).map(cloudAttemptToTrainingAttempt).reverse();
	sessionStore.set({ ...defaultSession, userId: username, ratings: ratingMap, srs: srsMap, trainingAttempts, totalSolved: trainingAttempts.filter((a) => a.correct).length, streak: calculateStreak(trainingAttempts), moduleProgress: createProgressMap(trainingAttempts, false), loadedPuzzles: [] });
	persistenceSyncStatus.set('synced');
}

function cloudAttemptToTrainingAttempt(a: TrainingAttemptRecord): TrainingAttempt {
	return { id: a.id, userId: a.userId, exerciseId: a.exerciseId, module: a.module as TrainingModuleId, score: a.score, assistance: (a.assistance || 'none') as TrainingAttempt['assistance'], startedAt: a.startedAt.getTime(), completedAt: a.completedAt.getTime(), durationMs: a.durationMs, correct: a.score >= 0.9, result: (a.result as TrainingAttempt['result']) ?? undefined, tags: a.tags, source: (a.source as TrainingAttempt['source']) ?? undefined };
}

function calculateStreak(attempts: TrainingAttempt[]): number {
	let streak = 0;
	for (const attempt of [...attempts].sort((a, b) => b.completedAt - a.completedAt)) { if (!attempt.correct) break; streak++; }
	return streak;
}

function persistCloudAttempt(attempt: TrainingAttempt): void {
	if (!cloudEnabled || !cloudRepositories || !cloudUserId || attempt.userId !== sessionOwner) return;
	beginCloudWrite();
	void cloudRepositories.attempts.insert({ id: attempt.id, userId: cloudUserId, exerciseId: attempt.exerciseId, module: attempt.module, score: attempt.score, assistance: attempt.assistance, durationMs: attempt.durationMs, startedAt: new Date(attempt.startedAt), completedAt: new Date(attempt.completedAt), result: attempt.result ?? null, source: attempt.source ?? null, tags: [...(attempt.tags ?? [])] }).then(() => finishCloudWrite(true), () => finishCloudWrite(false));
}

function persistCloudRating(skill: string, subtype: string, elo: number): void {
	if (!cloudEnabled || !cloudRepositories || !cloudUserId) return;
	beginCloudWrite();
	void cloudRepositories.ratings.upsert({ userId: cloudUserId, skill, subtype, elo, confidence: 0.5 }).then(() => finishCloudWrite(true), () => finishCloudWrite(false));
}

function persistCloudSrs(exerciseId: string, value: SRSEntry): void {
	if (!cloudEnabled || !cloudRepositories || !cloudUserId) return;
	beginCloudWrite();
	void cloudRepositories.srs.upsert({ userId: cloudUserId, exerciseId, repetition: value.repetition, intervalDays: value.interval, easeFactor: value.easeFactor, nextReviewAt: new Date(value.nextScheduledDate), lapses: 0, updatedAt: new Date() }).then(() => finishCloudWrite(true), () => finishCloudWrite(false));
}

function loadFromStorage(username = sessionOwner): Partial<SessionState> {
  try {
    const raw = readSession(username);
    if (raw) return { ...raw, moduleProgress: createProgressMap(raw.trainingAttempts, username === GUEST_USERNAME) };
  } catch {}
  return {};
}

function saveToStorage(state: SessionState) {
  try {
    // Don't persist large puzzle list — just persist progress data
    writeSession(state, sessionOwner);
  } catch {}
}

const persisted = typeof window !== 'undefined' ? loadFromStorage() : {};

const initialSession: SessionState = {
  ...defaultSession,
  ...persisted,
  loadedPuzzles: [],
};

export const sessionStore = writable<SessionState>(initialSession);

// Auto-persist on every change
sessionStore.subscribe((state) => {
  if (typeof window !== 'undefined') saveToStorage(state);
});

export function switchSessionOwner(username: string): void {
	if (username === sessionOwner) return;
	cloudUserId = null;
  sessionOwner = username;
	const stored = loadFromStorage(username);
	const base = username === GUEST_USERNAME ? guestSessionDefaults : defaultSession;
	sessionStore.set({
		...base,
    ...stored,
    userId: username,
    loadedPuzzles: []
	});
}

export const loadPuzzles = (puzzles: Puzzle[]) => {
	  sessionStore.update(s => {
    let activePuzzle: Puzzle | null =
      puzzles.find(puzzle => puzzle.id === s.activePuzzle?.id) || puzzles[0] || null;
    const lastAttempt = (s.history ?? []).at(-1);

    if (activePuzzle && lastAttempt?.puzzleId === activePuzzle.id) {
      const key = `${lastAttempt.skill}:${lastAttempt.subType}`;
      activePuzzle = chooseNextPuzzle({
        puzzles,
        userElo: s.ratings[key] || 1200,
        currentPuzzleId: activePuzzle.id,
        history: s.history ?? [],
        srs: s.srs ?? {}
      });
    }

    return { ...s, loadedPuzzles: puzzles, activePuzzle };
  });
};

export const recordPuzzleAttempt = (
  puzzle: Puzzle,
  skill: string,
  correct: boolean,
  timeMs: number
) => {
  let result!: ReturnType<typeof createAttemptOutcome>;

	const attemptedAt = Date.now();
	sessionStore.update(s => {
    const subType = puzzle.tags[0] ?? 'general';
    const key = `${skill}:${subType}`;
    const userElo = s.ratings[key] || 1200;
    result = createAttemptOutcome({
      puzzle,
      userElo,
      correct,
      timeMs,
      previous: (s.srs ?? {})[puzzle.id]
    });
    const newElo = Math.max(100, userElo + result.eloDelta);

		const trainingAttempt = createTrainingAttempt({
			id: `tactics:${puzzle.id}:${attemptedAt}:${s.trainingAttempts.length}`,
			userId: s.userId ?? sessionOwner,
			exerciseId: puzzle.id,
			module: 'tactics',
			correct,
			startedAt: Math.max(0, attemptedAt - Math.max(0, timeMs)),
			completedAt: attemptedAt,
			tags: puzzle.tags,
			result: result.result,
			scheduledAt: result.srs.nextScheduledDate
		});
		const trainingAttempts = [...(s.trainingAttempts ?? []), trainingAttempt].slice(-500);

	    return {
      ...s,
      streak: correct ? s.streak + 1 : 0,
      totalSolved: correct ? s.totalSolved + 1 : s.totalSolved,
      ratings: { ...s.ratings, [key]: newElo },
	      lastFailureTag: correct ? (s.rebuildCount >= 3 ? null : s.lastFailureTag) : (puzzle.tags[0] ?? 'general'),
	      rebuildCount: correct ? Math.min(3, s.rebuildCount + 1) : 0,
      srs: { ...(s.srs ?? {}), [puzzle.id]: result.srs },
      history: [...(s.history ?? []), {
        puzzleId: puzzle.id,
        skill,
        subType: result.subType,
        tags: puzzle.tags,
        result: result.result,
        timeMs,
        attemptedAt,
        scheduledAt: result.srs.nextScheduledDate
	      }],
		trainingAttempts,
		moduleProgress: createProgressMap(trainingAttempts, s.userId === GUEST_USERNAME)
	    };
	  });
	// Persist the same authoritative records used to update the in-memory session.
	const snapshot = get(sessionStore);
	if (snapshot.trainingAttempts.length) {
		const subtype = puzzle.tags[0] ?? 'general';
		persistCloudRating(skill, subtype, snapshot.ratings[`${skill}:${subtype}`] ?? 1200);
		const card = snapshot.srs[puzzle.id];
		if (card) persistCloudSrs(puzzle.id, card);
		persistCloudAttempt(snapshot.trainingAttempts.at(-1)!);
	}

  return result;
};

export function recordTrainingAttempt(params: {
	exerciseId: string;
	module: TrainingModuleId;
	correctness: number;
	startedAt: number;
	completedAt?: number;
	assistance?: TrainingAttempt['assistance'];
	completion?: number;
	tags?: readonly string[];
	positionFingerprint?: string;
	conceptIds?: readonly string[];
	source?: TrainingAttempt['source'];
}): TrainingAttempt {
	let recorded!: TrainingAttempt;
	const completedAt = params.completedAt ?? Date.now();
	sessionStore.update((state) => {
		const previous = state.srs[params.exerciseId];
		const score = Math.max(0, Math.min(1, params.correctness * (params.completion ?? 1)));
		const quality = score >= 0.9 ? 5 : score >= 0.6 ? 3 : 1;
		const next = calculateSRS(quality, previous?.repetition ?? 0, previous?.interval ?? 0, previous?.easeFactor ?? 2.5);
		recorded = createTrainingAttempt({
			id: `${params.module}:${params.exerciseId}:${completedAt}:${state.trainingAttempts.length}`,
			userId: state.userId ?? sessionOwner,
			exerciseId: params.exerciseId,
			module: params.module,
			correct: score >= 0.9,
			correctness: params.correctness,
			completion: params.completion,
			assistance: params.assistance,
			startedAt: params.startedAt,
			completedAt,
			tags: params.tags,
			scheduledAt: next.nextScheduledDate
		});
		recorded = { ...recorded, positionFingerprint: params.positionFingerprint, conceptIds: params.conceptIds, source: params.source };
		const trainingAttempts = [...state.trainingAttempts, recorded].slice(-500);
		return { ...state, trainingAttempts, moduleProgress: createProgressMap(trainingAttempts, state.userId === GUEST_USERNAME), srs: { ...state.srs, [params.exerciseId]: { puzzleId: params.exerciseId, ...next } } };
	});
	persistCloudAttempt(recorded);
	return recorded;
}

export function recordModuleAttempt(params: Omit<Parameters<typeof recordTrainingAttempt>[0], 'startedAt'> & { startedAt?: number }): TrainingAttempt {
	return recordTrainingAttempt({ ...params, startedAt: params.startedAt ?? Date.now() });
}

export const selectNextPuzzle = (skill: string, subType: string): Puzzle | null => {
  let selected: Puzzle | null = null;
  sessionStore.update(s => {
    const key = `${skill}:${subType}`;
    const userElo = s.ratings[key] || 1200;
    selected = chooseNextPuzzle({
      puzzles: s.loadedPuzzles,
      userElo,
      currentPuzzleId: s.activePuzzle?.id,
      history: s.history ?? [],
      srs: s.srs ?? {}
			,rebuildTag: s.lastFailureTag ?? undefined,
			rebuildCount: s.rebuildCount
    });
    return { ...s, activePuzzle: selected };
  });
  return selected as Puzzle | null;
};

export const resetSession = () => {
  clearSession(sessionOwner);
  sessionStore.set({
		...defaultSession,
		userId: sessionOwner,
		ratings: { ...defaultSession.ratings },
		trainingAttempts: [],
		moduleProgress: createProgressMap([], sessionOwner === GUEST_USERNAME),
		dailyPlan: null
	});
};
