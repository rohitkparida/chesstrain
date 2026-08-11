import { Chess } from 'chess.js';

export type CalculationStatus = 'empty' | 'partial' | 'correct' | 'incorrect';

export interface CalculationAssessment {
	status: CalculationStatus;
	userSteps: string[];
	divergedIndex: number | null;
	matchedMoves: number;
	score: number | null;
	revealSolution: boolean;
	feedback: string;
}

/** Validate that a curated calculation line is a complete legal continuation. */
export function isLegalCalculationLine(startFen: string, solution: readonly string[]): boolean {
	if (!startFen || solution.length === 0) return false;
	try {
		const game = new Chess(startFen);
		return solution.every((notation) => Boolean(game.move(notation)));
	} catch {
		return false;
	}
}

export function assessCalculation(input: string, solution: string[]): CalculationAssessment {
	const userSteps = input.trim().split(/\s+/).filter(Boolean);
	if (userSteps.length === 0) {
		return {
			status: 'empty',
			userSteps,
			divergedIndex: null,
			matchedMoves: 0,
			score: null,
			revealSolution: false,
			feedback: 'Enter a complete line before verifying.'
		};
	}

	const divergedIndex = userSteps.findIndex(
		(move, index) => !solution[index] || move.toLowerCase() !== solution[index].toLowerCase()
	);

	if (divergedIndex >= 0) {
		return {
			status: 'incorrect',
			userSteps,
			divergedIndex,
			matchedMoves: divergedIndex,
			score: Math.round((divergedIndex / solution.length) * 100),
			revealSolution: true,
			feedback: `Calculation diverged at move ${divergedIndex + 1}. Review the line, then reset to retry.`
		};
	}

	if (userSteps.length === solution.length) {
		return {
			status: 'correct',
			userSteps,
			divergedIndex: null,
			matchedMoves: solution.length,
			score: 100,
			revealSolution: true,
			feedback: 'Calculation matches the full line.'
		};
	}

	return {
		status: 'partial',
		userSteps,
		divergedIndex: null,
		matchedMoves: userSteps.length,
		score: null,
		revealSolution: false,
		feedback: 'The line is correct so far but incomplete. Keep calculating before review.'
	};
}
