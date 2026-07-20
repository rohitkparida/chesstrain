import { Chess } from 'chess.js';
import type { ChessComArchive, ChessComClient, ChessComPlayer, ChessComStats, ImportedChessComGame } from './types';

const API_ROOT = 'https://api.chess.com/pub/player';

export class ChessComApiError extends Error {
	constructor(public readonly status: number, message: string) {
		super(message);
		this.name = 'ChessComApiError';
	}
}

export function normalizeUsername(username: string): string {
	return username.trim();
}

function numberOrUndefined(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringOrEmpty(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

async function hashText(value: string): Promise<string> {
	if (typeof crypto !== 'undefined' && crypto.subtle) {
		const bytes = new TextEncoder().encode(value);
		const digest = await crypto.subtle.digest('SHA-256', bytes);
		return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
	}
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
	return (hash >>> 0).toString(16);
}

function archiveFromUrl(url: string): ChessComArchive | null {
	const match = url.match(/\/(\d{4})\/(\d{2})\/?$/);
	if (!match) return null;
	return { url, year: Number(match[1]), month: Number(match[2]) };
}

function isEligible(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object') return false;
	const game = value as Record<string, unknown>;
	return game.rules === 'chess' && game.rated === true && (game.time_class === 'rapid' || game.time_class === 'blitz') && typeof game.pgn === 'string' && typeof game.url === 'string';
}

export function createChessComClient(fetchImpl: typeof fetch = fetch): ChessComClient {
	const request = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
		const response = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } });
		if (!response.ok) throw new ChessComApiError(response.status, `Chess.com request failed (${response.status})`);
		return await response.json() as T;
	};

	return {
		async getPlayer(username, signal) {
			const name = normalizeUsername(username);
			const value = await request<Record<string, unknown>>(`${API_ROOT}/${encodeURIComponent(name)}`, signal);
			if (typeof value.username !== 'string' || typeof value.player_id !== 'number') throw new ChessComApiError(502, 'Chess.com returned an invalid player profile');
			return { username: name, canonicalUsername: value.username, playerId: value.player_id, avatar: typeof value.avatar === 'string' ? value.avatar : undefined, title: typeof value.title === 'string' ? value.title : undefined };
		},
		async getStats(username, signal) {
			return await request<ChessComStats>(`${API_ROOT}/${encodeURIComponent(normalizeUsername(username))}/stats`, signal);
		},
		async listArchives(username, signal) {
			const value = await request<{ archives?: unknown }>(`${API_ROOT}/${encodeURIComponent(normalizeUsername(username))}/games/archives`, signal);
			if (!Array.isArray(value.archives)) return [];
			return value.archives.map(item => typeof item === 'string' ? archiveFromUrl(item) : null).filter((archive): archive is ChessComArchive => archive !== null);
		},
		async getMonthlyGames(archive, username, signal) {
			const value = await request<{ games?: unknown }>(archive.url, signal);
			if (!Array.isArray(value.games)) return [];
			const player = normalizeUsername(username).toLocaleLowerCase();
			const games: ImportedChessComGame[] = [];
			for (const item of value.games) {
				if (!isEligible(item)) continue;
				const white = item.white && typeof item.white === 'object' ? item.white as Record<string, unknown> : {};
				const black = item.black && typeof item.black === 'object' ? item.black as Record<string, unknown> : {};
				const whiteName = stringOrEmpty(white.username);
				const blackName = stringOrEmpty(black.username);
				const color = whiteName.toLocaleLowerCase() === player ? 'w' : blackName.toLocaleLowerCase() === player ? 'b' : null;
				if (!color) continue;
				try { new Chess().loadPgn(item.pgn as string); } catch { continue; }
				const pgnHash = await hashText(item.pgn as string);
				games.push({
					id: item.url as string,
					url: item.url as string,
					pgn: item.pgn as string,
					white: { username: whiteName, rating: numberOrUndefined(white.rating), result: stringOrEmpty(white.result) },
					black: { username: blackName, rating: numberOrUndefined(black.rating), result: stringOrEmpty(black.result) },
					userColor: color,
					opponent: color === 'w' ? blackName : whiteName,
					result: color === 'w' ? stringOrEmpty(white.result) : stringOrEmpty(black.result),
					endTime: numberOrUndefined(item.end_time) ?? 0,
					timeClass: item.time_class as 'rapid' | 'blitz',
					rated: true,
					rules: 'chess',
					pgnHash
				});
			}
			return games;
		}
	};
}

export async function fetchLatestEligibleGames(client: ChessComClient, username: string, limit = 20, signal?: AbortSignal): Promise<ImportedChessComGame[]> {
	const archives = (await client.listArchives(username, signal)).sort((a, b) => b.year - a.year || b.month - a.month);
	const games: ImportedChessComGame[] = [];
	for (const archive of archives) {
		const monthGames = await client.getMonthlyGames(archive, username, signal);
		games.push(...monthGames);
		if (games.length >= limit) break;
	}
	const unique = new Map(games.map(game => [game.id, game]));
	return [...unique.values()].sort((a, b) => b.endTime - a.endTime).slice(0, limit);
}

export async function fetchNewEligibleGames(client: ChessComClient, username: string, knownIds: ReadonlySet<string>, signal?: AbortSignal): Promise<ImportedChessComGame[]> {
	const archives = (await client.listArchives(username, signal)).sort((a, b) => b.year - a.year || b.month - a.month);
	const newGames: ImportedChessComGame[] = [];
	for (const archive of archives) {
		const monthGames = await client.getMonthlyGames(archive, username, signal);
		newGames.push(...monthGames.filter(game => !knownIds.has(game.id)));
		if (knownIds.size > 0 && monthGames.length > 0 && monthGames.every(game => knownIds.has(game.id))) break;
	}
	return [...new Map(newGames.map(game => [game.id, game])).values()].sort((a, b) => b.endTime - a.endTime);
}
