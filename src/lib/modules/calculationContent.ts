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
		id: 'calculation-fork-tactic',
		module: 'calculation',
		type: 'calculation',
		title: 'Royal Knight Fork',
		estimatedSeconds: 45,
		difficulty: 1200,
		concept: 'Calculate the forced knight fork winning the queen.',
		fen: 'r1b2rk1/ppp3pp/8/3B4/3Q1n2/8/PPP2PPP/R4RK1 b - - 0 1',
		solution: ['Ne2+', 'Kh1', 'Nxd4'],
		acceptedLines: [['Ne2+', 'Kh1', 'Nxd4']],
		visualAnnotations: [{ from: 'f4', to: 'e2', color: '#49be7d', label: 'Forced knight fork' }],
		tags: ['tactics', 'fork', 'calculation']
	},
	{
		id: 'calculation-back-rank-strike',
		module: 'calculation',
		type: 'calculation',
		title: 'Back Rank Deflection',
		estimatedSeconds: 50,
		difficulty: 1300,
		concept: 'Calculate the forced line deflecting the defender of the back rank.',
		fen: '3r2k1/5ppp/8/8/8/8/3R1PPP/6K1 w - - 0 1',
		solution: ['Rxd8#'],
		acceptedLines: [['Rxd8#']],
		visualAnnotations: [{ from: 'd2', to: 'd8', color: '#49be7d', label: 'Back rank mate' }],
		tags: ['tactics', 'back-rank', 'checkmate']
	},
	{
		id: 'calculation-pin-exploitation',
		module: 'calculation',
		type: 'calculation',
		title: 'Exploit the Absolute Pin',
		estimatedSeconds: 55,
		difficulty: 1350,
		concept: 'Calculate the attack on the pinned piece defending the king.',
		fen: 'r1b1k2r/pppp1ppp/8/4q3/1bP5/2N1P3/PP3PPP/R2QKB1R w KQkq - 0 10',
		solution: ['Qb3', 'Bxc3+', 'bxc3'],
		acceptedLines: [['Qb3', 'Bxc3+', 'bxc3']],
		visualAnnotations: [{ from: 'b3', to: 'b4', color: '#49be7d', label: 'Target the pinned bishop' }],
		tags: ['tactics', 'pin', 'calculation']
	}
];
