import type { DrillDefinition } from '../types';
import { makeBoardGripRound, randomBoardGripView } from '$lib/learning/boardGrip';
import { randomRealisticFen } from '$lib/learning/nameTheSquare';

function extractTargetSquare(previousFingerprint?: string): string | undefined {
  if (!previousFingerprint) return undefined;
  if (/^[a-h][1-8]$/i.test(previousFingerprint)) {
    return previousFingerprint.toLowerCase();
  }
  const parts = previousFingerprint.split(':');
  if (parts.length > 1 && /^[a-h][1-8]$/i.test(parts[1])) {
    return parts[1].toLowerCase();
  }
  return undefined;
}

export const drill: DrillDefinition<'text-entry'> = {
  id: 'vision.name-square',
  module: 'board-grip',
  label: 'Name the Square',
  description: 'Type the coordinate of the highlighted square.',
  interaction: 'text-entry',
  version: 1,
  generate(context) {
    const previousTargetSquare = extractTargetSquare(context.previousFingerprint) ?? context.previousFingerprint;
    const fen = randomRealisticFen('', context.random);
    const round = makeBoardGripRound('name-square', fen, context.random, previousTargetSquare);
    const view = randomBoardGripView('name-square', context.random);
    const targetSquare = round.targetSquare ?? round.answers[0];

    return {
      id: `name-square-${Date.now()}-${context.random()}`,
      drillId: 'vision.name-square',
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
    if (assistance === 'solution' || !response) {
      return {
        score: 0,
        correct: false,
        feedback: `Gave up. Correct square: ${privateData.targetSquare}.`,
        reveal: privateData.targetSquare
      };
    }

    const normalizedResponse = response.trim().toLowerCase();
    const correct = normalizedResponse === privateData.targetSquare.toLowerCase();
    return {
      score: correct ? 1 : 0,
      correct,
      feedback: correct
        ? 'Correct!'
        : `Incorrect. Expected ${privateData.targetSquare}, but got ${normalizedResponse}.`,
      reveal: privateData.targetSquare
    };
  }
};
