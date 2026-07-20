import type { PuzzleData } from '$lib/chess/mockPuzzles';

export type TacticsFeedbackType = 'correct' | 'wrong' | '';

export interface TacticsAttemptState {
	feedback: string;
	feedbackType: TacticsFeedbackType;
	coachText: string;
	coachLoading: boolean;
	eloDelta: number | null;
	attempted: boolean;
	inputNotice: string;
	attemptTimeMs: number | null;
	cpLoss: number | null;
	attemptedMove: string;
	attemptedFen: string;
	reflectionOpen: boolean;
	reflectionSeconds: number;
}

export function puzzleTag(puzzle: PuzzleData): string {
	return puzzle.tags[0] ?? 'general';
}

export function initialAttemptState(): TacticsAttemptState {
	return {
		feedback: '',
		feedbackType: '',
		coachText: '',
		coachLoading: false,
		eloDelta: null,
		attempted: false,
		inputNotice: '',
		attemptTimeMs: null,
		cpLoss: null,
		attemptedMove: '',
		attemptedFen: '',
		reflectionOpen: false,
		reflectionSeconds: 0
	};
}

export function attemptResultState(
	correct: boolean,
	attemptTimeMs: number,
	attemptedMove: string,
	attemptedFen: string
): TacticsAttemptState {
	return {
		...initialAttemptState(),
		feedback: correct ? 'Correct!' : 'Not quite. Take a moment to identify what changed.',
		feedbackType: correct ? 'correct' : 'wrong',
		coachLoading: !correct,
		attempted: true,
		attemptTimeMs,
		attemptedMove,
		attemptedFen,
		reflectionOpen: correct,
		reflectionSeconds: correct ? 0 : 30
	};
}

export function nextPuzzleState(): TacticsAttemptState {
	return initialAttemptState();
}

export function isPuzzleInteractable(attempted: boolean, advancing: boolean): boolean {
	return !attempted && !advancing;
}
