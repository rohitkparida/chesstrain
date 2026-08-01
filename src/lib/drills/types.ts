import type { TrainingModuleId } from '$lib/learning/trainingTypes';
import type { BoardRotation } from '$lib/chess/board';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SquareOrientation = 'white' | 'black' | 'side-to-move';
export type AssistanceLevel = 'none' | 'solution';

export interface SquareBoardData {
  fen?: string;
  orientation?: SquareOrientation;
  rotation?: BoardRotation;
  markedSquare?: string;
  allowNone?: boolean;
}

export type SquareTapData = SquareBoardData;
export type SquareSelectData = SquareBoardData;

export interface MoveData {
  fen: string;
  orientation?: SquareOrientation;
  turn?: 'w' | 'b';
  lastMove?: { from: string; to: string };
}

export interface MoveResponse {
  from: string;
  to: string;
  promotion?: string;
  uci: string;
}

export interface InteractionContracts {
  'square-tap': {
    public: SquareTapData;
    private: { targetSquare: string };
    response: string;
  };
  'square-select': {
    public: SquareSelectData;
    private: { targetSquares: string[] };
    response: string[];
  };
  'text-entry': {
    public: SquareBoardData;
    private: { targetSquare: string };
    response: string;
  };
  'move': {
    public: MoveData;
    private: { solutionUcis: string[]; FEN: string };
    response: MoveResponse;
  };
}

export type InteractionKind = keyof InteractionContracts;

export interface DrillAssessment {
  score: number;
  correct: boolean;
  feedback: string;
  reveal?: JsonValue;
}

export interface DrillContext {
  userId: string;
  difficulty: number;
  previousFingerprint?: string;
  random: () => number;
}

export interface GeneratedDrill<K extends keyof InteractionContracts = keyof InteractionContracts> {
  id: string;
  drillId: string;
  prompt: string;
  fen?: string;
  publicData: InteractionContracts[K]['public'];
  privateData: InteractionContracts[K]['private'];
  fingerprint: string;
  definitionVersion: number;
}

export interface DrillDefinition<K extends keyof InteractionContracts = keyof InteractionContracts> {
  id: string;
  module: TrainingModuleId;
  label: string;
  description: string;
  interaction: K;
  version: number;
  generate(context: DrillContext): GeneratedDrill<K> | Promise<GeneratedDrill<K>>;
  evaluate(
    privateData: InteractionContracts[K]['private'],
    response: InteractionContracts[K]['response'] | null,
    assistance?: AssistanceLevel
  ): DrillAssessment | Promise<DrillAssessment>;
}

export interface LazyDrillEntry<K extends keyof InteractionContracts = keyof InteractionContracts> {
  id: string;
  module: TrainingModuleId;
  label: string;
  description: string;
  interaction: K;
  load: () => Promise<DrillDefinition<K>>;
}

const KEY_TARGET_PHRASES = [
  'safe king squares',
  'undefended black',
  'undefended white',
  'undefended',
  'pinned',
  'black',
  'white',
  'move sequence',
  'position',
  'plan'
];

export function extractKeywordsFromPrompt(prompt: string): string[] {
  if (!prompt) return [];
  const lower = prompt.toLowerCase();
  const keywords: string[] = [];

  for (const phrase of KEY_TARGET_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      keywords.push(phrase);
    }
  }

  const coords = prompt.match(/[a-h][1-8]/gi);
  if (coords) {
    keywords.push(...coords);
  }

  return Array.from(new Set(keywords));
}

