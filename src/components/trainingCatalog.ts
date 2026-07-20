import type { TrainingExercise, TrainingModuleId } from '$lib/learning/training';
import { appPath } from '$lib/paths';

export interface TrainingModulePresentation {
	module: TrainingModuleId;
	name: string;
	description: string;
	href: string;
	icon: string;
}

export const TRAINING_MODULES: readonly TrainingModulePresentation[] = [
	{ module: 'board-grip', name: 'Board Vision', description: 'See squares, attackers, and loose pieces.', href: appPath('/train/squares'), icon: 'board' },
	{ module: 'tactics', name: 'Tactics', description: 'Forcing moves and threats.', href: appPath('/train/tactics'), icon: 'tactics' },
	{ module: 'calculation', name: 'Calculation', description: 'Calculate lines without moving.', href: appPath('/train/calculation'), icon: 'calculation' },
	{ module: 'positional', name: 'Positional', description: 'Evaluate positions and plans.', href: appPath('/train/positional'), icon: 'positional' },
	{ module: 'decision', name: 'Decision', description: 'Choose moves with a checklist.', href: appPath('/train/decision'), icon: 'decision' },
	{ module: 'openings', name: 'Openings', description: 'Practice your repertoire and respond to deviations.', href: appPath('/train/opening'), icon: 'opening' },
	{ module: 'endgame', name: 'Endgame', description: 'Practice endgames against the engine.', href: appPath('/train/endgame'), icon: 'endgame' },
	{ module: 'mistakes', name: 'My Mistakes', description: 'Practice mistakes from your games.', href: appPath('/train/mistakes'), icon: 'mistakes' }
];

export const DAILY_PLAN_EXERCISES: readonly TrainingExercise[] = TRAINING_MODULES.flatMap((entry) =>
	Array.from({ length: 4 }, (_, index) => ({
		id: `${entry.module}-daily-${index + 1}`,
		module: entry.module,
		type: entry.module,
		title: `${entry.name} practice ${index + 1}`,
		estimatedSeconds: entry.module === 'endgame' ? 120 : 60,
		source: entry.module === 'mistakes' ? 'personal-game' : entry.module === 'openings' ? 'repertoire' : 'curated',
		verification: entry.module === 'endgame' ? 'stockfish' : 'curated',
		conceptIds: [`${entry.module}:core`],
		positionFingerprint: `${entry.module}:daily:${index + 1}`,
		memoryMode: entry.module === 'openings' || entry.module === 'mistakes' ? 'exact-position' : 'concept-variation',
		generationVersion: 'catalog-v2'
	})) as TrainingExercise[]
);

export function modulePresentation(module: TrainingModuleId): TrainingModulePresentation {
	return TRAINING_MODULES.find((entry) => entry.module === module) ?? TRAINING_MODULES[0];
}
