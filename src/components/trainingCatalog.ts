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
	{
		module: 'board-grip',
		name: 'Board Vision',
		description: 'Name squares, find attackers, and spot loose pieces.',
		href: appPath('/train/squares'),
		icon: '♙'
	},
	{
		module: 'tactics',
		name: 'Tactics',
		description: 'Recognize forcing patterns and tactical threats.',
		href: appPath('/train/tactics'),
		icon: '⚔'
	},
	{
		module: 'calculation',
		name: 'Calculation',
		description: 'Calculate a complete line without moving the pieces.',
		href: appPath('/train/calculation'),
		icon: '◎'
	},
	{
		module: 'positional',
		name: 'Positional',
		description: 'Evaluate positions and rank candidate plans.',
		href: appPath('/train/positional'),
		icon: '♗'
	},
	{
		module: 'decision',
		name: 'Decision',
		description: 'Use a repeatable checklist before committing to a move.',
		href: appPath('/train/decision'),
		icon: '✓'
	},
	{
		module: 'openings',
		name: 'Openings',
		description: 'Practice your repertoire and respond to deviations.',
		href: appPath('/train/opening'),
		icon: '♜'
	},
	{
		module: 'endgame',
		name: 'Endgame',
		description: 'Practice endgame technique against Stockfish.',
		href: appPath('/train/endgame'),
		icon: '♔'
	},
	{
		module: 'mistakes',
		name: 'My Mistakes',
		description: 'Turn your own game errors into focused puzzles.',
		href: appPath('/train/mistakes'),
		icon: '↺'
	}
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
