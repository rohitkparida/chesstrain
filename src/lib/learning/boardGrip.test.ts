import { Chess, type Square } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
	attackerSquaresFromFen,
	loosePieceSquaresFromFen,
	makeBoardGripRound,
	nextBoardGripRound,
	pinnedPieceSquaresFromFen,
	randomBoardGripView
} from './boardGrip';

function fenAfter(moves: string[]) {
	const game = new Chess();
	for (const move of moves) game.move(move);
	return game.fen();
}

describe('board grip helpers', () => {
	it('finds every attacker of a square from both sides', () => {
		const fen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);

		expect(attackerSquaresFromFen(fen, 'e5')).toEqual(expect.arrayContaining(['c6', 'f3']));
	});

	it('can produce a true no-answer attacker round', () => {
		const round = makeBoardGripRound('attackers', new Chess().fen(), () => 0.5);

		expect(round.prompt).toContain('controlling');
		expect(new Chess(round.fen).get(round.targetSquare! as Square)).toBeUndefined();
		expect(round.answers).toEqual([]);
	});

	it('uses the same canonical square in the name-square prompt and answer', () => {
		const round = makeBoardGripRound('name-square', new Chess().fen(), () => 0.5);

		expect(round.prompt).toBe(`Find ${round.targetSquare}`);
		expect(round.answers).toEqual([round.targetSquare]);
	});

	it('maps equal name-square probability buckets to all four board orientations', () => {
		expect([0.1, 0.3, 0.6, 0.9].map((roll) => randomBoardGripView('name-square', () => roll))).toEqual([
			{ orientation: 'white', rotation: 0 },
			{ orientation: 'black', rotation: 0 },
			{ orientation: 'white', rotation: 90 },
			{ orientation: 'white', rotation: 270 }
		]);
	});

	it('finds loose non-king pieces without including kings', () => {
		const loose = loosePieceSquaresFromFen(new Chess().fen());

		expect(loose.length).toBeGreaterThan(0);
		expect(loose).not.toContain('e1');
		expect(loose).not.toContain('e8');
	});

	it('can scope loose pieces to one color', () => {
		const fen = fenAfter(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5']);

		expect(loosePieceSquaresFromFen(fen, 'b')).toEqual(['a8']);
		expect(loosePieceSquaresFromFen(fen, 'w')).toEqual(['g2', 'a1', 'h1']);
		expect(makeBoardGripRound('loose-pieces', fen, () => 0.8).prompt).toContain('black');
	});

	it('finds pieces pinned to a queen or king', () => {
		const fen = fenAfter(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5']);

		expect(pinnedPieceSquaresFromFen(fen)).toContain('f6');
	});

	it('rotates drill types instead of immediately repeating them', () => {
		const first = nextBoardGripRound(null, () => 0);
		const second = nextBoardGripRound(first, () => 0);

		expect(first.kind).toBe('name-square');
		expect(second.kind).toBe('attackers');
	});
});
