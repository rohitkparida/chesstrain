export type ChessComTimeClass = 'rapid' | 'blitz';

export interface ChessComConnection {
	username: string;
	canonicalUsername: string;
	playerId: number;
	verifiedAt: number;
	lastSyncAt: number | null;
}

export interface ChessComPlayer {
	username: string;
	canonicalUsername: string;
	playerId: number;
	avatar?: string;
	title?: string;
}

export interface ImportedChessComGame {
	id: string;
	url: string;
	pgn: string;
	white: { username: string; rating?: number; result?: string };
	black: { username: string; rating?: number; result?: string };
	userColor: 'w' | 'b';
	opponent: string;
	result: string;
	endTime: number;
	timeClass: ChessComTimeClass;
	rated: boolean;
	rules: 'chess';
	pgnHash: string;
}

export interface ChessComArchive {
	url: string;
	year: number;
	month: number;
}

export interface ChessComClient {
	getPlayer(username: string, signal?: AbortSignal): Promise<ChessComPlayer>;
	getStats?(username: string, signal?: AbortSignal): Promise<ChessComStats>;
	listArchives(username: string, signal?: AbortSignal): Promise<ChessComArchive[]>;
	getMonthlyGames(archive: ChessComArchive, username: string, signal?: AbortSignal): Promise<ImportedChessComGame[]>;
}

export interface ChessComStats {
	readonly [mode: string]: {
		readonly last?: { readonly rating?: number };
		readonly record?: { readonly win?: number; readonly loss?: number; readonly draw?: number };
	};
}

export interface MistakeAnalysisJob {
	userId: string;
	playerId: number;
	gameIds: string[];
	gameIndex: number;
	plyIndex: number;
	pass: 'quick' | 'verify';
	status: 'idle' | 'syncing' | 'analyzing' | 'paused' | 'complete' | 'error';
	gamesFound: number;
	gamesAnalyzed: number;
	mistakesFound: number;
	updatedAt: number;
	nextRetryAt: number | null;
	error: string | null;
}

export type MistakeKind = 'evaluation-loss' | 'missed-mate' | 'allowed-mate';

export interface PersonalMistakeExercise {
	id: string;
	gameId: string;
	ply: number;
	fen: string;
	afterFen: string;
	playedMove: string;
	bestMove: string;
	playedSan: string;
	bestSan: string;
	lossCp: number;
	kind: MistakeKind;
	principalVariation: string[];
	engineVersion: string;
	analyzedAt: number;
}

export interface MistakeRepository {
	getConnection(userId: string): Promise<ChessComConnection | null>;
	putConnection(userId: string, connection: ChessComConnection): Promise<void>;
	listGames(userId: string, playerId: number): Promise<ImportedChessComGame[]>;
	putGames(userId: string, games: ImportedChessComGame[]): Promise<void>;
	getJob(userId: string, playerId: number): Promise<MistakeAnalysisJob | null>;
	putJob(job: MistakeAnalysisJob): Promise<void>;
	listMistakes(userId: string, playerId: number): Promise<PersonalMistakeExercise[]>;
	putMistakes(userId: string, mistakes: PersonalMistakeExercise[]): Promise<void>;
}

export function mistakeExerciseId(gameId: string, ply: number): string {
	return `chesscom:${gameId}:${ply}`;
}
