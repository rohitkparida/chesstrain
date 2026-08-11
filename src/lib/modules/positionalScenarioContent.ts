import type { BoardAnnotation } from '../chess/annotations';

export const POSITIONAL_FEN = 'r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 3 8';
export const POSITIONAL_ANSWER_MODE = 'plan-rubric' as const;
export const POSITIONAL_OVERLAYS = [
  { label: 'Weak squares', annotations: [{ from: 'd6', color: '#ef5c5c', kind: 'highlight' as const }, { from: 'c5', color: '#ef5c5c', kind: 'highlight' as const }], detail: 'd6 is the main pressure point; c5 is a useful supporting square.' },
  { label: 'Open files', annotations: [{ from: 'd1', to: 'd8', color: '#4696eb' }], detail: 'The d-file is the clearest route for pressure against the d6 pawn.' },
  { label: 'Pawn break', annotations: [{ from: 'c4', to: 'c5', color: '#f5b041' }], detail: 'c4 is the useful break: it challenges the centre and opens routes for the pieces.' },
  { label: 'Preferred route', annotations: [{ from: 'c3', to: 'd3', color: '#49be7d' }, { from: 'd3', to: 'e4', color: '#49be7d' }, { from: 'e4', to: 'e5', color: '#49be7d' }], detail: 'The knight can reroute from c3 through d3 toward the strong e5 square.' }
] satisfies readonly { label: string; annotations: BoardAnnotation[]; detail: string }[];

export const POSITIONAL_PLANS = [
  { id: 'a', text: 'Push the queenside pawns (spatial expansion)' },
  { id: 'b', text: 'Reroute the knight to e5 via d3' },
  { id: 'c', text: 'Simplify center structure via exchanges' },
  { id: 'd', text: 'Open the f-file for the active rook' }
] as const;
