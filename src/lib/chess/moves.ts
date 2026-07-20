import { Chess, type Move, type Square } from 'chess.js';

export interface AppliedMove {
	beforeFen: string;
	afterFen: string;
	move: Move;
	gameOver: boolean;
}

export function applyCoordinateMove(
	fen: string,
	from: string,
	to: string,
	promotion = 'q'
): AppliedMove | null {
	const game = new Chess(fen);
	let move: Move;
	try {
		move = game.move({ from: from as Square, to: to as Square, promotion });
	} catch {
		return null;
	}
	if (!move) return null;

	return {
		beforeFen: fen,
		afterFen: game.fen(),
		move,
		gameOver: game.isGameOver()
	};
}

export function applyUciMove(fen: string, uci: string): AppliedMove | null {
	if (uci.length < 4) return null;
	return applyCoordinateMove(fen, uci.slice(0, 2), uci.slice(2, 4), uci.slice(4, 5) || 'q');
}

export function sanForUciMove(fen: string, uci: string): string {
	return applyUciMove(fen, uci)?.move.san ?? uci;
}
