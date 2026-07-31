import type { DrillDefinition } from '../types';
import { makeBoardGripRound, randomBoardGripView } from '$lib/learning/boardGrip';
import { randomRealisticFen } from '$lib/learning/nameTheSquare';

export const drill: DrillDefinition<'square-tap'> = {
  id: 'vision.find-square',
  module: 'board-grip',
  label: 'Find the Square',
  description: 'Tap the requested coordinate on the board.',
  interaction: 'square-tap',
  version: 1,
  generate(context) {
    const fen = randomRealisticFen('', context.random);
    const round = makeBoardGripRound('find-square', fen, context.random);
    const view = randomBoardGripView('find-square', context.random);
    const targetSquare = round.targetSquare ?? round.answers[0];

    return {
      id: `find-square-${Date.now()}-${context.random()}`,
      drillId: 'vision.find-square',
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
    if (assistance === 'solution' || !response) {
      return {
        score: 0,
        correct: false,
        feedback: `Gave up. Correct square: ${privateData.targetSquare}.`,
        reveal: privateData.targetSquare
      };
    }

    const correct = response === privateData.targetSquare;
    return {
      score: correct ? 1 : 0,
      correct,
      feedback: correct
        ? 'Correct!'
        : `Incorrect. Expected ${privateData.targetSquare}, but got ${response}.`,
      reveal: privateData.targetSquare
    };
  }
};
