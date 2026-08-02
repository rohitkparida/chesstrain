import { Chess } from 'chess.js';
import type { DrillDefinition } from '../types';
import { DRILL_METADATA } from '../metadata';
import { generateProceduralTacticsPuzzle, type ProceduralPuzzle } from '$lib/learning/proceduralTactics';

const meta = DRILL_METADATA['tactics.random'];

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
  ...meta,
  version: 1,
  generate(context) {
    const puzzle = generateProceduralTacticsPuzzle(context.random);
    const solutionUcis = normalizeSolutionToUcis(puzzle.fen, puzzle.solution);

    const isBlack = puzzle.fen.includes(' b ');
    const sideText = isBlack ? 'Black' : 'White';

    return {
      id: `tactics-${puzzle.id}-${Date.now()}`,
      drillId: meta.id,
      prompt: `Find the best move for ${sideText}.`,
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
    const solutionUcis = privateData.solutionUcis ?? [];
    const expectedUserMoves = solutionUcis.filter((_, idx) => idx % 2 === 0);
    const expectedFirstUci = expectedUserMoves[0] ?? solutionUcis[0] ?? '';

    const from = expectedFirstUci.slice(0, 2);
    const to = expectedFirstUci.slice(2, 4);
    const arrows = from && to ? [{ from, to, kind: 'arrow' as const }] : [];

    if (assistance === 'solution' || !response) {
      return Promise.resolve({
        score: 0,
        correct: false,
        feedback: `Gave up. Winning move: ${expectedFirstUci || 'solution unavailable'}.`,
        reveal: arrows
      });
    }

    const userUci = response.uci ? response.uci.toLowerCase() : '';
    const userMoves = (response as { userMoves?: string[] }).userMoves;

    let correct = false;
    if (userMoves && Array.isArray(userMoves) && userMoves.length > 0) {
      correct =
        userMoves.length === expectedUserMoves.length &&
        userMoves.every((m, i) => m.toLowerCase() === (expectedUserMoves[i] ?? '').toLowerCase());
    } else {
      correct = expectedFirstUci ? userUci === expectedFirstUci.toLowerCase() : false;
    }

    return Promise.resolve({
      score: correct ? 1 : 0,
      correct,
      feedback: correct
        ? 'Tactics solved! Excellent move.'
        : `Not quite. The winning move was ${expectedFirstUci}.`,
      reveal: arrows
    });
  }
};
