import { buildModuleProgress } from './mastery';
import {
	MODULE_PREREQUISITES,
	TRAINING_MODULE_IDS,
	type ModuleProgress,
	type TrainingAttempt,
	type TrainingModuleId
} from './trainingTypes';

export function isModuleUnlocked(
	module: TrainingModuleId,
	progress: Partial<Record<TrainingModuleId, ModuleProgress>>
): boolean {
	if (module === 'board-grip' || module === 'mistakes') return true;
	return MODULE_PREREQUISITES[module].every((prerequisite) => progress[prerequisite]?.mastered === true);
}

export function getUnlockedModules(
	progress: Partial<Record<TrainingModuleId, ModuleProgress>>
): TrainingModuleId[] {
	return TRAINING_MODULE_IDS.filter((module) => isModuleUnlocked(module, progress));
}

export function buildProgressMap(
	attempts: readonly TrainingAttempt[]
): Record<TrainingModuleId, ModuleProgress> {
	const progress = {} as Record<TrainingModuleId, ModuleProgress>;
	for (const module of TRAINING_MODULE_IDS) {
		const unlocked = isModuleUnlocked(module, progress);
		progress[module] = buildModuleProgress(attempts, module, unlocked);
	}
	return progress;
}

export function buildGuestProgressMap(): Record<TrainingModuleId, ModuleProgress> {
	const progress = {} as Record<TrainingModuleId, ModuleProgress>;
	for (const module of TRAINING_MODULE_IDS) {
		progress[module] = buildModuleProgress([], module, true);
	}
	return progress;
}
