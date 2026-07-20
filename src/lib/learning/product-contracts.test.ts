import { describe, expect, it } from 'vitest';
import { DAILY_PLAN_EXERCISES, TRAINING_MODULES } from '../../components/trainingCatalog';
import { generateDailyPlan } from './dailyPlan';
import { PoolExerciseGenerator } from './generator';
import { buildProgressMap } from './unlocks';
import type { TrainingAttempt } from './trainingTypes';

const attempt = (module: TrainingAttempt['module'], exerciseId: string, score = 1): TrainingAttempt => ({
  id: `${module}-${exerciseId}`, userId: 'test-user', exerciseId, module, score, assistance: 'none', startedAt: 1, completedAt: 2, durationMs: 1
});

describe('product learning contracts', () => {
  it('provides multiple repeatable exercises for every catalog module', () => {
    for (const module of TRAINING_MODULES) expect(DAILY_PLAN_EXERCISES.filter((exercise) => exercise.module === module.module).length).toBeGreaterThan(1);
  });

  it('keeps Today finite while the generator can continue selecting module work', () => {
    const progress = buildProgressMap([attempt('board-grip', 'board-grip-daily-1')]);
    const plan = generateDailyPlan({ userId: 'test-user', exercises: DAILY_PLAN_EXERCISES, progress, attempts: [attempt('board-grip', 'board-grip-daily-1')] });
    expect(plan.items.length).toBeGreaterThan(0);
    const generator = new PoolExerciseGenerator({ list: (module) => DAILY_PLAN_EXERCISES.filter((exercise) => exercise.module === module) });
    expect(generator.generate({ module: 'board-grip', excludeFingerprints: new Set(['board-grip:daily:1']) })).not.toBeNull();
  });
});
