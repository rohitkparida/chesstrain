import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { buildBoardSquares, getLegalMoves, getTerminalState, isTerminalState } from './board';

describe('chess board helpers', () => {
	it('builds black and side-to-move orientations from the top-left visual square', () => {
		const blackToMove = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
		expect(buildBoardSquares(blackToMove, true)[0].name).toBe('h1');
		expect(buildBoardSquares(blackToMove, false)[0].name).toBe('a8');
	});

	it('returns only legal moves for a selected square', () => {
		const game = new Chess();
		expect(getLegalMoves(game, 'e2')).toContain('e4');
		expect(getLegalMoves(game, 'e2')).not.toContain('e5');
		expect(getLegalMoves(game, 'e5')).toEqual([]);
	});

	it('identifies checkmate, stalemate, and ongoing positions', () => {
		const checkmate = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
		const stalemate = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
		expect(getTerminalState(checkmate)).toBe('checkmate');
		expect(getTerminalState(stalemate)).toBe('stalemate');
		expect(getTerminalState(new Chess())).toBe('ongoing');
		expect(isTerminalState(checkmate)).toBe(true);
		expect(isTerminalState(new Chess())).toBe(false);
	});
});
