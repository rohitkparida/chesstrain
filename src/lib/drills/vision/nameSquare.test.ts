import { describe, it, expect } from 'vitest';
import { drill as nameSquareDrill } from './nameSquare';
import { drill as findSquareDrill } from './findSquare';

describe('vision.name-square drill', () => {
  it('generates a valid name-square round with text-entry interaction', async () => {
    const context = { userId: 'test', difficulty: 1200, random: () => 0.5 };
    const instance = await nameSquareDrill.generate(context);

    expect(instance.drillId).toBe('vision.name-square');
    expect(nameSquareDrill.interaction).toBe('text-entry');
    expect(instance.prompt).toBe('Name the highlighted square.');
    expect(instance.publicData.markedSquare).toBeDefined();
    expect(typeof instance.publicData.markedSquare).toBe('string');
  });

  it('evaluates correct case-insensitive square entry', async () => {
    const context = { userId: 'test', difficulty: 1200, random: () => 0.5 };
    const instance = await nameSquareDrill.generate(context);
    const target = instance.privateData.targetSquare;

    const resultCorrect = await nameSquareDrill.evaluate(instance.privateData, target.toUpperCase(), 'none');
    expect(resultCorrect.correct).toBe(true);
    expect(resultCorrect.score).toBe(1);

    const resultWrong = await nameSquareDrill.evaluate(instance.privateData, 'a1', 'none');
    expect(resultWrong.correct).toBe(false);
    expect(resultWrong.score).toBe(0);
  });

  it('handles solution assistance correctly', async () => {
    const context = { userId: 'test', difficulty: 1200, random: () => 0.5 };
    const instance = await nameSquareDrill.generate(context);

    const result = await nameSquareDrill.evaluate(instance.privateData, '', 'solution');
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reveal).toBe(instance.privateData.targetSquare);
  });
});

describe('vision.find-square drill', () => {
  it('generates a valid find-square round with square-tap interaction', async () => {
    const context = { userId: 'test', difficulty: 1200, random: () => 0.5 };
    const instance = await findSquareDrill.generate(context);

    expect(instance.drillId).toBe('vision.find-square');
    expect(findSquareDrill.interaction).toBe('square-tap');
    expect(instance.prompt).toContain('Find');
  });
});
