import { Chess, type PieceSymbol, type Color } from 'chess.js';
import { FILES } from '$lib/chess/board';
import { ALL_SQUARES } from '$lib/learning/nameTheSquare';

export function buildFenFromMap(boardMap: Map<string, { type: PieceSymbol; color: Color }>): string {
	const ranks: string[] = [];
	for (let rank = 8; rank >= 1; rank--) {
		let rankStr = '';
		let emptyCount = 0;
		for (const file of FILES) {
			const sq = `${file}${rank}`;
			const piece = boardMap.get(sq);
			if (piece) {
				if (emptyCount > 0) {
					rankStr += emptyCount;
					emptyCount = 0;
				}
				const char = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
				rankStr += char;
			} else {
				emptyCount++;
			}
		}
		if (emptyCount > 0) rankStr += emptyCount;
		ranks.push(rankStr);
	}
	return `${ranks.join('/')} w - - 0 1`;
}

export function generateRandomPosition(targetCount: number, random: () => number = Math.random): { fen: string; pieceCount: number } {
	const seeds = [
		'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
		'r1bq1rk1/ppp2ppp/2np1n2/8/2BPP3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
		'r2q1rk1/pp1b1ppp/2n1pn2/3p4/3P4/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 1'
	];
	const game = new Chess(seeds[Math.floor(random() * seeds.length)] ?? seeds[0]);
	const plies = 8 + Math.floor(random() * 18);
	for (let ply = 0; ply < plies && !game.isGameOver(); ply += 1) {
		const moves = game.moves({ verbose: true });
		if (!moves.length) break;
		game.move(moves[Math.floor(random() * moves.length)] ?? moves[0]);
	}
	const boardMap = new Map<string, { type: PieceSymbol; color: Color }>();
	for (const row of game.board()) for (const piece of row) if (piece) boardMap.set(piece.square, { type: piece.type, color: piece.color });
	const removable = [...boardMap.entries()].filter(([, piece]) => piece.type !== 'k');
	while (boardMap.size > Math.max(2, targetCount) && removable.length > 0) {
		const index = Math.floor(random() * removable.length);
		const [square] = removable.splice(index, 1)[0];
		boardMap.delete(square);
	}
	return { fen: buildFenFromMap(boardMap), pieceCount: boardMap.size };
}

export function targetPieceCount(difficulty: number): number {
	if (difficulty <= 300) return 6;
	if (difficulty <= 600) return 8;
	if (difficulty <= 900) return 10;
	return 13;
}

export function parseBoardPieces(fen: string): Map<string, { type: PieceSymbol; color: Color }> {
	const result = new Map<string, { type: PieceSymbol; color: Color }>();
	try {
		const game = new Chess(fen);
		for (const row of game.board()) {
			for (const piece of row) {
				if (piece) {
					result.set(piece.square, { type: piece.type, color: piece.color });
				}
			}
		}
	} catch {
		// return empty map if FEN is invalid
	}
	return result;
}
