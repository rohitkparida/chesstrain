import { Chess } from 'chess.js';
import type { DrillDefinition } from '../types';
import { generateProceduralTacticsPuzzle } from '$lib/learning/proceduralTactics';

export function normalizeSolutionToUcis(fen: string, solution: string[]): string[] {
  const game = new Chess(fen);
  const ucis: string[] = [];

  for (const moveStr of solution) {
    try {
      const m = game.move(moveStr);
      if (m) {
        ucis.push(`${m.from}${m.to}${m.promotion ?? ''}`);
        continue;
      }
    } catch {}

    try {
      const from = moveStr.slice(0, 2);
      const to = moveStr.slice(2, 4);
      const promotion = moveStr[4];
      const m = game.move({ from, to, promotion });
      if (m) {
        ucis.push(`${m.from}${m.to}${m.promotion ?? ''}`);
        continue;
      }
    } catch {}

    break;
  }

  return ucis;
}

export const drill: DrillDefinition<'move'> = {
  id: 'tactics.random',
  module: 'tactics',
  label: 'Tactics Puzzle',
  description: 'Find the winning tactic for the position.',
  interaction: 'move',
  version: 1,
  generate(context) {
    const puzzle = generateProceduralTacticsPuzzle(context.random);
    const solutionUcis = normalizeSolutionToUcis(puzzle.fen, puzzle.solution);

    return {
      id: `tactics-${puzzle.id}-${Date.now()}`,
      drillId: 'tactics.random',
      prompt: puzzle.description ?? 'Find the best move for the position.',
      fen: puzzle.fen,
      publicData: {
        fen: puzzle.fen,
        orientation: 'side-to-move'
      },
      privateData: {
        solutionUcis,
        FEN: puzzle.fen
      },
      fingerprint: `${puzzle.id}:${puzzle.fen}`,
      definitionVersion: 1
    };
  },
  evaluate(privateData, response, assistance) {
    const expectedUci = privateData.solutionUcis[0] ?? '';
    const from = expectedUci.slice(0, 2);
    const to = expectedUci.slice(2, 4);
    const arrows = from && to ? [{ from, to, kind: 'arrow' }] : [];

    if (assistance === 'solution' || !response) {
      return Promise.resolve({
        score: 0,
        correct: false,
        feedback: `Gave up. Winning move: ${expectedUci || 'solution unavailable'}.`,
        reveal: arrows
      });
    }

    const userUci = response.uci.toLowerCase();
    const correct = expectedUci ? userUci === expectedUci.toLowerCase() : false;

    return Promise.resolve({
      score: correct ? 1 : 0,
      correct,
      feedback: correct
        ? 'Tactics solved! Excellent move.'
        : `Incorrect. The winning move was ${expectedUci}.`,
      reveal: arrows
    });
  }
};
