import { describe, expect, it } from 'vitest';
import { completedDailyPlanSlots, dailyPlanSlotKey, localDateKey } from './dailyPlan';
import type { DailyPlan, TrainingAttempt } from './trainingTypes';

function attempt(overrides: Partial<TrainingAttempt> = {}): TrainingAttempt {
	const timestamp = new Date(2026, 6, 19, 10).getTime();
	return {
		id: 'attempt-1', userId: 'player', exerciseId: 'shared', module: 'board-grip',
		score: 1, assistance: 'none', startedAt: timestamp, completedAt: timestamp, durationMs: 1000,
		...overrides
	};
}

const timestamp = new Date(2026, 6, 19, 10).getTime();
const plan: DailyPlan = {
	version: 1, userId: 'player', dateKey: localDateKey(timestamp), targetMinutes: 10,
	items: [
		{ exerciseId: 'shared', module: 'board-grip', reason: 'new', estimatedSeconds: 60, priority: 0 },
		{ exerciseId: 'shared', module: 'tactics', reason: 'new', estimatedSeconds: 60, priority: 1 }
	]
};

describe('daily plan reconciliation', () => {
	it('matches attempts to module slots instead of exercise ids alone', () => {
		expect(completedDailyPlanSlots(plan, [attempt()])).toEqual(
			new Set([dailyPlanSlotKey('board-grip', 'shared')])
		);
	});

	it('ignores another user and attempts from another local date', () => {
		const completed = completedDailyPlanSlots(plan, [
			attempt({ id: 'other-user', userId: 'other' }),
			attempt({ id: 'old', completedAt: new Date(2026, 6, 18, 23, 59).getTime() })
		]);
		expect(completed.size).toBe(0);
	});
});
