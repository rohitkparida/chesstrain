import type { DrillDefinition } from '../types';
import { DRILL_METADATA } from '../metadata';
import { generateForcedMatePuzzle } from '$lib/chess/forcedMate';

/**
 * Rapid questions need a bounded proof search. Two attacker moves
 * is the highest exhaustive tier exposed by the generator and keeps generation
 * suitable for an interactive drill (the generator owns the time bound).
 */
export const RAPID_FORCED_MATE_MAX = 2 as const;
export const RAPID_FORCED_MATE_BUDGET_MS = 2000 as const;

function clockNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

const meta = DRILL_METADATA['tactics.forced-mate'];

export const drill: DrillDefinition<'move'> = {
  ...meta,
  version: 1,
  generate(context) {
    const started = clockNow();
    const puzzle = generateForcedMatePuzzle({
      maxMateIn: RAPID_FORCED_MATE_MAX,
      random: context.random
    });
    const elapsed = clockNow() - started;
    if (!puzzle.uniqueFirstMove || puzzle.verification !== 'exhaustive') {
      throw new Error('Rapid forced-mate puzzle is not uniquely proven');
    }
    if (elapsed >= RAPID_FORCED_MATE_BUDGET_MS) {
      throw new Error('Rapid forced-mate generation exceeded its 2-second budget');
    }
    const side = puzzle.fen.includes(' b ') ? 'Black' : 'White';

    return {
      id: `forced-mate-${puzzle.id}`,
      drillId: meta.id,
      prompt: `${side} to move. Find the only move that forces mate in ${puzzle.mateIn}.`,
      fen: puzzle.fen,
      publicData: {
        fen: puzzle.fen,
        orientation: 'side-to-move'
      },
      privateData: {
        solutionUcis: [puzzle.firstMove],
        FEN: puzzle.fen
      },
      fingerprint: `${puzzle.id}:${puzzle.fen}:${puzzle.firstMove}:${puzzle.mateIn}`,
      definitionVersion: 1
    };
  },
  evaluate(privateData, response, assistance) {
    const expected = privateData.solutionUcis[0] ?? '';
    const from = expected.slice(0, 2);
    const to = expected.slice(2, 4);
    const reveal = from && to ? [{ from, to, kind: 'arrow' as const }] : [];

    if (assistance === 'solution' || !response) {
      return {
        score: 0,
        correct: false,
        feedback: `Gave up. Winning move: ${expected || 'solution unavailable'}.`,
        reveal
      };
    }

    const correct = response.uci.toLowerCase() === expected.toLowerCase();
    return {
      score: correct ? 1 : 0,
      correct,
      feedback: correct
        ? 'Correct. The move forces checkmate.'
        : `Not quite. The only winning move was ${expected || 'unavailable'}.`,
      reveal
    };
  }
};
