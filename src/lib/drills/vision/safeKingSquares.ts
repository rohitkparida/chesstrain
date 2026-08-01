import type { DrillDefinition } from '../types';
import { safeKingSquaresInfoFromFen, randomBoardGripView } from '$lib/learning/boardGrip';
import { randomRealisticFen } from '$lib/learning/nameTheSquare';
import { assessSquareSelection } from './visionHelpers';
import type { Color } from 'chess.js';

export const drill: DrillDefinition<'square-select'> = {
  id: 'vision.safe-king-squares',
  module: 'board-grip',
  label: 'Safe King Squares',
  description: 'Select every safe square adjacent to the king.',
  interaction: 'square-select',
  version: 1,
  generate(context) {
    const wantUnsafe = context.random() >= 0.10; // 90% unsafe, 10% safe
    
    const candidates: Array<{ fen: string; answers: string[]; color: Color; unsafeCount: number }> = [];
    let fen = randomRealisticFen('', context.random);

    for (let i = 0; i < 25; i += 1) {
      const info = safeKingSquaresInfoFromFen(fen);
      const isUnsafe = info.unsafeCount > 0;
      if (wantUnsafe === isUnsafe) {
        candidates.push({ fen, answers: info.squares, color: info.color, unsafeCount: info.unsafeCount });
      }
      fen = randomRealisticFen(fen, context.random);
    }

    let selected: { fen: string; answers: string[]; color: Color; unsafeCount: number } | undefined;
    if (candidates.length > 0) {
      if (wantUnsafe) {
        // Group by unsafeCount to ensure equal likelihood across different unsafe counts (1, 2, 3, etc.)
        const countGroups = new Map<number, typeof candidates>();
        for (const c of candidates) {
          const list = countGroups.get(c.unsafeCount) ?? [];
          list.push(c);
          countGroups.set(c.unsafeCount, list);
        }
        const availableCounts = Array.from(countGroups.keys());
        const chosenCount = availableCounts[Math.floor(context.random() * availableCounts.length)];
        const group = countGroups.get(chosenCount)!;
        selected = group[Math.floor(context.random() * group.length)];
      } else {
        selected = candidates[Math.floor(context.random() * candidates.length)];
      }
    }

    if (!selected) {
      const fallbackInfo = safeKingSquaresInfoFromFen(fen);
      selected = { fen, answers: fallbackInfo.squares, color: fallbackInfo.color, unsafeCount: fallbackInfo.unsafeCount };
    }

    const view = randomBoardGripView('loose-pieces', context.random);
    const colorName = selected.color === 'w' ? 'White' : 'Black';

    return {
      id: `safe-king-squares-${Date.now()}-${context.random()}`,
      drillId: 'vision.safe-king-squares',
      prompt: `Select all safe squares adjacent to the ${colorName} king.`,
      fen: selected.fen,
      publicData: {
        fen: selected.fen,
        orientation: view.orientation,
        rotation: view.rotation,
        allowNone: true
      },
      privateData: {
        targetSquares: selected.answers
      },
      fingerprint: `${selected.fen}:${selected.color}:${selected.answers.join(',')}`,
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
