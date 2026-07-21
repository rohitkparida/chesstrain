import { StockfishEngine, StockfishCancellationError, StockfishEngineTerminatedError } from '$lib/chess/engine';
import { candidatesForGame, exerciseFromAnalysis, quickAnalyzeCandidate, verifyCandidate } from '$lib/learning/mistakeAnalysis';
import { ChessComApiError, createChessComClient, fetchLatestEligibleGames, fetchNewEligibleGames } from './client';
import { createIndexedDbMistakeRepository } from './repository';
import type { ChessComClient } from './types';
import type { MistakeAnalysisJob, MistakeRepository, PersonalMistakeExercise } from './types';

export interface MistakeSyncState {
	status: MistakeAnalysisJob['status'];
	gamesFound: number;
	gamesAnalyzed: number;
	mistakesFound: number;
	error: string | null;
	lastSyncAt: number | null;
}

const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;

function initialState(): MistakeSyncState {
	return { status: 'idle', gamesFound: 0, gamesAnalyzed: 0, mistakesFound: 0, error: null, lastSyncAt: null };
}

export class MistakeSyncCoordinator {
	private readonly client: ChessComClient;
	private readonly repository: MistakeRepository;
	private readonly engine: StockfishEngine;
	private readonly listeners = new Set<(state: MistakeSyncState) => void>();
	private controller: AbortController | null = null;
	private currentState = initialState();

	constructor(
		private readonly userId: string,
		private readonly username: string,
		options: { client?: ChessComClient; repository?: MistakeRepository; engine?: StockfishEngine } = {}
	) {
		this.client = options.client ?? createChessComClient();
		this.repository = options.repository ?? createIndexedDbMistakeRepository();
		this.engine = options.engine ?? new StockfishEngine();
	}

	subscribe(listener: (state: MistakeSyncState) => void): () => void {
		this.listeners.add(listener);
		listener(this.currentState);
		return () => this.listeners.delete(listener);
	}

	getState(): MistakeSyncState { return this.currentState; }

	private update(patch: Partial<MistakeSyncState>) {
		this.currentState = { ...this.currentState, ...patch };
		this.listeners.forEach(listener => listener(this.currentState));
	}

