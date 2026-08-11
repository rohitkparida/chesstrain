import type { ChessComConnection, ImportedChessComGame, MistakeAnalysisJob, MistakeRepository, PersonalMistakeExercise } from './types';
import type { createCloudRepositories } from '$lib/cloud/repositories';

type CloudRepositories = ReturnType<typeof createCloudRepositories>;

interface Bucket {
	connection: ChessComConnection | null;
	games: ImportedChessComGame[];
	job: MistakeAnalysisJob | null;
	mistakes: PersonalMistakeExercise[];
}

function emptyBucket(): Bucket {
	return { connection: null, games: [], job: null, mistakes: [] };
}

export function createMemoryMistakeRepository(): MistakeRepository {
	const connections = new Map<string, ChessComConnection>();
	const buckets = new Map<string, Bucket>();
	const key = (userId: string, playerId: number) => `${userId}:${playerId}`;
	const getBucket = (userId: string, playerId: number) => {
		const bucketKey = key(userId, playerId);
		const bucket = buckets.get(bucketKey) ?? emptyBucket();
		buckets.set(bucketKey, bucket);
		return bucket;
	};
	return {
		async getConnection(userId) { return connections.get(userId) ?? null; },
		async putConnection(userId, connection) { connections.set(userId, connection); },
		async listGames(userId, playerId) { return [...getBucket(userId, playerId).games]; },
		async putGames(userId, games) {
			if (!games.length) return;
			const playerId = (await this.getConnection(userId))?.playerId;
			if (!playerId) return;
			const target = getBucket(userId, playerId);
			const merged = new Map([...target.games, ...games].map(game => [game.id, game]));
			target.games = [...merged.values()].sort((a, b) => b.endTime - a.endTime);
		},
		async getJob(userId, playerId) { return getBucket(userId, playerId).job; },
		async putJob(job) { getBucket(job.userId, job.playerId).job = job; },
		async listMistakes(userId, playerId) { return [...getBucket(userId, playerId).mistakes]; },
		async putMistakes(userId, mistakes) {
			const playerId = (await this.getConnection(userId))?.playerId;
			if (!playerId) return;
			const target = getBucket(userId, playerId);
			const merged = new Map([...target.mistakes, ...mistakes].map(mistake => [mistake.id, mistake]));
			target.mistakes = [...merged.values()];
		}
	};
}

