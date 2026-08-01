import { Chess, type Color, type PieceSymbol } from 'chess.js';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;
export const ALL_SQUARES = RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}`));

const REALISTIC_LINES = [
	['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+'],
	['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5'],
	['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'Be7', 'Bg5', 'O-O', 'e3', 'h6'],
	['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e6'],
	['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5'],
	['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'e5', 'Nfd7', 'f4', 'c5', 'Nf3', 'Nc6'],
	['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6'],
	['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5'],
	['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
	['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2', 'Nb6']
] as const;

// Tactical midgame FENs featuring King attacks, pins, loose pieces, and contested squares
export const TACTICAL_MIDGAME_FENS = [
	'r1bq1rk1/ppp2ppp/2n5/3pP3/1b1P4/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 10',
	'r2q1rk1/pp1b1ppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 10',
	'r1b2rk1/pp3ppp/2p5/4q3/8/2PB4/P1P2PPP/R2Q1RK1 w - - 0 14',
	'r1b1k2r/pppp1ppp/8/4q3/1bP5/2N1P3/PP3PPP/R2QKB1R w KQkq - 0 10',
	'r3k2r/pbpp1ppp/1pn2q2/4p3/1b1PP3/2NB1N2/PPP2PPP/R2QK2R w KQkq - 0 8',
	'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
	'r1bqk2r/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R1BQK2R w KQkq - 0 8',
	'2rq1rk1/pp1n1ppp/4pn2/2pp4/3P4/2PBPN2/PP3PPP/R2Q1RK1 w - - 0 12',
	'r1bq1rk1/pp1nbppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 9',
	'r2q1rk1/1ppb1ppp/p1np1n2/4p3/2PPP3/2N1BN2/PP2BPPP/R2Q1RK1 w - - 0 10'
];

export interface PositionPiece {
	color: Color;
	type: PieceSymbol;
}

export const REALISTIC_FENS = [
	...REALISTIC_LINES.map((moves) => {
		const game = new Chess();
		for (const move of moves) game.move(move);
		return game.fen();
	}),
	...TACTICAL_MIDGAME_FENS
];

export function randomSquare(current = '', random = Math.random): string {
	if (ALL_SQUARES.length < 2) return ALL_SQUARES[0] ?? '';
	const index = Math.min(ALL_SQUARES.length - 1, Math.floor(random() * ALL_SQUARES.length));
	const square = ALL_SQUARES[index] ?? ALL_SQUARES[0];
	return square === current ? ALL_SQUARES[(index + 1) % ALL_SQUARES.length] : square;
}

export function randomRealisticFen(current = '', random = Math.random): string {
	const index = Math.min(REALISTIC_FENS.length - 1, Math.floor(random() * REALISTIC_FENS.length));
	const fen = REALISTIC_FENS[index] ?? REALISTIC_FENS[0];
	return fen === current ? REALISTIC_FENS[(index + 1) % REALISTIC_FENS.length] : fen;
}

export function piecesFromFen(fen: string): Record<string, PositionPiece> {
	const pieces: Record<string, PositionPiece> = {};
	for (const row of new Chess(fen).board()) {
		for (const piece of row) {
			if (piece) pieces[piece.square] = { color: piece.color, type: piece.type };
		}
	}
	return pieces;
}

export { isDarkSquare } from '$lib/chess/board';
