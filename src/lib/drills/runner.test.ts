import { describe, it, expect, vi } from 'vitest';
import { DrillRunnerMachine } from './runner';
import type { DrillDefinition, GeneratedDrill, DrillAssessment, StepwiseDrillDefinition } from './types';

describe('DrillRunnerMachine', () => {
  const fakeDefinition: DrillDefinition<'square-tap'> = {
    id: 'test.square-tap',
    module: 'board-grip',
    label: 'Test Square Tap',
    description: 'Test drill',
    interaction: 'square-tap',
    version: 1,
    generate: () => ({
      id: 'inst-1',
      drillId: 'test.square-tap',
      prompt: 'Tap e4',
      publicData: { markedSquare: 'e4' },
      privateData: { targetSquare: 'e4' },
      fingerprint: 'fp-1',
      definitionVersion: 1
    }),
    evaluate: (privateData, response, assistance) => {
      if (assistance === 'solution' || !response) {
        return {
          score: 0,
          correct: false,
          feedback: `Gave up. Expected ${privateData.targetSquare}.`
        };
      }
      return {
        score: response === privateData.targetSquare ? 1 : 0,
        correct: response === privateData.targetSquare,
        feedback: response === privateData.targetSquare ? 'Correct' : 'Incorrect'
      };
    }
  };

  const fakeInstance: GeneratedDrill<'square-tap'> = {
    id: 'inst-1',
    drillId: 'test.square-tap',
    prompt: 'Tap e4',
    publicData: { markedSquare: 'e4' },
    privateData: { targetSquare: 'e4' },
    fingerprint: 'fp-1',
    definitionVersion: 1
  };

  it('starts in loading state and transitions to active on start()', () => {
    const runner = new DrillRunnerMachine<'square-tap'>();
    expect(runner.getState().status).toBe('loading');

    runner.start(fakeDefinition, fakeInstance);
    expect(runner.getState().status).toBe('active');
    expect(runner.getState().instance).toEqual(fakeInstance);
  });

  it('evaluates correct response and calls onRecordAttempt exactly once', async () => {
    const recordSpy = vi.fn();
    const runner = new DrillRunnerMachine<'square-tap'>({ onRecordAttempt: recordSpy });

    runner.start(fakeDefinition, fakeInstance);
    const assessment = await runner.submit('e4');

    expect(assessment?.correct).toBe(true);
    expect(runner.getState().status).toBe('feedback');
    expect(runner.getState().assessment?.correct).toBe(true);
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        drillId: 'test.square-tap',
        correct: true,
        score: 1,
        assistance: 'none'
      })
    );
  });

  it('suppresses stale async evaluations if skip or reset happens during evaluation', async () => {
    const recordSpy = vi.fn();
    let resolveEval: (val: DrillAssessment) => void = () => {};
    const slowDefinition: DrillDefinition<'square-tap'> = {
      ...fakeDefinition,
      evaluate: () => new Promise((resolve) => { resolveEval = resolve; })
    };

    const runner = new DrillRunnerMachine<'square-tap'>({ onRecordAttempt: recordSpy });
    runner.start(slowDefinition, fakeInstance);

    const pendingSubmit = runner.submit('e4');
    expect(runner.getState().status).toBe('evaluating');

    // User skips while evaluation is pending
    runner.skip();
    expect(runner.getState().status).toBe('loading');

    // Late evaluation completes
    resolveEval({ score: 1, correct: true, feedback: 'Late' });
    const res = await pendingSubmit;

    expect(res).toBeNull();
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('handles give up event with solution assistance and reveals answer', async () => {
    const recordSpy = vi.fn();
    const runner = new DrillRunnerMachine<'square-tap'>({ onRecordAttempt: recordSpy });

    runner.start(fakeDefinition, fakeInstance);
    await runner.giveUp();

    expect(runner.getState().status).toBe('feedback');
    expect(runner.getState().assistance).toBe('solution');
    expect(runner.getState().assessment?.feedback).toContain('e4');
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        correct: false,
        score: 0,
        assistance: 'solution'
      })
    );
  });

  it('handles skip event without recording failure attempt', () => {
    const recordSpy = vi.fn();
    const runner = new DrillRunnerMachine<'square-tap'>({ onRecordAttempt: recordSpy });

    runner.start(fakeDefinition, fakeInstance);
    runner.skip();

    expect(runner.getState().status).toBe('loading');
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it('supports stepwise responses while preserving one final attempt record', async () => {
    const recordSpy = vi.fn();
    const stepDefinition: StepwiseDrillDefinition<'square-tap'> = {
      ...fakeDefinition,
      id: 'test.stepwise',
      stepCount: () => 2,
      evaluateStep: (_privateData, response, stepIndex) => {
        const expected = stepIndex === 0 ? 'e4' : 'e5';
        const correct = response === expected;
        return {
          score: correct ? 1 : 0,
          correct,
          complete: stepIndex === 1,
          feedback: correct ? 'Correct step' : `Expected ${expected}`
        };
      }
    };
    const runner = new DrillRunnerMachine<'square-tap'>({ onRecordAttempt: recordSpy });
    runner.start(stepDefinition, { ...fakeInstance, drillId: 'test.stepwise' });

    const first = await runner.submitStep('e4');
    expect(first?.correct).toBe(true);
    expect(runner.getState().status).toBe('active');
    expect(runner.getState().stepIndex).toBe(1);
    expect(recordSpy).not.toHaveBeenCalled();

    const second = await runner.submitStep('e5');
    expect(second?.correct).toBe(true);
    expect(runner.getState().status).toBe('feedback');
    expect(runner.getState().stepIndex).toBe(2);
    expect(runner.getState().stepResponses).toEqual(['e4', 'e5']);
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });

  it('ends a stepwise drill immediately on an incorrect committed step', async () => {
    const recordSpy = vi.fn();
    const stepDefinition: StepwiseDrillDefinition<'square-tap'> = {
      ...fakeDefinition,
      stepCount: () => 2,
      evaluateStep: () => ({ score: 0, correct: false, complete: false, feedback: 'Incorrect' })
    };
    const runner = new DrillRunnerMachine<'square-tap'>({ onRecordAttempt: recordSpy });
    runner.start(stepDefinition, fakeInstance);

    await runner.submitStep('a1');
    expect(runner.getState().status).toBe('feedback');
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });
});
