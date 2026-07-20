import type { BoardAnnotation } from '../chess/annotations';
import type { PositionalExercise } from '../learning/trainingTypes';

export interface PositionalChoice {
	id: string;
	label: string;
}

export interface EvaluationBand {
	id: string;
	label: string;
}

export interface PositionalExerciseContent extends PositionalExercise {
	fen: string;
	prompt: string;
	evaluationBands: readonly EvaluationBand[];
	correctEvaluationBand: string;
	weakSquareOptions: readonly PositionalChoice[];
	correctWeakSquares: readonly string[];
	pawnBreakOptions: readonly PositionalChoice[];
	correctPawnBreak: string;
	plans: readonly PositionalChoice[];
	preferredPlanOrder: readonly string[];
	explanation: string;
	annotations: readonly BoardAnnotation[];
}

const standardBands: readonly EvaluationBand[] = [
	{ id: 'black-better', label: 'Black is clearly better (about -1.5 or lower)' },
	{ id: 'black-edge', label: 'Black has a small edge (about -0.5 to -1.0)' },
	{ id: 'equal', label: 'The position is approximately equal' },
	{ id: 'white-edge', label: 'White has a small edge (about +0.5)' },
	{ id: 'white-better', label: 'White is clearly better (about +1.5 or higher)' }
];

export const POSITIONAL_EXERCISES: readonly PositionalExerciseContent[] = [
	{
		id: 'positional-d6-pressure', module: 'positional', type: 'positional', title: 'Find the pressure point',
		estimatedSeconds: 60, difficulty: 1150,
		fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 3 8',
		prompt: 'Choose the evaluation band, the weak square, the useful break, and rank the plans.',
		planOptions: ['Reroute the knight toward e5', 'Play c4 to challenge the centre', 'Trade the active bishop', 'Expand with a queenside pawn push'],
		evaluationBands: standardBands, correctEvaluationBand: 'white-edge',
		weakSquareOptions: [{ id: 'd6', label: 'd6' }, { id: 'c5', label: 'c5' }, { id: 'e5', label: 'e5' }, { id: 'f6', label: 'f6' }],
		correctWeakSquares: ['d6'],
		pawnBreakOptions: [{ id: 'c4', label: 'c4' }, { id: 'f4', label: 'f4' }, { id: 'g4', label: 'g4' }, { id: 'b4', label: 'b4' }],
		correctPawnBreak: 'c4',
		plans: [{ id: 'a', label: 'Reroute the knight toward e5' }, { id: 'b', label: 'Play c4 to challenge the centre' }, { id: 'c', label: 'Trade the active bishop' }, { id: 'd', label: 'Expand with a queenside pawn push' }],
		preferredPlanOrder: ['a', 'b', 'c', 'd'],
		explanation: 'White has a small edge because d6 is a durable target. c4 makes the pressure easier to use, then the knight can reroute toward e5.',
		annotations: [
			{ from: 'd6', color: '#ef5c5c', label: 'Weak square and target', kind: 'highlight' },
			{ from: 'c3', to: 'd3', color: '#49be7d', label: 'Knight reroute' },
			{ from: 'c4', to: 'c5', color: '#f5b041', label: 'Useful pawn break' }
		]
	},
	{
		id: 'positional-italian-king', module: 'positional', type: 'positional', title: 'Balance king safety and activity',
		estimatedSeconds: 60, difficulty: 1250,
		fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
		prompt: 'Identify the strategic priority before the position becomes tactical.',
		planOptions: ['Castle and connect the rooks', 'Push f4 immediately', 'Hunt the bishop with a3', 'Exchange queens'],
		evaluationBands: standardBands, correctEvaluationBand: 'equal',
		weakSquareOptions: [{ id: 'd5', label: 'd5' }, { id: 'f7', label: 'f7' }, { id: 'e5', label: 'e5' }, { id: 'c6', label: 'c6' }],
		correctWeakSquares: ['f7'],
		pawnBreakOptions: [{ id: 'd3', label: 'd3' }, { id: 'f4', label: 'f4' }, { id: 'c3', label: 'c3' }, { id: 'h4', label: 'h4' }],
		correctPawnBreak: 'd3',
		plans: [{ id: 'a', label: 'Castle and connect the rooks' }, { id: 'b', label: 'Develop the queen early' }, { id: 'c', label: 'Push f4 immediately' }, { id: 'd', label: 'Trade the active bishop' }],
		preferredPlanOrder: ['a', 'b', 'c', 'd'],
		explanation: 'The position is close to equal. Both sides should finish development; the f7 point is a target, not a reason to neglect king safety.',
		annotations: [{ from: 'e1', to: 'g1', color: '#49be7d', label: 'Castle first' }, { from: 'f7', color: '#ef5c5c', label: 'Pressure point', kind: 'highlight' }]
	},
	{
		id: 'positional-space-break', module: 'positional', type: 'positional', title: 'Choose the right break',
		estimatedSeconds: 65, difficulty: 1350,
		fen: 'r1bq1rk1/ppp2ppp/2np1n2/8/2BPP3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
		prompt: 'A space advantage only matters when you choose the break that opens useful lines.',
		planOptions: ['Play e5 and gain space', 'Exchange the dark-squared bishop', 'Start a flank pawn storm', 'Simplify into an endgame'],
		evaluationBands: standardBands, correctEvaluationBand: 'white-edge',
		weakSquareOptions: [{ id: 'd5', label: 'd5' }, { id: 'e5', label: 'e5' }, { id: 'c5', label: 'c5' }, { id: 'f5', label: 'f5' }],
		correctWeakSquares: ['d5'],
		pawnBreakOptions: [{ id: 'e5', label: 'e5' }, { id: 'f4', label: 'f4' }, { id: 'b4', label: 'b4' }, { id: 'g4', label: 'g4' }],
		correctPawnBreak: 'e5',
		plans: [{ id: 'a', label: 'Play e5 and gain space' }, { id: 'b', label: 'Improve the c3 knight' }, { id: 'c', label: 'Exchange the dark-squared bishop' }, { id: 'd', label: 'Start a flank pawn storm' }],
		preferredPlanOrder: ['a', 'b', 'c', 'd'],
		explanation: 'White has a small edge from the central space. e5 fixes the central structure and gives the pieces more useful squares.',
		annotations: [{ from: 'e4', to: 'e5', color: '#f5b041', label: 'Critical pawn break' }, { from: 'd5', color: '#ef5c5c', label: 'Weak square', kind: 'highlight' }]
	}
];
