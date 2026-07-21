import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { BoardRotation } from '../chess/board';
import { ALL_SQUARES, FILES, randomRealisticFen, randomSquare } from './nameTheSquare';

export type BoardGripKind = 'name-square' | 'attackers' | 'loose-pieces' | 'pinned-pieces';

export interface BoardGripRound {
	kind: BoardGripKind;
	label: string;
	prompt: string;
	fen: string;
	answers: string[];
	targetSquare?: string;
}

export interface BoardGripView {
	orientation: 'white' | 'black';
	rotation: BoardRotation;
}

export function randomBoardGripView(kind: BoardGripKind, random: () => number = Math.random): BoardGripView {
	const roll = random();
	if (kind !== 'name-square') return { orientation: roll < 0.5 ? 'white' : 'black', rotation: 0 };
	if (roll < 0.25) return { orientation: 'white', rotation: 0 };
	if (roll < 0.5) return { orientation: 'black', rotation: 0 };
	if (roll < 0.75) return { orientation: 'white', rotation: 90 };
	return { orientation: 'white', rotation: 270 };
}

const DRILL_KINDS: BoardGripKind[] = ['name-square', 'attackers', 'loose-pieces', 'pinned-pieces'];
export const NONE_ANSWER_RATE = 0.15;
const COLORS: Color[] = ['w', 'b'];
const COLOR_NAME: Record<Color, string> = { w: 'White', b: 'Black' };
const ANCHORS = new Set<PieceSymbol>(['k', 'q']);

function squareIndex(square: string) {
	return ALL_SQUARES.indexOf(square);
}

function sortSquares(squares: Iterable<string>): string[] {
	return [...new Set(squares)].sort((a, b) => squareIndex(a) - squareIndex(b));
}

function randomKind(current: BoardGripKind | undefined, random: () => number): BoardGripKind {
	const index = Math.min(DRILL_KINDS.length - 1, Math.floor(random() * DRILL_KINDS.length));
	const kind = DRILL_KINDS[index] ?? DRILL_KINDS[0];
	return kind === current ? DRILL_KINDS[(index + 1) % DRILL_KINDS.length] : kind;
}

function randomEmptySquare(fen: string, random: () => number): string {
	const game = new Chess(fen);
	const emptySquares = ALL_SQUARES.filter((square) => !game.get(square as Square));
	if (emptySquares.length === 0) return randomSquare('', random);
	const index = Math.min(emptySquares.length - 1, Math.floor(random() * emptySquares.length));
	return emptySquares[index] ?? emptySquares[0];
}

export function attackerSquaresFromFen(fen: string, square: string): string[] {
	const game = new Chess(fen);
	return sortSquares(COLORS.flatMap((color) => game.attackers(square as Square, color)));
}

export function loosePieceSquaresFromFen(fen: string, color?: Color): string[] {
	const game = new Chess(fen);
	const loose: string[] = [];
	for (const square of ALL_SQUARES) {
		const piece = game.get(square as Square);
		if (!piece || piece.type === 'k') continue;
		if (color && piece.color !== color) continue;
		if (game.attackers(square as Square, piece.color).length === 0) loose.push(square);
	}
	return loose;
}

function chooseLooseColor(fen: string, random: () => number): Color {
	const white = loosePieceSquaresFromFen(fen, 'w').length;
	const black = loosePieceSquaresFromFen(fen, 'b').length;
	if (white === black) return random() < 0.5 ? 'w' : 'b';
	if (white === 0) return random() < 0.3 ? 'w' : 'b';
	if (black === 0) return random() < 0.3 ? 'b' : 'w';
	return white < black ? 'w' : 'b';
}

function toCoords(square: string) {
	return { file: FILES.indexOf(square[0] as (typeof FILES)[number]), rank: Number(square[1]) - 1 };
}

function fromCoords(file: number, rank: number) {
	return `${FILES[file]}${rank + 1}`;
}

function canPin(type: PieceSymbol, dx: number, dy: number) {
	if (type === 'q') return true;
	if (type === 'r') return dx === 0 || dy === 0;
	if (type === 'b') return dx !== 0 && dy !== 0;
	return false;
}

export function pinnedPieceSquaresFromFen(fen: string): string[] {
	const game = new Chess(fen);
	const pinned = new Set<string>();
	const directions = [-1, 0, 1].flatMap((dx) =>
		[-1, 0, 1].filter((dy) => dx !== 0 || dy !== 0).map((dy) => ({ dx, dy }))
	);

	for (const anchorSquare of ALL_SQUARES) {
		const anchor = game.get(anchorSquare as Square);
		if (!anchor || !ANCHORS.has(anchor.type)) continue;
		const anchorCoords = toCoords(anchorSquare);

		for (const { dx, dy } of directions) {
			let blocker: string | null = null;
			let file = anchorCoords.file + dx;
			let rank = anchorCoords.rank + dy;

			while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
				const square = fromCoords(file, rank);
				const piece = game.get(square as Square);
				if (!piece) {
					file += dx;
					rank += dy;
					continue;
				}

				if (piece.color === anchor.color) {
					if (blocker === null && piece.type !== 'k' && square !== anchorSquare) {
						blocker = square;
						file += dx;
						rank += dy;
						continue;
					}
					break;
				}

				if (blocker && canPin(piece.type, dx, dy)) pinned.add(blocker);
				break;
			}
		}
	}

	return sortSquares(pinned);
}

export function makeBoardGripRound(
	kind: BoardGripKind,
	fen: string,
	random: () => number = Math.random
): BoardGripRound {
	if (kind === 'name-square') {
		const targetSquare = randomSquare('', random);
		return {
			kind,
			label: 'Name square',
			prompt: `Find ${targetSquare}`,
			fen,
			targetSquare,
			answers: [targetSquare]
		};
	}

	if (kind === 'attackers') {
		const targetSquare = randomEmptySquare(fen, random);
		return {
			kind,
			label: 'Square control',
			prompt: 'Select all pieces controlling the marked square.',
			fen,
			targetSquare,
			answers: attackerSquaresFromFen(fen, targetSquare)
		};
	}

	if (kind === 'loose-pieces') {
		const color = chooseLooseColor(fen, random);
		return {
			kind,
			label: `Loose ${COLOR_NAME[color]} pieces`,
			prompt: `Select all undefended ${COLOR_NAME[color].toLowerCase()} pieces and pawns.`,
			fen,
			answers: loosePieceSquaresFromFen(fen, color)
		};
	}

	return {
		kind,
		label: 'Pinned pieces',
		prompt: 'Select all pieces pinned to a king or queen.',
		fen,
		answers: pinnedPieceSquaresFromFen(fen)
	};
}

export function nextBoardGripRound(
	previous: BoardGripRound | null = null,
	random: () => number = Math.random
): BoardGripRound {
	const kind = randomKind(previous?.kind, random);
	if (kind === 'name-square') return makeBoardGripRound(kind, randomRealisticFen(previous?.fen ?? '', random), random);

	const wantNone = random() < NONE_ANSWER_RATE;
	let fen = randomRealisticFen(previous?.fen ?? '', random);
	let round = makeBoardGripRound(kind, fen, random);
	for (let attempt = 0; attempt < 12; attempt += 1) {
		if ((round.answers.length === 0) === wantNone) return round;
		fen = randomRealisticFen(fen, random);
		round = makeBoardGripRound(kind, fen, random);
	}
	return round;
}
