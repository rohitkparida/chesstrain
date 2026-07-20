import type { Chess, Piece } from 'chess.js';
import type { Square as ChessSquare } from 'chess.js';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type BoardOrientation = 'white' | 'black' | 'side-to-move';
export type TerminalState = 'ongoing' | 'checkmate' | 'stalemate' | 'draw';

export const PIECE_GLYPHS: Record<string, string> = {
	wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
	bK: '\u265a', bQ: '\u265b', bR: '\u265c', bB: '\u265d', bN: '\u265e', bP: '\u265f'
};

export type BoardSquare = {
	name: string;
	dark: boolean;
	pieceKey: string | null;
	pieceColor: 'w' | 'b' | null;
	fileLabel: string | null;
	rankLabel: string | null;
};

export function pieceKey(piece: Pick<Piece, 'color' | 'type'>): string {
	return `${piece.color}${piece.type.toUpperCase()}`;
}

export function pieceGlyph(key: string): string {
	return PIECE_GLYPHS[key] ?? '';
}

export function isDarkSquare(square: string): boolean {
	const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
	const rank = Number(square[1]);
	return file >= 0 && Number.isInteger(rank) && (file + rank) % 2 === 1;
}

export function isFlippedForOrientation(orientation: BoardOrientation, turn: 'w' | 'b'): boolean {
	return orientation === 'black' || (orientation === 'side-to-move' && turn === 'b');
}

export function orientSquare(square: string, flipped: boolean): string {
	if (!flipped || square.length !== 2) return square;
	const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
	const rank = Number(square[1]);
	if (file < 0 || !Number.isInteger(rank) || rank < 1 || rank > 8) return square;
	return `${FILES[7 - file]}${9 - rank}`;
}

export type BoardRotation = 0 | 90 | 180 | 270;

export function rotateSquare(square: string, rotation: BoardRotation): string {
	if (rotation === 0 || square.length !== 2) return square;
	const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
	const rank = Number(square[1]) - 1;
	if (file < 0 || !Number.isInteger(rank) || rank < 0 || rank > 7) return square;
	if (rotation === 90) return `${FILES[7 - rank]}${file + 1}`;
	if (rotation === 180) return `${FILES[7 - file]}${8 - rank}`;
	return `${FILES[rank]}${8 - file}`;
}

export function getLegalMoves(game: Chess, from?: string): string[] {
	if (from) return game.moves({ square: from as ChessSquare });
	return game.moves();
}

export function getTerminalState(game: Chess): TerminalState {
	if (game.isCheckmate()) return 'checkmate';
	if (game.isStalemate()) return 'stalemate';
	if (game.isDraw()) return 'draw';
	return 'ongoing';
}

export function isTerminalState(game: Chess): boolean {
	return getTerminalState(game) !== 'ongoing';
}

export function buildBoardSquares(game: Chess, flipped: boolean): BoardSquare[] {
	const board = game.board();
	const next: BoardSquare[] = [];
	for (let row = 0; row < 8; row += 1) {
		for (let column = 0; column < 8; column += 1) {
			const boardRow = flipped ? 7 - row : row;
			const boardColumn = flipped ? 7 - column : column;
			const rank = 8 - boardRow;
			const file = FILES[boardColumn];
			const name = `${file}${rank}`;
			const cell = board[boardRow][boardColumn];
			next.push({
				name, dark: isDarkSquare(name),
				pieceKey: cell ? pieceKey(cell) : null,
				pieceColor: cell?.color ?? null,
				fileLabel: row === 7 ? file : null,
				rankLabel: column === 0 ? String(rank) : null
			});
		}
	}
	return next;
}
