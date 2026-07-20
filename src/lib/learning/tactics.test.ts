import { describe, expect, it } from 'vitest';
import { isValidPuzzleData, validatePuzzleMove } from './tactics';
import { makeTacticalPuzzle } from '../test/fixtures';

const knightPuzzle = makeTacticalPuzzle();

describe('tactics validation', () => {
	it('accepts the exact solved move', () => {
		expect(validatePuzzleMove(knightPuzzle, 'g8', 'f6').correct).toBe(true);
	});

	it.each([
		['d8', 'f6', 'Qf6'],
		['f7', 'f6', 'f6']
	])('rejects a legal %s%s move that only shares the destination (%s)', (from, to) => {
		expect(validatePuzzleMove(knightPuzzle, from, to).correct).toBe(false);
	});

	it('correctly validates castling SAN against coordinate input', () => {
		const castling = {
			fen: 'r1bqk2r/ppp2ppp/2np1n2/4p3/2B1P3/P1P2N2/1PP2PPP/R1BQK2R b KQkq - 0 6',
			solution: ['O-O']
		};
		expect(validatePuzzleMove(castling, 'e8', 'g8').correct).toBe(true);
	});

	it('rejects malformed puzzle data before it reaches the board', () => {
		expect(isValidPuzzleData({ id: 'bad', fen: 'not a fen', solution: ['e4'], elo: 1000, tags: [] })).toBe(false);
		expect(isValidPuzzleData({ id: 'bad', fen: knightPuzzle.fen, solution: ['Qa9'], elo: 1000, tags: [] })).toBe(false);
		expect(isValidPuzzleData({ id: 'bad', fen: knightPuzzle.fen, solution: ['Nf6', 'Qa9'], elo: 1000, tags: [] })).toBe(false);
	});

	it('fails closed instead of throwing on malformed puzzle data', () => {
		expect(validatePuzzleMove({ fen: 'not a fen', solution: ['e4'] }, 'e2', 'e4')).toEqual({
			legal: false,
			correct: false,
			expectedUci: null,
			afterFen: null
		});
	});
});
