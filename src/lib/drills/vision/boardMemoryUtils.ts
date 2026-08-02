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
	const boardMap = new Map<string, { type: PieceSymbol; color: Color }>();
	const shuffledSquares = [...ALL_SQUARES].sort(() => random() - 0.5);

	const wKingSquare = shuffledSquares.pop()!;
	const bKingSquare = shuffledSquares.pop()!;
	boardMap.set(wKingSquare, { type: 'k', color: 'w' });
	boardMap.set(bKingSquare, { type: 'k', color: 'b' });

	let placed = 2;
	const pieceTypes: PieceSymbol[] = ['r', 'b', 'n', 'q', 'p'];

	while (placed < targetCount && shuffledSquares.length > 0) {
		const sq = shuffledSquares.pop()!;
		const color: Color = random() > 0.5 ? 'w' : 'b';
		let type = pieceTypes[Math.floor(random() * pieceTypes.length)] ?? 'p';

		if (type === 'p' && (sq.endsWith('1') || sq.endsWith('8'))) {
			type = 'n';
		}

		boardMap.set(sq, { type, color });
		placed++;
	}

	const fen = buildFenFromMap(boardMap);
	return { fen, pieceCount: placed };
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
