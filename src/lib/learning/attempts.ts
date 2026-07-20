import type { Puzzle } from '../../stores/session';
import { calculateEloDelta, calculateSRS, type SRSEntry } from '../srs/sm2';

export type AttemptResult = 'correct' | 'incorrect' | 'slow';

export interface AttemptOutcome {
	result: AttemptResult;
	subType: string;
	eloDelta: number;
	srs: SRSEntry;
}

export function classifyAttempt(correct: boolean, timeMs: number, slowAfterMs = 12000): AttemptResult {
	if (!correct) return 'incorrect';
	return timeMs > slowAfterMs ? 'slow' : 'correct';
}

export function primarySubType(puzzle: Pick<Puzzle, 'tags'>): string {
	return puzzle.tags[0] ?? 'general';
}

export function createAttemptOutcome(params: {
	puzzle: Puzzle;
	userElo: number;
	correct: boolean;
	timeMs: number;
	previous?: SRSEntry;
}): AttemptOutcome {
	const result = classifyAttempt(params.correct, params.timeMs);
	const quality = result === 'correct' ? 5 : result === 'slow' ? 3 : 1;
	const previous = params.previous ?? {
		puzzleId: params.puzzle.id,
		interval: 0,
		repetition: 0,
		easeFactor: 2.5,
		nextScheduledDate: 0
	};
	const next = calculateSRS(quality, previous.repetition, previous.interval, previous.easeFactor);

	return {
		result,
		subType: primarySubType(params.puzzle),
		eloDelta: calculateEloDelta(params.userElo, params.puzzle.elo, params.correct ? 1 : 0),
		srs: { puzzleId: params.puzzle.id, ...next }
	};
}