	async run(force = false): Promise<void> {
		if (this.controller) return;
		const existingConnection = await this.repository.getConnection(this.userId);
		if (!force && existingConnection?.lastSyncAt && Date.now() - existingConnection.lastSyncAt < SYNC_INTERVAL_MS) {
			this.update({ lastSyncAt: existingConnection.lastSyncAt });
			return;
		}
		this.controller = new AbortController();
		const signal = this.controller.signal;
		let activeJob: MistakeAnalysisJob | null = null;
		try {
			this.update({ status: 'syncing', error: null });
			const player = await this.client.getPlayer(this.username, signal);
			const connection = { username: this.username, canonicalUsername: player.canonicalUsername, playerId: player.playerId, verifiedAt: Date.now(), lastSyncAt: existingConnection?.lastSyncAt ?? null };
			await this.repository.putConnection(this.userId, connection);
			const saved = await this.repository.listGames(this.userId, player.playerId);
			const savedIds = new Set(saved.map(game => game.id));
			const previousJob = await this.repository.getJob(this.userId, player.playerId);
			const unfinishedIds = previousJob && previousJob.status !== 'complete' ? new Set(previousJob.gameIds) : null;
			const fetched = unfinishedIds
				? await fetchLatestEligibleGames(this.client, this.username, 20, signal)
				: saved.length
					? await fetchNewEligibleGames(this.client, this.username, savedIds, signal)
					: await fetchLatestEligibleGames(this.client, this.username, 20, signal);
			const newGames = unfinishedIds ? fetched.filter(game => unfinishedIds.has(game.id)) : fetched.filter(game => !savedIds.has(game.id));
			await this.repository.putGames(this.userId, fetched);
			const existingMistakes = await this.repository.listMistakes(this.userId, player.playerId);
			this.update({ status: 'analyzing', gamesFound: newGames.length, gamesAnalyzed: 0, mistakesFound: existingMistakes.length });
			const resuming = unfinishedIds !== null && previousJob !== null;
			const job: MistakeAnalysisJob = resuming ? { ...previousJob, status: 'analyzing', updatedAt: Date.now(), error: null } : { userId: this.userId, playerId: player.playerId, gameIds: newGames.map(game => game.id), gameIndex: 0, plyIndex: 0, pass: 'quick', status: 'analyzing', gamesFound: newGames.length, gamesAnalyzed: 0, mistakesFound: existingMistakes.length, updatedAt: Date.now(), nextRetryAt: null, error: null };
			activeJob = job;
			await this.repository.putJob(job);
			const found: PersonalMistakeExercise[] = [];
			for (let gameIndex = job.gameIndex; gameIndex < newGames.length; gameIndex += 1) {
				const game = newGames[gameIndex];
				const candidates = candidatesForGame(game);
				const firstPly = gameIndex === job.gameIndex ? job.plyIndex : 0;
				for (let plyIndex = firstPly; plyIndex < candidates.length; plyIndex += 1) {
					job.gameIndex = gameIndex; job.plyIndex = plyIndex; job.updatedAt = Date.now();
					await this.repository.putJob(job);
					const quickAnalysis = await quickAnalyzeCandidate(this.engine, game, candidates[plyIndex], signal);
					const provisional = quickAnalysis ? exerciseFromAnalysis(quickAnalysis, 'provisional') : null;
					if (provisional) {
						found.push(provisional);
						await this.repository.putMistakes(this.userId, [provisional]);
						this.update({ mistakesFound: existingMistakes.length + found.length });
					}
					if (quickAnalysis) {
						job.pass = 'verify'; job.updatedAt = Date.now(); await this.repository.putJob(job);
						const verified = await verifyCandidate(this.engine, quickAnalysis, signal);
						const verifiedExercise = exerciseFromAnalysis(verified, 'verified');
						if (verifiedExercise) await this.repository.putMistakes(this.userId, [verifiedExercise]);
						else if (provisional) await this.repository.putMistakes(this.userId, [{ ...provisional, verificationStatus: 'discarded' }]);
						job.pass = 'quick';
					}
				}
				job.gamesAnalyzed = gameIndex + 1; job.updatedAt = Date.now();
				this.update({ gamesAnalyzed: job.gamesAnalyzed, mistakesFound: existingMistakes.length + found.length });
			}
			job.status = 'complete'; job.updatedAt = Date.now(); job.mistakesFound = existingMistakes.length + found.length;
			await this.repository.putJob(job);
			connection.lastSyncAt = Date.now();
			await this.repository.putConnection(this.userId, connection);
			this.update({ status: 'complete', gamesAnalyzed: newGames.length, mistakesFound: job.mistakesFound, lastSyncAt: connection.lastSyncAt });
		} catch (error) {
			const cancelled = error instanceof StockfishCancellationError || error instanceof StockfishEngineTerminatedError || signal.aborted;
			const message = error instanceof ChessComApiError && error.status === 404
				? 'That Chess.com username was not found.'
				: error instanceof ChessComApiError && error.status === 429
					? 'Chess.com is rate-limiting requests. We will try again later.'
					: 'Chess.com sync or Stockfish analysis could not finish.';
			this.update({ status: cancelled ? 'paused' : 'error', error: cancelled ? null : message });
			if (activeJob) {
				activeJob.status = cancelled ? 'paused' : 'error';
				activeJob.updatedAt = Date.now();
				activeJob.error = cancelled ? null : message;
				await this.repository.putJob(activeJob);
			}
		} finally {
			this.controller = null;
		}
	}

	cancel() {
		this.controller?.abort();
		this.controller = null;
		this.update({ status: 'paused' });
	}

	destroy() {
		this.cancel();
		this.listeners.clear();
	}
}
