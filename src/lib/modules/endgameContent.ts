import { Chess, type Square } from 'chess.js';
import { getTerminalState, type TerminalState } from '../chess/board';
import type { BoardAnnotation } from '../chess/annotations';
import type { EndgameExercise } from '../learning/trainingTypes';

export type TheoreticalResult = 'win' | 'draw' | 'loss';

export interface EndgameCue {
	label: string;
	copy: string;
	annotations: readonly BoardAnnotation[];
}

export interface EndgameScenario extends EndgameExercise {
	perspective: 'w' | 'b';
	theoreticalResult: TheoreticalResult;
	preservingMoves: readonly string[];
	cues: readonly EndgameCue[];
}

export interface EndgameResultScore {
	result: TheoreticalResult;
	preserved: boolean;
	score: number;
}

const lucenaFen = '1R6/3P1k2/8/8/8/8/2K5/r7 w - - 0 1';
const philidorFen = '8/8/4R3/3r4/8/8/3k4/1K6 b - - 0 1';
const pawnOppositionFen = '8/8/8/4k3/8/3K4/4P3/8 w - - 0 1';
const queenEndgameFen = '8/8/8/8/8/4K3/4Q3/7k w - - 0 1';

export const ENDGAME_SCENARIOS: readonly EndgameScenario[] = [
	{
		id: 'endgame-lucena-bridge', module: 'endgame', type: 'endgame', estimatedSeconds: 120,
		title: 'Lucena Position (Building the Bridge)', fen: lucenaFen, goal: 'Build the bridge with your rook to promote the d-pawn.',
		perspective: 'w', theoreticalResult: 'win', preservingMoves: ['b8e8+', 'c2d3', 'b8b4'],
		cues: [{ label: 'Check the king away', copy: 'Use the rook check to force the enemy king to the side, then build the 4th rank bridge.', annotations: [{ from: 'b8', to: 'e8', kind: 'arrow', label: 'Rook check to side' }] }],
	},
	{
		id: 'endgame-philidor-defense', module: 'endgame', type: 'endgame', estimatedSeconds: 120,
		title: 'Philidor Position (3rd Rank Cut-off)', fen: philidorFen, goal: 'Hold the 3rd rank with your rook to guarantee the draw.',
		perspective: 'b', theoreticalResult: 'draw', preservingMoves: ['d5d6', 'd5b5', 'd2e3'],
		cues: [{ label: 'Keep 3rd rank barrier', copy: 'Keep the rook on the 3rd rank to cut off the enemy king until the pawn advances to the 6th rank.', annotations: [{ from: 'd5', to: 'b5', kind: 'arrow', label: 'Rook barrier' }] }],
	},
	{
		id: 'endgame-pawn-opposition', module: 'endgame', type: 'endgame', estimatedSeconds: 120,
		title: 'King Opposition & Key Squares', fen: pawnOppositionFen, goal: 'Take the opposition with your king to escort the pawn.',
		perspective: 'w', theoreticalResult: 'win', preservingMoves: ['d3e3', 'e2e4'],
		cues: [{ label: 'Take opposition', copy: 'Step your king directly opposite the enemy king before advancing the pawn.', annotations: [{ from: 'd3', to: 'e3', kind: 'arrow', label: 'Take opposition' }] }],
	},
	{
		id: 'endgame-queen-box', module: 'endgame', type: 'endgame', estimatedSeconds: 120,
		title: 'Queen & King Mating Technique', fen: queenEndgameFen, goal: 'Turn the win into a win without causing stalemate.',
		perspective: 'w', theoreticalResult: 'win', preservingMoves: ['e3d4', 'e3f4', 'e2h2'],
		cues: [{ label: 'Keep the box', copy: 'Use a legal queen move to keep the king boxed in, then bring your king closer.', annotations: [{ from: 'e2', to: 'h2', kind: 'arrow', label: 'Legal queen cue' }] }],
	},
];

export function terminalStateForFen(fen: string): TerminalState {
	return getTerminalState(new Chess(fen));
}

export function resultForTerminalState(state: TerminalState, turn: 'w' | 'b', perspective: 'w' | 'b'): TheoreticalResult | null {
	if (state === 'stalemate' || state === 'draw') return 'draw';
	if (state !== 'checkmate') return null;
	return turn === perspective ? 'loss' : 'win';
}

export function legalCueAnnotations(fen: string, annotations: readonly BoardAnnotation[]): BoardAnnotation[] {
	const game = new Chess(fen);
	return annotations.filter((annotation) => {
		if (annotation.kind === 'highlight' || !annotation.to) return game.get(annotation.from as Square) !== null;
		return game.moves({ square: annotation.from as Square, verbose: true })
			.some((move) => move.to === annotation.to);
	});
}

export function scoreResultPreservation(expected: TheoreticalResult, observed: TheoreticalResult): number {
	return expected === observed ? 1 : 0;
}

export function scoreEndgameResult(expected: TheoreticalResult, observed: TheoreticalResult): EndgameResultScore {
	return { result: observed, preserved: expected === observed, score: scoreResultPreservation(expected, observed) };
}
