import { describe, expect, it } from 'vitest';
import { buildCalculationReplay } from './calculationReplay';

const startFen = 'r3kr2/5p1p/8/6N1/8/8/PPP1PPPP/3QK3 w - - 0 1';

describe('calculation replay', () => {
	it('creates a starting position and one FEN per legal move', () => {
		const replay = buildCalculationReplay(startFen, ['Nxf7'], ['Nxf7', 'Rxf7'], null);

		expect(replay.user.fens).toHaveLength(2);
		expect(replay.best.fens).toHaveLength(3);
		expect(replay.user.fens[0]).toBe(startFen);
		expect(replay.user.fens[1]).not.toBe(startFen);
	});

	it('stops a line when notation cannot be played', () => {
		const replay = buildCalculationReplay(startFen, ['Nxf7', 'not-a-move'], ['Nxf7'], 1);

		expect(replay.user.moves).toEqual(['Nxf7']);
		expect(replay.user.fens).toHaveLength(2);
		expect(replay.divergedIndex).toBe(1);
	});
});
