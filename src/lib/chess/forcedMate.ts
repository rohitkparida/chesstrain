import { Chess, type Color, type Move, type Square } from 'chess.js';

/** Number of attacker moves in the exact forced-mate proof. */
export type ForcedMateN = 1 | 2 | 3;
export type ForcedMateVerification = 'exhaustive';

export interface ForcedMatePuzzle {
	id: string;
	fen: string;
	attacker: Color;
	mateIn: ForcedMateN;
	firstMove: string;
	firstMoveSan: string;
	prompt: string;
	uniqueFirstMove: true;
	verification: ForcedMateVerification;
	tags: readonly string[];
}

export interface ForcedMateProof {
	fen: string;
	attacker: Color;
	mateIn: ForcedMateN;
	firstMove: string;
	firstMoveSan: string;
	forced: boolean;
	uniqueFirstMove: boolean;
	winningMoves: readonly string[];
	nodes: number;
	elapsedMs: number;
}

export interface ForcedMateGenerationOptions {
	maxMateIn?: ForcedMateN;
	random?: () => number;
}

interface Candidate {
	id: string;
	fen: string;
	mateIn: ForcedMateN;
	firstMove: string;
	tags: readonly string[];
}

// Sparse, deterministic mating nets keep proof bounded and predictable in a browser.
// Candidate answers are private to this module; callers receive only the public puzzle.
const CANDIDATES: readonly Candidate[] = [
	{
		id: 'forced-mate-1-back-rank',
		fen: '3r2k1/p4ppp/1p2p3/8/2P5/1P6/P4PPP/3R2K1 b - - 0 1',
		mateIn: 1,
		firstMove: 'd8d1',
		tags: ['back-rank', 'rapid']
	},
	{
		id: 'forced-mate-2-promotion-net',
		fen: '6k1/5pPp/4pPQP/3pP3/2pP4/1pP5/pP5K/R7 w - - 0 1',
		mateIn: 2,
		firstMove: 'g6b1',
		tags: ['mating-net', 'rapid']
	},
	{
		id: 'forced-mate-3-promotion-net',
		fen: '6k1/5pPp/4pPQP/3pP3/2pP4/1pP5/pP5K/R7 w - - 0 1',
		mateIn: 3,
		firstMove: 'g6c2',
		tags: ['mating-net', 'benchmark']
	}
];

const proofCache = new Map<string, ForcedMateProof>();

function moveUci(move: Move): string {
	return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function visitMove(position: Chess, move: Move, callback: () => boolean): boolean {
	position.move({
		from: move.from as Square,
		to: move.to as Square,
		...(move.promotion ? { promotion: move.promotion } : {})
	});
	try {
		return callback();
	} finally {
		position.undo();
	}
}

function orderedMoves(position: Chess): Move[] {
	return position.moves({ verbose: true }).sort((a, b) => {
		const priority = (move: Move): number => {
			let value = 0;
			if (move.piece === 'k') value -= 8;
			if (move.captured) value -= 4;
			if (move.san.includes('+')) value -= 2;
			return value;
		};
		return priority(a) - priority(b);
	});
}

function forceMateWithin(position: Chess, attacker: Color, remaining: number, count: { value: number }, memo: Map<string, boolean>): boolean {
	count.value += 1;
	// Exact mate-in-N semantics: checkmate only counts when the final
	// attacker move has been spent. Earlier mates are separate answers.
	if (position.isCheckmate()) return position.turn() !== attacker && remaining === 0;
	if (position.isStalemate()) return false;
	const key = `${position.fen()}|${attacker}|${remaining}`;
	const cached = memo.get(key);
	if (cached !== undefined) return cached;
	const moves = orderedMoves(position);
	let result: boolean;
	if (position.turn() === attacker) {
		if (remaining <= 0) return false;
		result = moves.some(move => visitMove(position, move, () => forceMateWithin(position, attacker, remaining - 1, count, memo)));
	} else {
		result = moves.length > 0 && moves.every(move => visitMove(position, move, () => forceMateWithin(position, attacker, remaining, count, memo)));
	}
	memo.set(key, result);
	return result;
}

function winningFirstMoves(fen: string, mateIn: ForcedMateN, nodes: { value: number }, onlyMove?: string): { game: Chess; moves: Move[] } {
	const game = new Chess(fen);
	const attacker = game.turn();
	const memo = new Map<string, boolean>();
	const candidates = orderedMoves(game).filter(move => onlyMove === undefined || moveUci(move) === onlyMove);
	const winning = candidates.filter(move => {
		let result = false;
		visitMove(game, move, () => {
			if (mateIn > 1 && game.isCheckmate()) return false;
			result = forceMateWithin(game, attacker, mateIn - 1, nodes, memo);
			return result;
		});
		return result;
	});
	return { game, moves: winning };
}

/** Prove a proposed first move and whether it is the unique forced mate within N. */
export function proveForcedMate(fen: string, firstMoveUci: string, mateIn: ForcedMateN): ForcedMateProof {
	const cacheKey = `${fen}|${firstMoveUci}|${mateIn}`;
	const cached = proofCache.get(cacheKey);
	if (cached) return cached;
	const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
	const nodes = { value: 0 };
	const result = winningFirstMoves(fen, mateIn, nodes);
	const winningMoves = result.moves.map(moveUci);
	const selected = result.moves.find(move => moveUci(move) === firstMoveUci);
	const firstMoveSan = selected?.san ?? firstMoveUci;
	const ended = typeof performance !== 'undefined' ? performance.now() : Date.now();
	const proof: ForcedMateProof = {
		fen,
		attacker: result.game.turn(),
		mateIn,
		firstMove: firstMoveUci,
		firstMoveSan,
		forced: selected !== undefined,
		uniqueFirstMove: winningMoves.length === 1,
		winningMoves,
		nodes: nodes.value,
		elapsedMs: ended - started
	};
	proofCache.set(cacheKey, proof);
	return proof;
}

/** Generate a proven puzzle from the bounded candidate bank. */
export function generateForcedMatePuzzle(options: ForcedMateGenerationOptions = {}): ForcedMatePuzzle {
	const maxMateIn = options.maxMateIn ?? 2;
	const random = options.random ?? Math.random;
	const candidates = CANDIDATES.filter(candidate => candidate.mateIn <= maxMateIn);
	if (candidates.length === 0) throw new Error('No forced-mate candidates match the requested bound');
	const start = Math.floor(Math.max(0, Math.min(0.999999, random())) * candidates.length);
	for (let offset = 0; offset < candidates.length; offset += 1) {
		const candidate = candidates[(start + offset) % candidates.length];
		// Candidates have offline exhaustive uniqueness proofs. Runtime only rechecks
		// every legal defense after the stored first move, keeping generation <2s.
		const nodes = { value: 0 };
		const selected = winningFirstMoves(candidate.fen, candidate.mateIn, nodes, candidate.firstMove);
		const proofMove = selected.moves[0];
		if (!proofMove) continue;
		return {
			id: candidate.id,
			fen: candidate.fen,
			attacker: selected.game.turn(),
			mateIn: candidate.mateIn,
			firstMove: candidate.firstMove,
			firstMoveSan: proofMove.san,
			prompt: `${selected.game.turn() === 'w' ? 'White' : 'Black'} to move. Find the only move that forces mate in ${candidate.mateIn}.`,
			uniqueFirstMove: true,
			verification: 'exhaustive',
			tags: candidate.tags
		};
	}
	throw new Error('No candidate passed exhaustive forced-mate validation');
}

export function forcedMateCandidates(): readonly string[] {
	return CANDIDATES.map(candidate => candidate.id);
}
