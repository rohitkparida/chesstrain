import { writable } from 'svelte/store';
import { createAttemptOutcome, type AttemptResult } from '$lib/learning/attempts';
import { chooseNextPuzzle } from '$lib/learning/queue';
import { sessionRepository } from '$lib/session/sessionRepository';
import { clearSession, readSession, writeSession } from '$lib/session/sessionPersistence';
export { sanitizeStoredSession } from '$lib/session/sessionPersistence';
import type { SRSEntry } from '$lib/srs/sm2';
import { calculateSRS } from '$lib/srs/sm2';
import { GUEST_USERNAME, LOCAL_ACCOUNT_USERNAME } from '$lib/account/localAuth';
import {
	buildProgressMap,
	buildGuestProgressMap,
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
	moduleProgress: buildProgressMap([]),
	dailyPlan: null,
};

const guestSessionDefaults: SessionState = {
	...defaultSession,
	userId: GUEST_USERNAME,
	moduleProgress: buildGuestProgressMap()
};

let sessionOwner = LOCAL_ACCOUNT_USERNAME;

function loadFromStorage(username = sessionOwner): Partial<SessionState> {
  try {
    const raw = readSession(username);
    if (raw) return { ...raw, moduleProgress: buildProgressMap(raw.trainingAttempts) };
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
    if (s.userId) sessionRepository.persistRating(s.userId, skill, result.subType, newElo).catch(() => {});

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
		moduleProgress: buildProgressMap(trainingAttempts)
    };
  });

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
		return { ...state, trainingAttempts, moduleProgress: buildProgressMap(trainingAttempts), srs: { ...state.srs, [params.exerciseId]: { puzzleId: params.exerciseId, ...next } } };
	});
	return recorded;
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
		moduleProgress: buildProgressMap([]),
		dailyPlan: null
	});
};
