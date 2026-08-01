import { describe, it, expect } from 'vitest';
import { drill as safeKingSquaresDrill } from './safeKingSquares';
import { safeKingSquaresInfoFromFen } from '$lib/learning/boardGrip';

describe('Safe King Squares Generator Taste Filter', () => {
  it('enforces 90% unsafe and 10% safe distribution over 100 generated rounds', async () => {
    let unsafeCountRounds = 0;
    let safeCountRounds = 0;
    const unsafeCountsSeen = new Map<number, number>();

    for (let seed = 0; seed < 100; seed += 1) {
      let step = 0;
      const pseudoRandom = () => {
        step += 1;
        return (seed * 17 + step * 31) % 100 / 100;
      };

      const context = { userId: 'taste-test', difficulty: 1200, random: pseudoRandom };
      const instance = await safeKingSquaresDrill.generate(context);
      const info = safeKingSquaresInfoFromFen(instance.fen ?? '');

      if (info.unsafeCount > 0) {
        unsafeCountRounds += 1;
        unsafeCountsSeen.set(info.unsafeCount, (unsafeCountsSeen.get(info.unsafeCount) ?? 0) + 1);
      } else {
        safeCountRounds += 1;
      }
    }

    // Expect approximately 90 unsafe rounds and 10 safe rounds (allow statistical tolerance)
    expect(unsafeCountRounds).toBeGreaterThanOrEqual(75);
    expect(safeCountRounds).toBeLessThanOrEqual(25);
    // Expect multiple distinct unsafe counts to be sampled (uniform distribution)
    expect(unsafeCountsSeen.size).toBeGreaterThan(1);
  }, 30000);
});
