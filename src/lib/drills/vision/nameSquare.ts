import type { DrillDefinition } from '../types';
import { DRILL_METADATA } from '../metadata';
import { makeBoardGripRound, randomBoardGripView } from '$lib/learning/boardGrip';
import { randomRealisticFen } from '$lib/learning/nameTheSquare';
import { extractTargetSquare, assessSingleSquare } from './visionHelpers';

const meta = DRILL_METADATA['vision.name-square'];

export const drill: DrillDefinition<'text-entry'> = {
  ...meta,
  version: 1,
  generate(context) {
    const previousTargetSquare = extractTargetSquare(context.previousFingerprint) ?? context.previousFingerprint;
    const fen = randomRealisticFen('', context.random);
    const round = makeBoardGripRound('name-square', fen, context.random, previousTargetSquare);
    const view = randomBoardGripView('name-square', context.random);
    const targetSquare = round.targetSquare ?? round.answers[0];

    return {
      id: `name-square-${Date.now()}-${context.random()}`,
      drillId: meta.id,
      prompt: 'Name the highlighted square.',
      fen,
      publicData: {
        fen,
        orientation: view.orientation,
        rotation: view.rotation,
        markedSquare: targetSquare
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
