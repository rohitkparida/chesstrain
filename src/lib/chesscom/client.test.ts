import { describe, expect, it, vi } from 'vitest';
import { createChessComClient, fetchLatestEligibleGames } from './client';

const pgn = '[Event "Test"]\n[White "rohitkparida"]\n[Black "opponent"]\n\n1. e4 e5 2. Nf3 Nc6 *';

describe('Chess.com client', () => {
	it('normalizes profiles and filters structured games', async () => {
		const fetchImpl = vi.fn<typeof fetch>(async (input) => {
			const url = String(input);
			if (url.endsWith('/rohitkparida')) return new Response(JSON.stringify({ username: 'RohitKParida', player_id: 42 }));
			return new Response(JSON.stringify({ games: [
				{ url: 'game-1', pgn, rules: 'chess', rated: true, time_class: 'rapid', end_time: 20, white: { username: 'rohitkparida' }, black: { username: 'opponent', result: '0-1' } },
				{ url: 'variant', pgn, rules: 'chess960', rated: true, time_class: 'rapid', end_time: 30, white: { username: 'rohitkparida' }, black: { username: 'opponent' } },
				{ url: 'bullet', pgn, rules: 'chess', rated: true, time_class: 'bullet', end_time: 40, white: { username: 'rohitkparida' }, black: { username: 'opponent' } }
			] }));
		});
		const client = createChessComClient(fetchImpl);
		await expect(client.getPlayer(' rohitkparida ')).resolves.toMatchObject({ canonicalUsername: 'RohitKParida', playerId: 42 });
		const games = await client.getMonthlyGames({ url: 'https://api.chess.com/pub/player/rohitkparida/games/2026/07', year: 2026, month: 7 }, 'rohitkparida');
		expect(games).toHaveLength(1);
		expect(games[0]).toMatchObject({ id: 'game-1', userColor: 'w', opponent: 'opponent' });
	});

	it('requests newest archives serially and returns the latest unique games', async () => {
		const order: string[] = [];
		const client = {
			getPlayer: vi.fn(),
			listArchives: vi.fn(async () => [{ url: 'new', year: 2026, month: 7 }, { url: 'old', year: 2026, month: 6 }]),
			getMonthlyGames: vi.fn(async archive => { order.push(archive.url); return [{ id: archive.url, endTime: archive.url === 'new' ? 2 : 1 } as never]; })
		};
		const games = await fetchLatestEligibleGames(client, 'player', 1);
		expect(order).toEqual(['new']);
		expect(games.map(game => game.id)).toEqual(['new']);
	});
});
