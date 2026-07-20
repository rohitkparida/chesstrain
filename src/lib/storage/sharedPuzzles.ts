import type { Puzzle } from '../../stores/session';
import type { PuzzleShardManifest, SharedPuzzleRepository } from './contracts';

export type PuzzleShardFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function createStaticPuzzleRepository(
	baseUrl = '/puzzles',
	fetcher: PuzzleShardFetcher = fetch
): SharedPuzzleRepository {
	return {
		async getManifest(signal) {
			const response = await fetcher(`${baseUrl}/manifest.json`, { signal });
			if (!response.ok) throw new Error(`Puzzle manifest request failed (${response.status}).`);
			return await response.json() as PuzzleShardManifest;
		},
		async getShard(id, signal) {
			const response = await fetcher(`${baseUrl}/${encodeURIComponent(id)}.json`, { signal });
			if (!response.ok) throw new Error(`Puzzle shard request failed (${response.status}).`);
			return await response.json();
		}
	};
}

export function isPuzzle(value: unknown): value is Puzzle {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;
	return typeof record.id === 'string'
		&& typeof record.elo === 'number'
		&& Array.isArray(record.tags) && record.tags.every((tag) => typeof tag === 'string')
		&& Array.isArray(record.solution) && record.solution.every((move) => typeof move === 'string');
}

export function parsePuzzleShard(value: unknown): Puzzle[] {
	const values = Array.isArray(value) ? value : (typeof value === 'object' && value !== null && Array.isArray((value as { puzzles?: unknown }).puzzles) ? (value as { puzzles: unknown[] }).puzzles : []);
	return values.filter(isPuzzle);
}
