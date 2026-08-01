import type { LazyDrillEntry } from './types';
import { DRILL_METADATA } from './metadata';

export const DRILLS: Record<string, LazyDrillEntry> = {
  'vision.find-square': {
    ...DRILL_METADATA['vision.find-square'],
    load: () => import('./vision/findSquare').then((m) => m.drill)
  },
  'vision.name-square': {
    ...DRILL_METADATA['vision.name-square'],
    load: () => import('./vision/nameSquare').then((m) => m.drill)
  },
  'vision.square-control': {
    ...DRILL_METADATA['vision.square-control'],
    load: () => import('./vision/squareControl').then((m) => m.drill)
  },
  'vision.loose-pieces': {
    ...DRILL_METADATA['vision.loose-pieces'],
    load: () => import('./vision/loosePieces').then((m) => m.drill)
  },
  'vision.pinned-pieces': {
    ...DRILL_METADATA['vision.pinned-pieces'],
    load: () => import('./vision/pinnedPieces').then((m) => m.drill)
  },
  'vision.safe-king-squares': {
    ...DRILL_METADATA['vision.safe-king-squares'],
    load: () => import('./vision/safeKingSquares').then((m) => m.drill)
  },
  'vision.board-memory': {
    ...DRILL_METADATA['vision.board-memory'],
    load: () => import('./vision/boardMemory').then((m) => m.drill)
  },
  'tactics.random': {
    ...DRILL_METADATA['tactics.random'],
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