export function createIndexedDbMistakeRepository(): MistakeRepository {
	if (typeof indexedDB === 'undefined') return createMemoryMistakeRepository();
	let databasePromise: Promise<IDBDatabase> | null = null;
	const database = () => databasePromise ??= new Promise((resolve, reject) => {
		const request = indexedDB.open('magnus-chesscom', 1);
		request.onupgradeneeded = () => request.result.createObjectStore('records');
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	const read = async <T>(key: string): Promise<T | null> => {
		try {
			const db = await database();
			return await new Promise<T | null>((resolve, reject) => {
				const request = db.transaction('records', 'readonly').objectStore('records').get(key);
				request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
				request.onerror = () => reject(request.error);
			});
		} catch { return null; }
	};
	const write = async (key: string, value: unknown): Promise<void> => {
		try {
			const db = await database();
			await new Promise<void>((resolve, reject) => {
				const request = db.transaction('records', 'readwrite').objectStore('records').put(value, key);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		} catch { /* Storage is an optimization; the in-memory route remains usable. */ }
	};
	const bucketKey = (userId: string, playerId: number) => `bucket:${userId}:${playerId}`;
	const connectionKey = (userId: string) => `connection:${userId}`;
	const loadBucket = async (userId: string, playerId: number): Promise<Bucket> => await read<Bucket>(bucketKey(userId, playerId)) ?? emptyBucket();
	return {
		async getConnection(userId) { return await read<ChessComConnection>(connectionKey(userId)); },
		async putConnection(userId, connection) { await write(connectionKey(userId), connection); },
		async listGames(userId, playerId) { return (await loadBucket(userId, playerId)).games; },
		async putGames(userId, games) {
			const connection = await read<ChessComConnection>(connectionKey(userId));
			if (!connection || !games.length) return;
			const bucket = await loadBucket(userId, connection.playerId);
			bucket.games = [...new Map([...bucket.games, ...games].map(game => [game.id, game])).values()].sort((a, b) => b.endTime - a.endTime);
			await write(bucketKey(userId, connection.playerId), bucket);
		},
		async getJob(userId, playerId) { return (await loadBucket(userId, playerId)).job; },
		async putJob(job) { const bucket = await loadBucket(job.userId, job.playerId); bucket.job = job; await write(bucketKey(job.userId, job.playerId), bucket); },
		async listMistakes(userId, playerId) { return (await loadBucket(userId, playerId)).mistakes; },
		async putMistakes(userId, mistakes) {
			const connection = await read<ChessComConnection>(connectionKey(userId));
			if (!connection) return;
			const bucket = await loadBucket(userId, connection.playerId);
			bucket.mistakes = [...new Map([...bucket.mistakes, ...mistakes].map(mistake => [mistake.id, mistake])).values()];
			await write(bucketKey(userId, connection.playerId), bucket);
		}
	};
}

/**
 * Keeps the coordinator's resumable connection/job state local while making
 * the durable game and exercise data cloud-backed for authenticated users.
 * Guests continue using the IndexedDB repository directly.
 */
export function createCloudBackedMistakeRepository(
	userId: string,
	cloud: CloudRepositories,
	local: MistakeRepository = createIndexedDbMistakeRepository()
): MistakeRepository {
	const gameCache = new Map<string, ImportedChessComGame[]>();
	const mistakeCache = new Map<string, PersonalMistakeExercise[]>();
	const key = (playerId: number) => `${userId}:${playerId}`;
	const toGame = (row: Awaited<ReturnType<CloudRepositories['games']['list']>>[number]): ImportedChessComGame => ({
		...(row.gameMetadata as Partial<ImportedChessComGame>), id: row.gameId, pgn: row.pgn,
		endTime: Number((row.gameMetadata as any)?.endTime ?? row.importedAt.getTime()),
		url: String((row.gameMetadata as any)?.url ?? row.gameId),
		white: (row.gameMetadata as any)?.white ?? { username: '' }, black: (row.gameMetadata as any)?.black ?? { username: '' },
		userColor: (row.gameMetadata as any)?.userColor ?? 'w', opponent: String((row.gameMetadata as any)?.opponent ?? ''),
		result: String((row.gameMetadata as any)?.result ?? '*'), timeClass: (row.gameMetadata as any)?.timeClass ?? 'rapid',
		rated: Boolean((row.gameMetadata as any)?.rated), rules: 'chess', pgnHash: String((row.gameMetadata as any)?.pgnHash ?? '')
	});
	const toMistake = (row: Awaited<ReturnType<CloudRepositories['mistakes']['list']>>[number]): PersonalMistakeExercise => ({
		...(row.exercise as unknown as PersonalMistakeExercise), id: row.id, gameId: row.gameId, ply: row.ply, fen: row.fen
	});
	return {
		getConnection: local.getConnection,
		putConnection: local.putConnection,
		async listGames(uid, playerId) {
			const rows = await cloud.games.list(userId);
			const games = rows.map(toGame);
			gameCache.set(key(playerId), games);
			return games;
		},
		async putGames(uid, games) {
			await local.putGames(uid, games);
			for (const game of games) await cloud.games.upsert({ userId, gameId: game.id, pgn: game.pgn, gameMetadata: game as unknown as Record<string, unknown>, analyzedVersion: null, importedAt: new Date(game.endTime) });
		},
		getJob: local.getJob,
		putJob: local.putJob,
		async listMistakes(uid, playerId) {
			const rows = await cloud.mistakes.list(userId);
			const mistakes = rows.map(toMistake);
			mistakeCache.set(key(playerId), mistakes);
			return mistakes;
		},
		async putMistakes(uid, mistakes) {
			await local.putMistakes(uid, mistakes);
			for (const mistake of mistakes) await cloud.mistakes.upsert({ userId, id: mistake.id, gameId: mistake.gameId, ply: mistake.ply, fen: mistake.fen, exercise: mistake as unknown as Record<string, unknown>, createdAt: new Date(mistake.analyzedAt) });
		}
	};
}
