import type { PageLoad } from './$types';
import { mockPuzzles, type PuzzleData } from '$lib/chess/mockPuzzles';
import { isValidPuzzleData } from '$lib/learning/tactics';

export interface TacticsPageData {
	puzzles: PuzzleData[];
}

export const load: PageLoad = async ({ fetch }): Promise<TacticsPageData> => {
	try {
		const response = await fetch('/puzzles.json');
		if (!response.ok) return { puzzles: mockPuzzles };

		const data: unknown = await response.json();
		const puzzles = Array.isArray(data)
			? data.filter(isValidPuzzleData).filter((puzzle): puzzle is PuzzleData => typeof puzzle.fen === 'string')
			: [];
		return { puzzles: puzzles.length > 0 ? puzzles : mockPuzzles };
	} catch {
		return { puzzles: mockPuzzles };
	}
};
