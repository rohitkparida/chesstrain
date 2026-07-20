import { describe, expect, it } from 'vitest';
import { buildGuestProgressMap } from './unlocks';
import { TRAINING_MODULE_IDS } from './trainingTypes';

describe('guest training mode', () => {
  it('unlocks every module without changing normal prerequisites', () => {
    const progress = buildGuestProgressMap();
    expect(TRAINING_MODULE_IDS.every((module) => progress[module].unlocked)).toBe(true);
  });
});
