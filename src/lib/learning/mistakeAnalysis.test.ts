import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
	MISTAKE_THRESHOLD_CP,
	exerciseFromAnalysis,
	isPuzzleWorthy,
	isSacrificeIdea,
	isTrivialHangingPieceBlunder,
	mistakeKind,
	playerPerspectiveLoss,
	selectTopGameMistakes,
	type AnalyzedMove
} from './mistakeAnalysis';
import type { ImportedChessComGame } from '$lib/chesscom/types';
import type { EngineEval } from '$lib/chess/engine';
import type { GameMoveCandidate } from './gameMistakes';

const evaluation = (evalCp: number, mateIn: number | null = null): EngineEval => ({ bestMove: 'e2e4', evalCp, mateIn, principalVariation: ['e2e4'], depth: 12 });

describe('mistake analysis', () => {
	it('defines MISTAKE_THRESHOLD_CP as 150 centipawns', () => {
		expect(MISTAKE_THRESHOLD_CP).toBe(150);
	});

	it('normalizes the after-position back to the mover perspective for either color', () => {
		expect(playerPerspectiveLoss(evaluation(40), evaluation(100))).toBe(140);
		expect(playerPerspectiveLoss(evaluation(40), evaluation(100))).toBe(140);
	});

	it('recognizes mate transitions separately from centipawn loss', () => {
		expect(mistakeKind(evaluation(0, 3), evaluation(0), 0)).toBe('missed-mate');
		expect(mistakeKind(evaluation(0), evaluation(0, 2), 0)).toBe('allowed-mate');
		expect(mistakeKind(evaluation(0), evaluation(-150), 150)).toBe('evaluation-loss');
	});

	it('detects a sacrifice idea from material given back after the reply', () => {
		const fen = '4k3/3p4/8/8/8/8/4R3/4K3 w - - 0 1';
		const before = evaluation(100);
		before.principalVariation = ['e2e7', 'e8e7'];
		expect(isSacrificeIdea(fen, before)).toBe(true);
	});

	it('creates a provisional puzzle from a quick 60cp signal in middlegame', () => {
		const game = { id: 'g1', pgn: '', white: { username: 'player' }, black: { username: 'opponent' }, userColor: 'w', opponent: 'opponent', result: '1-0', endTime: 1, timeClass: 'rapid', rated: true, rules: 'chess', url: '', pgnHash: 'h' } as ImportedChessComGame;
		const board = new Chess();
		const move = board.move('e4');
		const before = evaluation(0);
		before.bestMove = 'd2d4';
		before.principalVariation = ['d2d4'];
		const analysis: AnalyzedMove = { game, candidate: { ply: 24, moveNumber: 12, color: 'w', fen: new Chess().fen(), afterFen: board.fen(), move }, before, after: evaluation(60) };
		expect(exerciseFromAnalysis(analysis, 'provisional')?.verificationStatus).toBe('provisional');
	});

	it('rejects opening moves (moveNumber <= 5) as non-puzzle-worthy', () => {
		const game = { id: 'g1', pgn: '', white: { username: 'player' }, black: { username: 'opponent' }, userColor: 'w', opponent: 'opponent', result: '1-0', endTime: 1, timeClass: 'rapid', rated: true, rules: 'chess', url: '', pgnHash: 'h' } as ImportedChessComGame;
		const board = new Chess();
		const move = board.move('e4');
		const before = evaluation(0);
		before.bestMove = 'd2d4';
		before.principalVariation = ['d2d4'];
		const analysis: AnalyzedMove = { game, candidate: { ply: 4, moveNumber: 2, color: 'w', fen: new Chess().fen(), afterFen: board.fen(), move }, before, after: evaluation(200) };
		expect(isPuzzleWorthy(analysis, 'verified')).toBe(false);
	});

	it('rejects engine noise and a move that already matches the best move', () => {
		const board = new Chess();
		const move = board.move('e4');
		const analysis: AnalyzedMove = { game: {} as ImportedChessComGame, candidate: { ply: 24, moveNumber: 12, color: 'w', fen: new Chess().fen(), afterFen: board.fen(), move }, before: evaluation(0), after: evaluation(10) };
		expect(isPuzzleWorthy(analysis, 'verified')).toBe(false);
		analysis.before.bestMove = 'e2e4';
		analysis.after = evaluation(150);
		expect(isPuzzleWorthy(analysis, 'verified')).toBe(false);
	});

	describe('isTrivialHangingPieceBlunder', () => {
		it('detects a 1-ply blunder that hangs an undefended piece for free', () => {
			const fen = 'r3k3/8/8/2p5/8/8/4N3/4K3 w - - 0 1';
			const board = new Chess(fen);
			const move = board.move({ from: 'e2', to: 'd4' });
			const candidate: GameMoveCandidate = {
				ply: 1, moveNumber: 1, color: 'w',
				fen, afterFen: board.fen(), move
			};
			expect(isTrivialHangingPieceBlunder(candidate)).toBe(true);
		});

		it('returns false if the square is defended so piece is not lost for free', () => {
			const fen = 'r3k3/8/8/2p5/8/4P3/4N3/4K3 w - - 0 1';
			const board = new Chess(fen);
			const move = board.move({ from: 'e2', to: 'd4' });
			const candidate: GameMoveCandidate = {
				ply: 1, moveNumber: 1, color: 'w',
				fen, afterFen: board.fen(), move
			};
			expect(isTrivialHangingPieceBlunder(candidate)).toBe(false);
		});

		it('returns false for pawn moves', () => {
			const fen = 'r3k3/8/8/2p5/8/8/4P3/4K3 w - - 0 1';
			const board = new Chess(fen);
			const move = board.move({ from: 'e2', to: 'e4' });
			const candidate: GameMoveCandidate = {
				ply: 1, moveNumber: 1, color: 'w',
				fen, afterFen: board.fen(), move
			};
			expect(isTrivialHangingPieceBlunder(candidate)).toBe(false);
		});

		it('makes hanging piece blunder non-puzzle-worthy', () => {
			const fen = 'r3k3/8/8/2p5/8/8/4N3/4K3 w - - 0 1';
			const board = new Chess(fen);
			const move = board.move({ from: 'e2', to: 'd4' });
			const before = evaluation(0);
			before.bestMove = 'e2c3';
			before.principalVariation = ['e2c3'];
			const candidate: GameMoveCandidate = { ply: 1, moveNumber: 1, color: 'w', fen, afterFen: board.fen(), move };
			const analysis: AnalyzedMove = { game: {} as ImportedChessComGame, candidate, before, after: evaluation(-300) };
			expect(isPuzzleWorthy(analysis, 'verified')).toBe(false);
		});
	});

	describe('selectTopGameMistakes', () => {
		it('groups by gameId, ranks descending by lossCp, and caps at maxPerGame (default 2)', () => {
			const items = [
				{ gameId: 'g1', lossCp: 100, id: '1' },
				{ gameId: 'g1', lossCp: 400, id: '2' },
				{ gameId: 'g1', lossCp: 250, id: '3' },
				{ gameId: 'g2', lossCp: 50, id: '4' },
				{ gameId: 'g2', lossCp: 300, id: '5' },
				{ gameId: 'g2', lossCp: 150, id: '6' }
			];
			const selected = selectTopGameMistakes(items);
			expect(selected).toHaveLength(4);
			expect(selected.map((i) => i.id)).toEqual(['2', '3', '5', '6']);
			expect(selected.filter((i) => i.gameId === 'g1').map((i) => i.lossCp)).toEqual([400, 250]);
			expect(selected.filter((i) => i.gameId === 'g2').map((i) => i.lossCp)).toEqual([300, 150]);
		});
	});
});
