import { describe, expect, it, vi } from 'vitest';
import { STOCKFISH_WORKER_URL, StockfishEngine, type EngineWorker } from './engine';

class FakeWorker implements EngineWorker {
	onmessage: ((event: { data: string }) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;
	commands: string[] = [];
	terminated = false;

	postMessage(message: string) { this.commands.push(message); }
	terminate() { this.terminated = true; }
	emit(data: string) { this.onmessage?.({ data }); }
}

describe('StockfishEngine', () => {
	it('serializes overlapping evaluations so feedback cannot cross attempts', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const first = engine.getBestMove('fen-one');
		const second = engine.getBestMove('fen-two');

		expect(worker.commands).toEqual(['uci', 'position fen fen-one', 'go depth 15']);
		worker.emit('bestmove e2e4');
		expect(worker.commands).toContain('position fen fen-two');
		worker.emit('bestmove d2d4');
		await expect(Promise.all([first, second])).resolves.toEqual(['e2e4', 'd2d4']);
	});

	it('keeps each request evaluation metadata isolated', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const first = engine.getEval('fen-one');
		const second = engine.getEval('fen-two');

		worker.emit('info depth 12 score cp 80');
		worker.emit('bestmove e2e4');
		worker.emit('info depth 9 score cp -25');
		worker.emit('bestmove d2d4');
		await expect(Promise.all([first, second])).resolves.toMatchObject([{ evalCp: 80 }, { evalCp: -25 }]);
	});

	it('loads Stockfish from the same origin for offline use', () => {
		expect(STOCKFISH_WORKER_URL).toBe('/stockfish/stockfish.wasm.js');
	});

	it('returns a safe unavailable result when no worker can be created', async () => {
		const originalWindow = globalThis.window;
		vi.stubGlobal('window', undefined);
		const engine = new StockfishEngine();
		const result = await engine.getEval('fen');
		expect(result).toEqual({ bestMove: '', evalCp: 0, mateIn: null, principalVariation: [], depth: 0 });
		vi.stubGlobal('window', originalWindow);
	});

	it('fails active and queued requests cleanly when the worker errors', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const first = engine.getBestMove('fen-one');
		const second = engine.getBestMove('fen-two');
		worker.onerror?.({});
		await expect(first).rejects.toMatchObject({ name: 'StockfishEngineTerminatedError' });
		await expect(second).rejects.toMatchObject({ name: 'StockfishEngineTerminatedError' });
		expect(worker.terminated).toBe(true);
	});

	it('treats a malformed bestmove response as unavailable', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const request = engine.getBestMove('fen');
		worker.emit('bestmove');
		await expect(request).resolves.toBe('');
	});

	it('supports depth and move-time options on Promise requests', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const request = engine.getEval('fen', { depth: 9, moveTimeMs: 250 });
		worker.emit('info depth 9 score cp 42');
		worker.emit('bestmove e2e4');
		expect(worker.commands).toContain('go depth 9 movetime 250');
		expect(await request).toEqual({ bestMove: 'e2e4', evalCp: 42, mateIn: null, principalVariation: [], depth: 9 });
	});

	it('preserves mate scores and principal variation', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const request = engine.getEval('fen');
		worker.emit('info depth 14 score mate 3 pv e2e4 e7e5 g1f3');
		worker.emit('bestmove e2e4');
		expect(await request).toMatchObject({ mateIn: 3, principalVariation: ['e2e4', 'e7e5', 'g1f3'], depth: 14 });
	});

	it('cancels active requests and ignores their late callbacks', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const request = engine.getBestMove('fen');
		request.cancel();
		worker.emit('bestmove e2e4');
		expect(worker.commands).toContain('stop');
		await expect(request).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('cancels queued requests without allowing a late result to cross requests', async () => {
		const worker = new FakeWorker();
		const engine = new StockfishEngine(() => worker);
		const first = engine.getBestMove('fen-one');
		const second = engine.getBestMove('fen-two');
		second.cancel();
		worker.emit('bestmove e2e4');
		await expect(first).resolves.toBe('e2e4');
		await expect(second).rejects.toMatchObject({ name: 'AbortError' });
		expect(worker.commands).not.toContain('position fen fen-two');
		worker.emit('bestmove d2d4');
		await new Promise(resolve => setTimeout(resolve, 0));
	});
});
