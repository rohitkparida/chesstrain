import type { LazyDrillEntry } from './types';

export const DRILLS: Record<string, LazyDrillEntry> = {
  'vision.find-square': {
    id: 'vision.find-square',
    module: 'board-grip',
    label: 'Find the Square',
    description: 'Tap the requested coordinate on the board.',
    interaction: 'square-tap',
    load: () => import('./vision/findSquare').then((m) => m.drill)
  },
  'vision.name-square': {
    id: 'vision.name-square',
    module: 'board-grip',
    label: 'Name the Square',
    description: 'Type the coordinate of the highlighted square.',
    interaction: 'text-entry',
    load: () => import('./vision/nameSquare').then((m) => m.drill)
  },
  'vision.square-control': {
    id: 'vision.square-control',
    module: 'board-grip',
    label: 'Square Control',
    description: 'Select all pieces controlling the marked square.',
    interaction: 'square-select',
    load: () => import('./vision/squareControl').then((m) => m.drill)
  },
  'vision.loose-pieces': {
    id: 'vision.loose-pieces',
    module: 'board-grip',
    label: 'Undefended Pieces',
    description: 'Select all undefended pieces and pawns.',
    interaction: 'square-select',
    load: () => import('./vision/loosePieces').then((m) => m.drill)
  },
  'vision.pinned-pieces': {
    id: 'vision.pinned-pieces',
    module: 'board-grip',
    label: 'Pinned Pieces',
    description: 'Select all pinned pieces.',
    interaction: 'square-select',
    load: () => import('./vision/pinnedPieces').then((m) => m.drill)
  },
  'vision.safe-king-squares': {
    id: 'vision.safe-king-squares',
    module: 'board-grip',
    label: 'Safe King Squares',
    description: 'Select every safe square adjacent to the king.',
    interaction: 'square-select',
    load: () => import('./vision/safeKingSquares').then((m) => m.drill)
  },
  'vision.board-memory': {
    id: 'vision.board-memory',
    module: 'board-grip',
    label: 'Board Memory',
    description: 'Memorize the position and reconstruct the board.',
    interaction: 'board-reconstruct',
    load: () => import('./vision/boardMemory').then((m) => m.drill)
  },
  'tactics.random': {
    id: 'tactics.random',
    module: 'tactics',
    label: 'Tactics Puzzle',
    description: 'Find the winning tactic for the position.',
    interaction: 'move',
    load: () => import('./tactics/randomTactics').then((m) => m.drill)
  }
};

export type DrillId = keyof typeof DRILLS;

export function pickRandomDrillId(
  drillIds: string[],
  previousId?: string,
  random: () => number = Math.random
): string {
  if (drillIds.length === 0) return Object.keys(DRILLS)[0];
  if (drillIds.length === 1) return drillIds[0];

  const candidates = drillIds.filter((id) => id !== previousId);
  const pool = candidates.length > 0 ? candidates : drillIds;
  const idx = Math.floor(random() * pool.length);
  return pool[idx] ?? pool[0];
}
