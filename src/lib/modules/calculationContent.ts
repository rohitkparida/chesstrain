import type { BoardAnnotation } from '../chess/annotations';
import type { CalculationExercise } from '../learning/trainingTypes';

export interface CalculationExerciseContent extends CalculationExercise {
	fen: string;
	solution: readonly string[];
	acceptedLines?: readonly (readonly string[])[];
	concept: string;
	visualAnnotations: readonly BoardAnnotation[];
}

export const CALCULATION_EXERCISES: readonly CalculationExerciseContent[] = [
	{
		id: 'calculation-open-centre', module: 'calculation', type: 'calculation', title: 'Open the centre',
		estimatedSeconds: 45, difficulty: 1100, concept: 'Develop with tempo and claim the open file.',
		fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
		solution: ['e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
		acceptedLines: [['e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']],
		visualAnnotations: [{ from: 'f1', to: 'b5', color: '#49be7d', label: 'Develop with tempo' }],
		tags: ['development', 'open-centre']
	},
	{
		id: 'calculation-italian-pressure', module: 'calculation', type: 'calculation', title: 'Build pressure',
		estimatedSeconds: 50, difficulty: 1250, concept: 'Complete development before choosing a plan.',
		fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
		solution: ['d3', 'd6', 'O-O', 'O-O', 'Re1'],
		acceptedLines: [['O-O', 'O-O', 'd3', 'd6', 'Re1']],
		visualAnnotations: [{ from: 'e1', to: 'g1', color: '#49be7d', label: 'Secure the king' }],
		tags: ['development', 'king-safety']
	},
	{
		id: 'calculation-ruy-lopez', module: 'calculation', type: 'calculation', title: 'Keep the initiative',
		estimatedSeconds: 55, difficulty: 1350, concept: 'Maintain central tension while improving the worst piece.',
		fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
		solution: ['Bb5', 'O-O', 'O-O', 'Re1', 'd6'],
		acceptedLines: [['d3', 'd6', 'O-O', 'O-O', 'Re1']],
		visualAnnotations: [{ from: 'f1', to: 'b5', color: '#49be7d', label: 'Keep pressure on the centre' }],
		tags: ['initiative', 'calculation']
	}
];
