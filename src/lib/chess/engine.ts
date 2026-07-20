export interface EngineEval {
	bestMove: string;
	evalCp: number;
	/** A positive value means the side to move can force mate in N. */
	mateIn: number | null;
	principalVariation: string[];
	depth: number;
}

export interface EngineOptions {
	depth?: number;
	moveTimeMs?: number;
	signal?: AbortSignal;
}

export interface CancellablePromise<T> extends Promise<T> {
	cancel: () => void;
}

export class StockfishCancellationError extends Error {
	constructor() {
		super('Stockfish request was cancelled');
		this.name = 'AbortError';
	}
}

export class StockfishEngineTerminatedError extends Error {
	constructor() {
		super('Stockfish engine was terminated');
		this.name = 'StockfishEngineTerminatedError';
	}
}

export const STOCKFISH_WORKER_URL = '/stockfish/stockfish.wasm.js';

export interface EngineWorker {
	onmessage: ((event: { data: string }) => void) | null;
	onerror?: ((event: unknown) => void) | null;
	postMessage(message: string): void;
	terminate(): void;
}

interface EvalRequest {
	id: number;
	fen: string;
	options: EngineOptions;
	lastEvalCp: number;
	lastMateIn: number | null;
	lastPrincipalVariation: string[];
	lastDepth: number;
	resolve: (evaluation: EngineEval) => void;
	reject: (reason: unknown) => void;
	cancelled: boolean;
}

function unavailableEvaluation(): EngineEval {
	return { bestMove: '', evalCp: 0, mateIn: null, principalVariation: [], depth: 0 };
}

function abortError(): StockfishCancellationError {
	return new StockfishCancellationError();
}

function cancellable<T>(
	executor: (resolve: (value: T) => void, reject: (reason: unknown) => void, setCancel: (cancel: () => void) => void) => void
): CancellablePromise<T> {
	let cancelRequest = () => {};
	const promise = new Promise<T>((resolve, reject) => {
		executor(resolve, reject, (cancel) => { cancelRequest = cancel; });
	}) as CancellablePromise<T>;
	promise.cancel = () => cancelRequest();
	return promise;
}

export class StockfishEngine {
	private worker: EngineWorker | null = null;
	private active: EvalRequest | null = null;
	private queue: EvalRequest[] = [];
	private nextId = 1;
	private waitingForStop = false;

	constructor(workerFactory?: () => EngineWorker) {
		if (workerFactory) {
			this.connect(workerFactory());
		} else if (typeof window !== 'undefined') {
			try {
				this.connect(new Worker(STOCKFISH_WORKER_URL) as unknown as EngineWorker);
			} catch {
				this.worker = null;
			}
		}
	}

	private connect(worker: EngineWorker) {
		this.worker = worker;
		this.worker.onmessage = (event) => this.handleMessage(event.data);
		this.worker.onerror = () => this.failAllRequests();
		this.sendCommand('uci');
	}

	private failRequest(request: EvalRequest, reason: unknown) {
		if (request.cancelled) return;
		request.cancelled = true;
		request.reject(reason);
	}

	private failAllRequests() {
		const requests = [
			...(this.active ? [this.active] : []),
			...this.queue
		];
		this.active = null;
		this.queue = [];
		this.waitingForStop = false;
		this.worker?.terminate();
		this.worker = null;
		requests.forEach(request => this.failRequest(request, new StockfishEngineTerminatedError()));
	}

	private handleMessage(message: string) {
		if (this.waitingForStop) {
			if (message.startsWith('bestmove')) {
				this.waitingForStop = false;
				this.runNext();
			}
			return;
		}

		const request = this.active;
		if (!request || request.cancelled) return;

		if (message.startsWith('info')) {
			const cpMatch = message.match(/score cp (-?\d+)/);
			const mateMatch = message.match(/score mate (-?\d+)/);
			const depthMatch = message.match(/depth (\d+)/);
			if (cpMatch) { request.lastEvalCp = Number.parseInt(cpMatch[1], 10); request.lastMateIn = null; }
			if (mateMatch) request.lastMateIn = Number.parseInt(mateMatch[1], 10);
			if (depthMatch) request.lastDepth = Number.parseInt(depthMatch[1], 10);
			const pvIndex = message.indexOf(' pv ');
			if (pvIndex >= 0) request.lastPrincipalVariation = message.slice(pvIndex + 4).trim().split(/\s+/).filter(Boolean);
		}

		if (message.startsWith('bestmove')) {
			const completed = request;
			this.active = null;
			const evaluation = {
				bestMove: message.split(/\s+/)[1] ?? '',
				evalCp: completed.lastEvalCp,
				mateIn: completed.lastMateIn,
				principalVariation: completed.lastPrincipalVariation,
				depth: completed.lastDepth
			};
			if (!completed.cancelled) {
				completed.resolve(evaluation);
			}
			this.runNext();
		}
	}

	private goCommand(options: EngineOptions): string {
		const parts = ['go'];
		if (options.depth !== undefined) parts.push('depth', String(options.depth));
		const moveTime = options.moveTimeMs;
		if (moveTime !== undefined) parts.push('movetime', String(moveTime));
		if (parts.length === 1) parts.push('depth', '15');
		return parts.join(' ');
	}

	private runNext() {
		if (this.active || this.waitingForStop || this.queue.length === 0) return;
		this.active = this.queue.shift() ?? null;
		if (!this.active) return;
		this.sendCommand(`position fen ${this.active.fen}`);
		this.sendCommand(this.goCommand(this.active.options));
	}

	private request(fen: string, options: EngineOptions): CancellablePromise<EngineEval> {
		return cancellable<EngineEval>((resolve, reject, setCancel) => {
			const request: EvalRequest = {
				id: this.nextId++, fen, options, lastEvalCp: 0, lastMateIn: null, lastPrincipalVariation: [], lastDepth: 0,
				resolve, reject, cancelled: false
			};
			const cancel = () => {
				if (request.cancelled) return;
				request.cancelled = true;
				if (this.active?.id === request.id) {
					this.active = null;
					this.waitingForStop = true;
					this.sendCommand('stop');
				}
				else {
					this.queue = this.queue.filter(item => item.id !== request.id);
				}
				reject(abortError());
				if (!this.waitingForStop) this.runNext();
			};
			setCancel(cancel);

			if (options.signal?.aborted) {
				cancel();
				return;
			}
			if (!this.worker) {
				queueMicrotask(() => {
					if (request.cancelled) return;
					resolve(unavailableEvaluation());
				});
				return;
			}
			this.queue.push(request);
			this.runNext();
			if (options.signal) {
				options.signal.addEventListener('abort', cancel, { once: true });
			}
		});
	}

	sendCommand(command: string) {
		this.worker?.postMessage(command);
	}

	getBestMove(fen: string, options: EngineOptions = {}): CancellablePromise<string> {
		const request = this.request(fen, options);
		const promise = request.then(evaluation => evaluation.bestMove) as CancellablePromise<string>;
		promise.cancel = request.cancel;
		return promise;
	}

	getEval(fen: string, options: EngineOptions = {}): CancellablePromise<EngineEval> {
		return this.request(fen, options);
	}

	terminate() {
		const reason = new StockfishEngineTerminatedError();
		const requests = [
			...(this.active ? [this.active] : []),
			...this.queue
		];
		this.active = null;
		this.queue = [];
		this.waitingForStop = false;
		this.worker?.terminate();
		this.worker = null;
		requests.forEach(request => this.failRequest(request, reason));
	}
}
