import { Chess, type Move } from 'chess.js';

export interface GameMoveCandidate { ply: number; moveNumber: number; color: 'w' | 'b'; move: Move; fen: string; afterFen: string; }

export interface CachedMistakeSet<T> { username: string; savedAt: number; mistakes: T[]; }

export type AccountColor = 'w' | 'b';

export function mistakeCacheKey(userId: string): string {
  return `magnus:mistakes:${userId}`;
}

export function serializeMistakes<T>(userId: string, username: string, mistakes: T[], savedAt = Date.now()): string {
  return JSON.stringify({ userId, username, savedAt, mistakes });
}

export function parseCachedMistakes<T>(raw: string | null, userId: string): CachedMistakeSet<T> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('userId' in value) || !('mistakes' in value) || !Array.isArray(value.mistakes)) return null;
    const record = value as { userId?: unknown; username?: unknown; savedAt?: unknown; mistakes: T[] };
    if (record.userId !== userId || typeof record.savedAt !== 'number') return null;
    return { username: typeof record.username === 'string' ? record.username : '', savedAt: record.savedAt, mistakes: record.mistakes };
  } catch { return null; }
}

function normalizePlayerName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function playerNamesMatch(headerName: string, accountName: string): boolean {
  const header = normalizePlayerName(headerName);
  const account = normalizePlayerName(accountName);
  return Boolean(account) && (header === account || header.startsWith(`${account} (`) || header.startsWith(`${account} `));
}

function headersFromPgn(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of pgn.replace(/\r\n?/g, '\n').split('\n')) {
    const match = line.match(/^\s*\[([A-Za-z][A-Za-z0-9_]*)\s+"((?:\\.|[^"\\])*)"\]\s*$/);
    if (!match) {
      if (Object.keys(headers).length) break;
      continue;
    }
    headers[match[1]] = match[2].replace(/\\([\\"])/g, '$1');
  }
  return headers;
}

export function splitPgnGames(pgn: string): string[] {
  const normalized = pgn.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const starts = [...normalized.matchAll(/^\s*\[Event(?:\s|\")/gim)].map((match) => match.index ?? 0);
  if (starts.length <= 1) return [normalized];

  return starts.map((start, index) => normalized.slice(start, starts[index + 1]).trim()).filter(Boolean);
}

export function accountColorFromHeaders(headers: Record<string, string>, accountName: string | undefined): AccountColor | null {
  if (!accountName?.trim()) return null;
  const whiteMatches = typeof headers.White === 'string' && playerNamesMatch(headers.White, accountName);
  const blackMatches = typeof headers.Black === 'string' && playerNamesMatch(headers.Black, accountName);
  if (whiteMatches === blackMatches) return null;
  return whiteMatches ? 'w' : 'b';
}

export function hasAmbiguousAccountColor(pgn: string, accountName: string | undefined): boolean {
  const games = splitPgnGames(pgn);
  if (!games.length || !accountName?.trim()) return true;
  return games.some((gamePgn) => accountColorFromHeaders(headersFromPgn(gamePgn), accountName) === null);
}

export function extractGameMoves(pgn: string, fallbackColor: AccountColor, accountName?: string): GameMoveCandidate[] {
  const candidates: GameMoveCandidate[] = [];
  for (const gamePgn of splitPgnGames(pgn)) {
    const game = new Chess();
    game.loadPgn(gamePgn);
    const selectedColor = accountColorFromHeaders(game.getHeaders(), accountName) ?? fallbackColor;
    const replay = new Chess();
    for (const move of game.history({ verbose: true })) {
      const fen = replay.fen();
      const played = replay.move(move);
      if (played.color === selectedColor) candidates.push({ ply: replay.history().length, moveNumber: Math.ceil(replay.history().length / 2), color: played.color, move: played, fen, afterFen: replay.fen() });
    }
  }
  return candidates;
}
