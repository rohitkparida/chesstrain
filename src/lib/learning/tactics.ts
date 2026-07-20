import { Chess } from 'chess.js';
import type { Puzzle } from '../../stores/session';
import { applyCoordinateMove } from '../chess/moves';

export interface MoveValidation {
	legal: boolean;
	correct: boolean;
	expectedUci: string | null;
	afterFen: string | null;
}

export function validatePuzzleMove(
	puzzle: Pick<Puzzle, 'fen' | 'solution'>,
	from: string,
	to: string
): MoveValidation {
	if (!puzzle.fen || !puzzle.solution[0]) {
		return { legal: false, correct: false, expectedUci: null, afterFen: null };
	}

	try {
		const expectedGame = new Chess(puzzle.fen);
		const expected = expectedGame.move(puzzle.solution[0]);
		const attempted = applyCoordinateMove(puzzle.fen, from, to);

		if (!expected || !attempted) {
			return { legal: false, correct: false, expectedUci: null, afterFen: null };
		}

		const expectedUci = `${expected.from}${expected.to}${expected.promotion ?? ''}`;
		const attemptedUci = `${from}${to}${attempted.move.promotion ?? ''}`;

		return {
			legal: true,
			correct: attemptedUci === expectedUci,
			expectedUci,
			afterFen: attempted.afterFen
		};
	} catch {
		return { legal: false, correct: false, expectedUci: null, afterFen: null };
	}
}

export function isValidPuzzleData(puzzle: unknown): puzzle is Puzzle {
	if (typeof puzzle !== 'object' || puzzle === null) return false;
	const candidate = puzzle as Partial<Puzzle>;
	if (
		typeof candidate.id !== 'string'
		|| typeof candidate.elo !== 'number'
		|| typeof candidate.fen !== 'string'
		|| !Array.isArray(candidate.tags)
		|| !candidate.tags.every(tag => typeof tag === 'string')
		|| !Array.isArray(candidate.solution)
		|| candidate.solution.length === 0
		|| !candidate.solution.every(move => typeof move === 'string')
	) return false;

	try {
		const game = new Chess(candidate.fen);
		return candidate.solution.every(move => game.move(move) !== null);
	} catch {
		return false;
	}
}
