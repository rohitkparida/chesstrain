import { describe, it, expect } from 'vitest';
import { DRILLS, pickRandomDrillId } from './registry';
import { Chess } from 'chess.js';
import { normalizeSolutionToUcis } from './tactics/randomTactics';

describe('Drill Registry and Contracts', () => {
  it('has unique drill IDs and valid lazy loaders', async () => {
    const ids = Object.keys(DRILLS);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of Object.values(DRILLS)) {
      expect(entry.id).toBeTruthy();
      expect(entry.module).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.description).toBeTruthy();

      const def = await entry.load();
      expect(def.id).toBe(entry.id);
      expect(def.module).toBe(entry.module);
    }
  }, 15000);

  it('generates valid drills meeting contract safety rules', async () => {
    const context = {
      userId: 'test-user',
      difficulty: 1200,
      random: () => 0.42
    };

    for (const entry of Object.values(DRILLS)) {
      const def = await entry.load();
      const inst = await def.generate(context);

      expect(inst.id).toBeTruthy();
      expect(inst.drillId).toBe(def.id);
      expect(inst.prompt).toBeTruthy();
      expect(inst.fingerprint).toBeTruthy();
      expect(inst.definitionVersion).toBeGreaterThan(0);

      if (inst.fen) {
        expect(() => new Chess(inst.fen)).not.toThrow();
      }

      // Verify public data contains NO answer leakage
      const pub = inst.publicData as Record<string, unknown>;
      expect(pub).not.toHaveProperty('square');
      expect(pub).not.toHaveProperty('targetSquare');
      expect(pub).not.toHaveProperty('targetCount');
      expect(pub).not.toHaveProperty('answers');
      expect(pub).not.toHaveProperty('targetSquares');
    }
  }, 15000);

  it('evaluates answers and bounds scores between 0 and 1', async () => {
    const context = {
      userId: 'test-user',
      difficulty: 1200,
      random: () => 0.5
    };

    const nameSquareDef = await DRILLS['vision.name-square'].load();
    const inst = await nameSquareDef.generate(context);

    const targetSquare = (inst.privateData as unknown as { targetSquare: string }).targetSquare;
    const correctEval = await nameSquareDef.evaluate(inst.privateData as any, targetSquare);
    expect(correctEval.correct).toBe(true);
    expect(correctEval.score).toBe(1);

    const wrongEval = await nameSquareDef.evaluate(
      inst.privateData as any,
      'a1' === targetSquare ? 'h8' : 'a1'
    );
    expect(wrongEval.correct).toBe(false);
    expect(wrongEval.score).toBe(0);
  });

  it('normalizes SAN solutions to UCI and evaluates tactics correctly', async () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
    const sanSolution = ['Nxe5', 'Nxe5'];
    const ucis = normalizeSolutionToUcis(fen, sanSolution);

    expect(ucis[0]).toBe('f3e5');

    const tacticsDef = await DRILLS['tactics.random'].load();
    const assessment = await tacticsDef.evaluate(
      { solutionUcis: ucis, FEN: fen },
      { from: 'f3', to: 'e5', uci: 'f3e5' }
    );

    expect(assessment.correct).toBe(true);
    expect(assessment.score).toBe(1);
    expect(assessment.reveal).toEqual([{ from: 'f3', to: 'e5', kind: 'arrow' }]);
  });

  it('picks random drills respecting multi-select without immediate repetition', () => {
    const selected = ['vision.name-square', 'vision.square-control', 'vision.loose-pieces'];

    const next1 = pickRandomDrillId(selected, 'vision.name-square', () => 0);
    expect(next1).not.toBe('vision.name-square');
    expect(selected).toContain(next1);

    expect(pickRandomDrillId(['vision.name-square'], 'vision.name-square')).toBe('vision.name-square');
  });
});
