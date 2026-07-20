import { attemptIsUnassisted } from './scoring';
import type { ModuleProgress, TrainingAttempt, TrainingModuleId } from './trainingTypes';

export const MASTERY_ATTEMPT_COUNT = 10;
export const MASTERY_THRESHOLD = 0.9;

function attemptTime(attempt: TrainingAttempt): number {
	return attempt.completedAt || attempt.startedAt;
}

export function latestUnassistedAttempts(
	attempts: readonly TrainingAttempt[],
	module?: TrainingModuleId,
	count = MASTERY_ATTEMPT_COUNT
): TrainingAttempt[] {
	return attempts
		.filter((attempt) => (!module || attempt.module === module) && attemptIsUnassisted(attempt))
		.sort((a, b) => attemptTime(b) - attemptTime(a) || b.id.localeCompare(a.id))
		.slice(0, count);
}

export function masteryScore(
	attempts: readonly TrainingAttempt[],
	module: TrainingModuleId
): number | null {
	const recent = latestUnassistedAttempts(attempts, module);
	if (recent.length === 0) return null;
	return Number((recent.reduce((total, attempt) => total + attempt.score, 0) / recent.length).toFixed(4));
}

export function isModuleMastered(
	attempts: readonly TrainingAttempt[],
	module: TrainingModuleId
): boolean {
	const recent = latestUnassistedAttempts(attempts, module);
	return recent.length >= MASTERY_ATTEMPT_COUNT
		&& recent.reduce((total, attempt) => total + attempt.score, 0) / recent.length >= MASTERY_THRESHOLD;
}

export function buildModuleProgress(
	attempts: readonly TrainingAttempt[],
	module: TrainingModuleId,
	unlocked: boolean
): ModuleProgress {
	const moduleAttempts = attempts.filter((attempt) => attempt.module === module);
	const recent = latestUnassistedAttempts(attempts, module);
	const lastAttemptAt = moduleAttempts.length === 0
		? null
		: Math.max(...moduleAttempts.map(attemptTime));

	return {
		module,
		unlocked,
		mastered: isModuleMastered(attempts, module),
		masteryScore: masteryScore(attempts, module),
		attemptCount: moduleAttempts.length,
		unassistedAttemptCount: recent.length,
		recentScores: recent.slice().reverse().map((attempt) => attempt.score),
		lastAttemptAt
	};
}
