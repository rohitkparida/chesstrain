import type { DrillDefinition } from '../types';
import { DRILL_METADATA } from '../metadata';
import { makeBoardGripRound, randomBoardGripView } from '$lib/learning/boardGrip';
import { randomRealisticFen } from '$lib/learning/nameTheSquare';
import { extractTargetSquare, assessSingleSquare } from './visionHelpers';

const meta = DRILL_METADATA['vision.find-square'];

export const drill: DrillDefinition<'square-tap'> = {
  ...meta,
  version: 1,
  generate(context) {
    const previousTargetSquare = extractTargetSquare(context.previousFingerprint) ?? context.previousFingerprint;
    const fen = randomRealisticFen('', context.random);
    const round = makeBoardGripRound('find-square', fen, context.random, previousTargetSquare);
    const view = randomBoardGripView('find-square', context.random);
    const targetSquare = round.targetSquare ?? round.answers[0];

    return {
      id: `find-square-${Date.now()}-${context.random()}`,
      drillId: meta.id,
      prompt: round.prompt,
      fen,
      publicData: {
        fen,
        orientation: view.orientation,
        rotation: view.rotation
      },
      privateData: {
        targetSquare
      },
      fingerprint: `${fen}:${targetSquare}:${view.orientation}:${view.rotation}`,
      definitionVersion: 1
    };
  },
  evaluate(privateData, response, assistance) {
    return assessSingleSquare(privateData.targetSquare, response, assistance);
  }
};
