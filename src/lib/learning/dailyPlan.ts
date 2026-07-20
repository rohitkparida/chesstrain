import { buildProgressMap } from './unlocks';
import type { SRSEntry } from '../srs/sm2';
import type {
	DailyPlan,
	DailyPlanItem,
	TrainingAttempt,
	TrainingExercise,
	TrainingModuleId,
	ModuleProgress
} from './trainingTypes';

export const DAILY_TARGET_MINUTES = 10;

export interface DailyPlanInput {
	userId: string;
	exercises: readonly TrainingExercise[];
	attempts?: readonly TrainingAttempt[];
	progress?: Partial<Record<TrainingModuleId, ModuleProgress>>;
	srs?: Readonly<Record<string, Pick<SRSEntry, 'nextScheduledDate'>>>;
	recentFingerprints?: ReadonlySet<string>;
	now?: number;
	targetMinutes?: number;
	dateKey?: string;
}

export function localDateKey(timestamp: number): string {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function estimatedSeconds(exercise: TrainingExercise): number {
	return Number.isFinite(exercise.estimatedSeconds) && exercise.estimatedSeconds > 0
		? Math.round(exercise.estimatedSeconds)
		: 60;
}

function weaknessByModule(
	attempts: readonly TrainingAttempt[],
	module: TrainingModuleId,
	progress: Partial<Record<TrainingModuleId, ModuleProgress>>
): number {
	const moduleProgress = progress[module];
	if (moduleProgress?.masteryScore !== null && moduleProgress?.masteryScore !== undefined) {
		return 1 - moduleProgress.masteryScore;
	}
	const recent = attempts.filter((attempt) => attempt.module === module).slice(-10);
	return recent.length === 0 ? 0 : 1 - recent.reduce((sum, attempt) => sum + attempt.score, 0) / recent.length;
}

function stableExerciseOrder(a: TrainingExercise, b: TrainingExercise): number {
	return a.module.localeCompare(b.module) || a.id.localeCompare(b.id);
}

function latestAttempt(
	attempts: readonly TrainingAttempt[],
	module: TrainingModuleId,
	exerciseId: string
): TrainingAttempt | undefined {
	return attempts
		.filter((attempt) => attempt.module === module && attempt.exerciseId === exerciseId)
		.sort((a, b) => b.completedAt - a.completedAt || b.id.localeCompare(a.id))[0];
}

export function dailyPlanSlotKey(module: TrainingModuleId, exerciseId: string): string {
	return `${module}:${exerciseId}`;
}

export function completedDailyPlanSlots(
	plan: Pick<DailyPlan, 'userId' | 'dateKey' | 'items'>,
	attempts: readonly TrainingAttempt[]
): ReadonlySet<string> {
	const completed = new Set<string>();
	const usedAttempts = new Set<string>();
	const todayAttempts = attempts
		.filter((attempt) => attempt.userId === plan.userId && localDateKey(attempt.completedAt) === plan.dateKey)
		.sort((a, b) => a.completedAt - b.completedAt || a.id.localeCompare(b.id));

	// A plan item is a slot in today's workout. The exercise bank can reuse one
	// content id, so completion must be matched by module in chronological order.
	for (const item of plan.items) {
		const attempt = todayAttempts.find(
			(candidate) => candidate.module === item.module && !usedAttempts.has(candidate.id)
		);
		if (!attempt) continue;
		usedAttempts.add(attempt.id);
		completed.add(dailyPlanSlotKey(item.module, item.exerciseId));
	}

	return completed;
}

export function generateDailyPlan(input: DailyPlanInput): DailyPlan {
	const now = input.now ?? Date.now();
	const attempts = input.attempts ?? [];
	const progress = input.progress ?? buildProgressMap(attempts);
	const targetMinutes = input.targetMinutes ?? DAILY_TARGET_MINUTES;
	const targetSeconds = Math.max(1, Math.round(targetMinutes * 60));
	const unlocked = new Set(
		Object.entries(progress)
			.filter(([, moduleProgress]) => moduleProgress?.unlocked)
			.map(([module]) => module)
	);
	const usableExercises = input.exercises
		.filter((exercise) => unlocked.has(exercise.module))
		.slice()
		.sort(stableExerciseOrder);
	const due: TrainingExercise[] = [];
	const weak: TrainingExercise[] = [];
	const fresh: TrainingExercise[] = [];

	for (const exercise of usableExercises) {
		const last = latestAttempt(attempts, exercise.module, exercise.id);
		const schedule = input.srs?.[exercise.id];
		const dueAt = schedule?.nextScheduledDate ?? last?.scheduledAt;
		if (dueAt !== undefined && dueAt <= now) {
			due.push(exercise);
		} else if (exercise.positionFingerprint && input.recentFingerprints?.has(exercise.positionFingerprint)) {
			continue;
		} else if (!last) {
			fresh.push(exercise);
		} else {
			weak.push(exercise);
		}
	}

	const order = (a: TrainingExercise, b: TrainingExercise): number =>
		weaknessByModule(attempts, b.module, progress) - weaknessByModule(attempts, a.module, progress)
		|| stableExerciseOrder(a, b);
	weak.sort(order);
	fresh.sort(order);

	const candidates: Array<{ exercise: TrainingExercise; reason: DailyPlanItem['reason'] }> = [
		...due.map((exercise) => ({ exercise, reason: 'due-review' as const })),
		...weak.map((exercise) => ({ exercise, reason: 'weakest-unlocked' as const })),
		...fresh.map((exercise) => ({ exercise, reason: 'new' as const }))
	];
	const items: DailyPlanItem[] = [];
	let elapsed = 0;
	for (const [index, candidate] of candidates.entries()) {
		const seconds = estimatedSeconds(candidate.exercise);
		if (items.length > 0 && elapsed + seconds > targetSeconds) continue;
		items.push({
			exerciseId: candidate.exercise.id,
			module: candidate.exercise.module,
			reason: candidate.reason,
			estimatedSeconds: seconds,
			priority: index
		});
		elapsed += seconds;
	}

	return {
		version: 1,
		userId: input.userId,
		dateKey: input.dateKey ?? localDateKey(now),
		targetMinutes,
		items
	};
}
