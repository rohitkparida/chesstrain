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

const queenEndgameFen = '8/8/8/8/8/4K3/4Q3/7k w - - 0 1';
const rookEndgameFen = '8/8/8/8/8/2K5/8/6kR w - - 0 1';
const pawnEndgameFen = '8/8/8/4k3/8/3K4/4P3/8 w - - 0 1';

export const ENDGAME_SCENARIOS: readonly EndgameScenario[] = [
	{
		id: 'endgame-queen-box', module: 'endgame', type: 'endgame', estimatedSeconds: 120,
		title: 'Queen and king coordination', fen: queenEndgameFen, goal: 'Turn the win into a win without causing stalemate.',
		perspective: 'w', theoreticalResult: 'win', preservingMoves: ['e3d4', 'e3f4', 'e2h2'],
		cues: [{ label: 'Keep the box', copy: 'Use a legal queen move to keep the king boxed in, then bring your king closer.', annotations: [{ from: 'e2', to: 'h2', kind: 'arrow', label: 'Legal queen cue' }] }],
	},
	{
		id: 'endgame-rook-king', module: 'endgame', type: 'endgame', estimatedSeconds: 120,
		title: 'Rook and king technique', fen: rookEndgameFen, goal: 'Coordinate the king and rook to keep the win.',
		perspective: 'w', theoreticalResult: 'win', preservingMoves: ['c3d4', 'c3b4', 'h1h2'],
		cues: [{ label: 'Cut off the king', copy: 'The rook cue is a legal move, not a guessed geometric route.', annotations: [{ from: 'h1', to: 'h2', kind: 'arrow', label: 'Legal rook cue' }] }],
	},
	{
		id: 'endgame-pawn-race', module: 'endgame', type: 'endgame', estimatedSeconds: 120,
		title: 'Pawn race', fen: pawnEndgameFen, goal: 'Keep the winning result while calculating the race.',
		perspective: 'w', theoreticalResult: 'win', preservingMoves: ['d3e3', 'e2e4'],
		cues: [{ label: 'Check the race', copy: 'Advance only when the resulting pawn race remains legal and winning.', annotations: [{ from: 'e2', to: 'e4', kind: 'arrow', label: 'Legal pawn cue' }] }],
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
