import { describe, expect, it } from 'vitest';
import { createMemoryMistakeRepository } from './repository';

const connection = { username: 'player', canonicalUsername: 'Player', playerId: 7, verifiedAt: 1, lastSyncAt: null };
const game = { id: 'game-1', url: 'game-1', pgn: '', white: { username: 'player' }, black: { username: 'opponent' }, userColor: 'w' as const, opponent: 'opponent', result: '1-0', endTime: 1, timeClass: 'rapid' as const, rated: true, rules: 'chess' as const, pgnHash: 'hash' };

describe('mistake repository', () => {
	it('isolates accounts and deduplicates games', async () => {
		const repository = createMemoryMistakeRepository();
		await repository.putConnection('one', connection);
		await repository.putConnection('two', { ...connection, playerId: 8 });
		await repository.putGames('one', [game, game]);
		await repository.putGames('two', [{ ...game, id: 'other' }]);
		expect((await repository.listGames('one', 7)).map(item => item.id)).toEqual(['game-1']);
		expect((await repository.listGames('two', 8)).map(item => item.id)).toEqual(['other']);
	});
});
