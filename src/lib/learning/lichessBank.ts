import { Chess } from 'chess.js';
import type { Puzzle } from '../../stores/session';

export interface LichessPuzzleRecord {
	id: string;
	fen: string;
	moves: string[];
	rating: number;
	ratingDeviation: number;
	popularity: number;
	nbPlays: number;
	themes: string[];
	gameUrl: string;
	openingTags: string[];
}

export interface LichessPuzzleBank {
	list(): readonly LichessPuzzleRecord[];
	select(targetRating: number, tags?: readonly string[], excludeIds?: ReadonlySet<string>, seed?: number): LichessPuzzleRecord | null;
}

function csvFields(line: string): string[] {
	const fields: string[] = [];
	let field = '';
	let quoted = false;
	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];
		if (character === '"') { quoted = !quoted; continue; }
		if (character === ',' && !quoted) { fields.push(field); field = ''; continue; }
		field += character;
	}
	fields.push(field);
	return fields;
}

function numberField(value: string, fallback = 0): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseLichessPuzzleCsv(csv: string): LichessPuzzleRecord[] {
	const rows: LichessPuzzleRecord[] = [];
	for (const [index, line] of csv.replace(/\r\n?/g, '\n').split('\n').entries()) {
		if (!line.trim() || index === 0) continue;
		const fields = csvFields(line);
		if (fields.length < 10) continue;
		const moves = fields[2].trim().split(/\s+/).filter(Boolean);
		if (!fields[0] || !fields[1] || moves.length < 2 || !Number.isFinite(Number(fields[3]))) continue;
		try { new Chess(fields[1]); } catch { continue; }
		rows.push({ id: fields[0], fen: fields[1], moves, rating: numberField(fields[3]), ratingDeviation: numberField(fields[4]), popularity: numberField(fields[5]), nbPlays: numberField(fields[6]), themes: fields[7].trim().split(/\s+/).filter(Boolean), gameUrl: fields[8], openingTags: fields[9].trim().split(/\s+/).filter(Boolean) });
	}
	return rows;
}

export function lichessRecordToPuzzle(record: LichessPuzzleRecord): Puzzle | null {
	try {
		const game = new Chess(record.fen);
		const firstMove = game.move(record.moves[0]);
		if (!firstMove) return null;
		const solution: string[] = [];
		for (const notation of record.moves.slice(1)) {
			const move = game.move(notation);
			if (!move) return null;
			solution.push(move.san);
		}
		if (!solution.length) return null;
		return { id: `lichess:${record.id}`, fen: game.fen(), solution, elo: record.rating, tags: record.themes, description: record.gameUrl };
	} catch { return null; }
}

export function createLichessPuzzleBank(records: readonly LichessPuzzleRecord[]): LichessPuzzleBank {
	return {
		list: () => records,
		select(targetRating, tags = [], excludeIds = new Set<string>(), seed = Date.now()) {
			const wanted = records.filter(record => !excludeIds.has(record.id) && tags.every(tag => record.themes.includes(tag)));
			if (!wanted.length) return null;
			const nearest = wanted.slice().sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating));
			const topBand = nearest.slice(0, Math.min(20, nearest.length));
			return topBand[Math.abs(seed) % topBand.length] ?? null;
		}
	};
}
