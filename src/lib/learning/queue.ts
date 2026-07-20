import type { Puzzle, SessionHistory } from '../../stores/session';
import type { SRSEntry } from '../srs/sm2';

function weaknessWeight(puzzle: Puzzle, history: SessionHistory[]): number {
	return puzzle.tags.reduce((score, tag) => {
		const tagAttempts = history.filter((attempt) => (attempt.tags ?? []).includes(tag));
		const misses = tagAttempts.filter((attempt) => attempt.result === 'incorrect').length;
		return score + misses * 40;
	}, 0);
}

export function chooseNextPuzzle(params: {
	puzzles: Puzzle[];
	userElo: number;
	currentPuzzleId?: string;
	history: SessionHistory[];
	srs: Record<string, SRSEntry>;
	now?: number;
	rebuildTag?: string;
	rebuildCount?: number;
}): Puzzle | null {
	const now = params.now ?? Date.now();
	const alternatives = params.puzzles.filter((puzzle) => puzzle.id !== params.currentPuzzleId);
	const pool = alternatives.length > 0 ? alternatives : params.puzzles;

	const rebuildActive = Boolean(params.rebuildTag) && (params.rebuildCount ?? 0) < 3;
	return [...pool].sort((a, b) => {
		const score = (puzzle: Puzzle) => {
			const schedule = params.srs[puzzle.id];
			const dueBonus = schedule && schedule.nextScheduledDate <= now ? 1000 : 0;
			const unseenBonus = schedule ? 0 : 300;
			const targetDistance = Math.abs(puzzle.elo - (params.userElo + 75));
			const rebuildBonus = rebuildActive && puzzle.tags.includes(params.rebuildTag ?? '')
				? 1800 + Math.max(0, params.userElo - puzzle.elo)
				: 0;
			const easierBonus = rebuildActive && puzzle.tags.includes(params.rebuildTag ?? '') && puzzle.elo <= params.userElo
				? 500
				: 0;
			return rebuildBonus + easierBonus + dueBonus + unseenBonus + weaknessWeight(puzzle, params.history) - targetDistance;
		};
		return score(b) - score(a) || a.id.localeCompare(b.id);
	})[0] ?? null;
}
