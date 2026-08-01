import { describe, it, expect } from 'vitest';
import { drill as findSquareDrill } from './vision/findSquare';
import { drill as nameSquareDrill } from './vision/nameSquare';
import type { DrillContext } from './types';

describe('Repetition Policy Test Engine', () => {
  it('ensures zero consecutive rounds share identical target squares for vision.find-square over 50 rounds', async () => {
    let previousFingerprint: string | undefined = undefined;
    let previousTargetSquare: string | null = null;
    let consecutiveDuplicates = 0;

    // Use a deterministic seed-based PRNG to ensure reproducibility while exercising randomness
    let seed = 12345;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < 50; i++) {
      const context: DrillContext = {
        userId: 'test-user',
        difficulty: 1200,
        previousFingerprint,
        random: pseudoRandom
      };

      const instance = await findSquareDrill.generate(context);
      const targetSquare = instance.privateData.targetSquare;

      if (previousTargetSquare !== null && targetSquare === previousTargetSquare) {
        consecutiveDuplicates++;
      }

      previousTargetSquare = targetSquare;
      previousFingerprint = instance.fingerprint;
    }

    expect(consecutiveDuplicates).toBe(0);
  });

  it('ensures zero consecutive rounds share identical target squares for vision.name-square over 50 rounds', async () => {
    let previousFingerprint: string | undefined = undefined;
    let previousTargetSquare: string | null = null;
    let consecutiveDuplicates = 0;

    let seed = 54321;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < 50; i++) {
      const context: DrillContext = {
        userId: 'test-user',
        difficulty: 1200,
        previousFingerprint,
        random: pseudoRandom
      };

      const instance = await nameSquareDrill.generate(context);
      const targetSquare = instance.privateData.targetSquare;

      if (previousTargetSquare !== null && targetSquare === previousTargetSquare) {
        consecutiveDuplicates++;
      }

      previousTargetSquare = targetSquare;
      previousFingerprint = instance.fingerprint;
    }

    expect(consecutiveDuplicates).toBe(0);
  });
});
