import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { drill, RAPID_FORCED_MATE_BUDGET_MS, RAPID_FORCED_MATE_MAX } from './forcedMate';
import { applyUciMove } from '$lib/chess/moves';

describe('tactics.forced-mate drill', () => {
  const context = {
    userId: 'test-user',
    difficulty: 1200,
    random: () => 0.25
  };

  it('generates a legal, bounded rapid puzzle with one private answer', async () => {
    const started = performance.now();
    const generated = await drill.generate(context);
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(2000);
    expect(generated.privateData.solutionUcis).toHaveLength(1);
    expect(generated.publicData).not.toHaveProperty('solutionUcis');
    expect(generated.fen).toBeTruthy();
    if (!generated.fen) return;
    expect(() => new Chess(generated.fen)).not.toThrow();
    expect(applyUciMove(generated.fen, generated.privateData.solutionUcis[0] ?? '')).not.toBeNull();
    expect(generated.prompt).toMatch(/only move that forces mate in [1-2]/);
    expect(RAPID_FORCED_MATE_MAX).toBe(2);
    expect(RAPID_FORCED_MATE_BUDGET_MS).toBe(2000);
  });

  it('keeps the highest rapid tier under the generation budget', async () => {
    const started = performance.now();
    const generated = await drill.generate({ ...context, random: () => 0.99 });
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(RAPID_FORCED_MATE_BUDGET_MS);
    expect(generated.prompt).toContain('mate in 2');
    expect(generated.privateData.solutionUcis).toHaveLength(1);
  });

  it('accepts only the generated first move and scores assistance as zero', async () => {
    const generated = await drill.generate(context);
    const expected = generated.privateData.solutionUcis[0];
    expect(expected).toBeTruthy();
    if (!expected) return;
    const good = await drill.evaluate(generated.privateData, {
      from: expected.slice(0, 2),
      to: expected.slice(2, 4),
      uci: expected
    });
    const badUci = expected.startsWith('a') ? `b${expected.slice(1)}` : `a${expected.slice(1)}`;
    const bad = await drill.evaluate(generated.privateData, {
      from: badUci.slice(0, 2),
      to: badUci.slice(2, 4),
      uci: badUci
    });
    const assisted = await drill.evaluate(generated.privateData, null, 'solution');

    expect(good).toMatchObject({ correct: true, score: 1 });
    expect(bad).toMatchObject({ correct: false, score: 0 });
    expect(assisted).toMatchObject({ correct: false, score: 0 });
  });
});
