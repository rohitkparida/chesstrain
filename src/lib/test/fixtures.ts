import type { Puzzle } from '../../stores/session';
import type { PuzzleData } from '../chess/mockPuzzles';

const STANDARD_TACTICS_FEN =
	'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

export function makePuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
	return { id: 'fork-1', elo: 1400, tags: ['fork', 'knight'], solution: ['Nxf7'], fen: '', ...overrides };
}

export function makeTacticalPuzzle(overrides: Partial<Pick<Puzzle, 'fen' | 'solution'>> = {}): Pick<Puzzle, 'fen' | 'solution'> {
	return { fen: STANDARD_TACTICS_FEN, solution: ['Nf6'], ...overrides };
}

export function makePuzzleData(overrides: Partial<PuzzleData> = {}): PuzzleData {
	return {
		id: 'p1',
		fen: STANDARD_TACTICS_FEN,
		solution: ['Nf6'],
		elo: 1000,
		tags: ['two-knights'],
		description: 'Standard defense challenge.',
		...overrides
	};
}

export function makeQueuePuzzles(): Puzzle[] {
	return [makePuzzle({ id: 'current', elo: 1275, tags: ['pin'], solution: [] }), makePuzzle({ id: 'due', elo: 1600, tags: ['fork'], solution: [] }), makePuzzle({ id: 'target', elo: 1280, tags: ['pin'], solution: [] })];
}
