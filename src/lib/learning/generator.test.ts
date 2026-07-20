import { describe, expect, it } from 'vitest';
import { exerciseFingerprint, PoolExerciseGenerator, recentFingerprints, selectNextExercise } from './generator';
import type { TrainingExercise } from './trainingTypes';

const exercise = (id: string, fingerprint: string, conceptIds: string[] = ['tactics:pin']): TrainingExercise => ({
  id, module: 'tactics', type: 'tactics', estimatedSeconds: 30, difficulty: 1200,
  positionFingerprint: fingerprint, conceptIds, source: 'generated', verification: 'stockfish'
});

describe('exercise generation', () => {
  it('excludes recently seen fingerprints and selects the requested concept', () => {
    const generator = new PoolExerciseGenerator({ list: () => [exercise('a', 'a'), exercise('b', 'b', ['tactics:fork'])] });
    expect(generator.generate({ module: 'tactics', conceptId: 'tactics:fork', excludeFingerprints: new Set(['b']) })).toBeNull();
    expect(generator.generate({ module: 'tactics', conceptId: 'tactics:fork' })?.id).toBe('b');
  });

  it('builds stable fingerprints and a bounded recent set', () => {
    expect(exerciseFingerprint('fen 0 1 9 10', ' Find the pin ', 'tactics')).toBe('tactics:fen 0 1 9:find the pin');
    expect([...recentFingerprints([{ positionFingerprint: 'old', completedAt: 1 }, { positionFingerprint: 'new', completedAt: 2 }], 1)]).toEqual(['new']);
  });

  it('prioritizes due reviews before unseen or recently used material', () => {
    const pool = { list: () => [exercise('a', 'a'), exercise('b', 'b')] };
    const selected = selectNextExercise({ pool, module: 'tactics', attempts: [], srs: { b: { puzzleId: 'b', interval: 1, repetition: 1, easeFactor: 2.5, nextScheduledDate: 1 } }, now: 2 });
    expect(selected?.id).toBe('b');
  });
});
