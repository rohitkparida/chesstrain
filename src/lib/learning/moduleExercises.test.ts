import { describe, expect, it } from 'vitest';
import { validatedExercises } from './moduleExercises';
import { TRAINING_MODULE_IDS } from './trainingTypes';

describe('validated module exercise registry', () => {
  it('provides multiple validated exercises and unique fingerprints per supported module', () => {
    for (const module of TRAINING_MODULE_IDS) {
      const exercises = validatedExercises(module);
      if (module === 'mistakes') continue;
      expect(exercises.length).toBeGreaterThan(1);
      expect(new Set(exercises.map((exercise) => exercise.positionFingerprint)).size).toBe(exercises.length);
      expect(exercises.every((exercise) => exercise.source && exercise.verification)).toBe(true);
    }
  });

  it('rejects malformed positions through validation', () => {
    expect(validatedExercises('calculation').every((exercise) => !('fen' in exercise) || exercise.fen === undefined || exercise.fen.split('/').length === 8)).toBe(true);
  });
});
