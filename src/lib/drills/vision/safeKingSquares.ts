import type { DrillDefinition } from '../types';
import { safeKingSquaresFromFen, randomBoardGripView } from '$lib/learning/boardGrip';
import { assessSquareSelection, sampleSquareSelectionRound } from './visionHelpers';

export const drill: DrillDefinition<'square-select'> = {
  id: 'vision.safe-king-squares',
  module: 'board-grip',
  label: 'Safe King Squares',
  description: 'Select every safe square adjacent to the king.',
  interaction: 'square-select',
  version: 1,
  generate(context) {
    const round = sampleSquareSelectionRound(context, (fen) => {
      const info = safeKingSquaresFromFen(fen);
      return { fen, answers: info.squares, color: info.color };
    });

    const view = randomBoardGripView('loose-pieces', context.random);
    const colorName = round.color === 'w' ? 'White' : 'Black';

    return {
      id: `safe-king-squares-${Date.now()}-${context.random()}`,
      drillId: 'vision.safe-king-squares',
      prompt: `Select all safe squares adjacent to the ${colorName} king.`,
      fen: round.fen,
      publicData: {
        fen: round.fen,
        orientation: view.orientation,
        rotation: view.rotation,
        allowNone: true
      },
      privateData: {
        targetSquares: round.answers
      },
      fingerprint: `${round.fen}:${round.color}:${round.answers.join(',')}`,
      definitionVersion: 1
    };
  },
  evaluate(privateData, response, assistance) {
    return Promise.resolve(
      assessSquareSelection(privateData.targetSquares, response, assistance, {
        correct: 'Correct!',
        noneExpected: 'Incorrect. There were no safe squares for the king.',
        expectedPrefix: 'Incorrect. Safe squares were'
      })
    );
  }
};
