import { describe, expect, it, vi } from 'vitest';
import { createStaticPuzzleRepository, parsePuzzleShard } from './sharedPuzzles';

describe('shared puzzle repository', () => {
	it('loads manifest and a shard through a static/R2-compatible URL boundary', async () => {
		const fetcher = vi.fn(async (input: RequestInfo | URL) => new Response(
			String(input).endsWith('manifest.json')
				? JSON.stringify({ version: 1, shards: [] })
				: JSON.stringify([{ id: 'p1', elo: 1200, tags: ['fork'], solution: ['Nf3'] }]),
			{ status: 200, headers: { 'content-type': 'application/json' } }
		));
		const repository = createStaticPuzzleRepository('/content', fetcher);
		expect((await repository.getManifest()).version).toBe(1);
		expect(parsePuzzleShard(await repository.getShard('fork-1200'))).toHaveLength(1);
		expect(fetcher).toHaveBeenCalledWith('/content/fork-1200.json', { signal: undefined });
	});

	it('rejects malformed shard entries without breaking the cache', () => {
		expect(parsePuzzleShard({ puzzles: [{ id: 'ok', elo: 1000, tags: [], solution: ['e4'] }, { id: 'bad' }] })).toHaveLength(1);
	});
});
