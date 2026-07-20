import { describe, expect, it } from 'vitest';
import { generateDailyPlan } from './dailyPlan';
import { isModuleMastered } from './mastery';
import { fractionalScore } from './scoring';
import { buildProgressMap, getUnlockedModules } from './unlocks';
import type { TrainingAttempt, TrainingExercise } from './trainingTypes';

function attempt(overrides: Partial<TrainingAttempt> = {}): TrainingAttempt {
	return {
		id: 'attempt-1',
		userId: 'player',
		exerciseId: 'board-1',
		module: 'board-grip',
		score: 1,
		assistance: 'none',
		startedAt: 1,
		completedAt: 2,
		durationMs: 1,
		...overrides
	};
}

function exercise(id: string, module: TrainingExercise['module']): TrainingExercise {
	return { id, module, type: module, estimatedSeconds: 60 } as TrainingExercise;
}

describe('training foundation', () => {
	it('uses fractional scores for partial and assisted retrievals', () => {
		expect(fractionalScore({ correctness: 0.5 })).toBe(0.5);
		expect(fractionalScore({ correctness: 1, assistance: 'hint' })).toBe(0.75);
		expect(fractionalScore({ correctness: 0.5, assistance: 'guided' })).toBe(0.25);
	});

	it('requires ten latest unassisted attempts at ninety percent for mastery', () => {
		const attempts = Array.from({ length: 9 }, (_, index) => attempt({ id: `miss-${index}`, completedAt: index + 1, score: 1 }));
		expect(isModuleMastered(attempts, 'board-grip')).toBe(false);
		const mastered = [...attempts, attempt({ id: 'hinted', completedAt: 10, score: 0, assistance: 'hint' }), attempt({ id: 'ten', completedAt: 11, score: 1 })];
		expect(isModuleMastered(mastered, 'board-grip')).toBe(true);
	});

	it('follows the prerequisite graph and leaves My Mistakes available', () => {
		const boardAttempts = Array.from({ length: 10 }, (_, index) => attempt({ id: `board-${index}`, completedAt: index + 1 }));
		const progress = buildProgressMap(boardAttempts);
		expect(getUnlockedModules(progress)).toEqual(['board-grip', 'tactics', 'openings', 'mistakes']);

		const tacticsAndOpenings = [
			...boardAttempts,
			...Array.from({ length: 10 }, (_, index) => attempt({ id: `tactics-${index}`, module: 'tactics', exerciseId: 'tactics-1', completedAt: 20 + index })),
			...Array.from({ length: 10 }, (_, index) => attempt({ id: `opening-${index}`, module: 'openings', exerciseId: 'opening-1', completedAt: 40 + index }))
		];
		expect(getUnlockedModules(buildProgressMap(tacticsAndOpenings))).toEqual([
			'board-grip', 'tactics', 'openings', 'calculation', 'mistakes'
		]);
	});

	it('orders due, weak, and new work deterministically within the ten-minute target', () => {
		const boardAttempts = Array.from({ length: 10 }, (_, index) => attempt({ id: `board-${index}`, completedAt: index + 1 }));
		const attempts = [...boardAttempts, attempt({ id: 'weak-attempt', module: 'tactics', exerciseId: 'weak', score: 0, completedAt: 20 })];
		const exercises = [exercise('new', 'openings'), exercise('weak', 'tactics'), exercise('due', 'board-grip')];
		const input = {
			userId: 'player',
			exercises,
			attempts,
			now: 100,
			srs: { due: { nextScheduledDate: 1 } },
			dateKey: '2026-07-18'
		};
		const first = generateDailyPlan(input);
		const second = generateDailyPlan({ ...input, exercises: exercises.slice().reverse() });
		expect(first).toEqual(second);
		expect(first.items.map((item) => [item.exerciseId, item.reason])).toEqual([
			['due', 'due-review'],
			['weak', 'weakest-unlocked'],
			['new', 'new']
		]);
		expect(first.items.reduce((sum, item) => sum + item.estimatedSeconds, 0)).toBeLessThanOrEqual(600);
	});
});
