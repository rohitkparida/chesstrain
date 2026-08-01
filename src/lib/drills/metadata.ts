import type { TrainingModuleId } from '$lib/learning/trainingTypes';
import type { InteractionKind } from './types';

export interface DrillMeta<K extends InteractionKind = InteractionKind> {
  id: string;
  module: TrainingModuleId;
  label: string;
  description: string;
  interaction: K;
}

export const DRILL_METADATA = {
  'vision.find-square': {
    id: 'vision.find-square',
    module: 'board-grip',
    label: 'Find the Square',
    description: 'Tap the requested coordinate on the board.',
    interaction: 'square-tap'
  },
  'vision.name-square': {
    id: 'vision.name-square',
    module: 'board-grip',
    label: 'Name the Square',
    description: 'Type the coordinate of the highlighted square.',
    interaction: 'text-entry'
  },
  'vision.square-control': {
    id: 'vision.square-control',
    module: 'board-grip',
    label: 'Square Control',
    description: 'Select all pieces controlling the marked square.',
    interaction: 'square-select'
  },
  'vision.loose-pieces': {
    id: 'vision.loose-pieces',
    module: 'board-grip',
    label: 'Undefended Pieces',
    description: 'Select all undefended pieces and pawns.',
    interaction: 'square-select'
  },
  'vision.pinned-pieces': {
    id: 'vision.pinned-pieces',
    module: 'board-grip',
    label: 'Pinned Pieces',
    description: 'Select all pinned pieces.',
    interaction: 'square-select'
  },
  'vision.safe-king-squares': {
    id: 'vision.safe-king-squares',
    module: 'board-grip',
    label: 'Safe King Squares',
    description: 'Select every safe square adjacent to the king.',
    interaction: 'square-select'
  },
  'vision.board-memory': {
    id: 'vision.board-memory',
    module: 'board-grip',
    label: 'Board Memory',
    description: 'Memorize the position and reconstruct the board.',
    interaction: 'board-reconstruct'
  },
  'tactics.random': {
    id: 'tactics.random',
    module: 'tactics',
    label: 'Tactics Puzzle',
    description: 'Find the winning tactic for the position.',
    interaction: 'move'
  }
} as const satisfies Record<string, DrillMeta>;

export type DrillId = keyof typeof DRILL_METADATA;
