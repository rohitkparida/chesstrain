import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { exerciseFromAnalysis, isSacrificeIdea, mistakeKind, playerPerspectiveLoss, type AnalyzedMove } from './mistakeAnalysis';
import type { ImportedChessComGame } from '$lib/chesscom/types';
import type { EngineEval } from '$lib/chess/engine';

const evaluation = (evalCp: number, mateIn: number | null = null): EngineEval => ({ bestMove: 'e2e4', evalCp, mateIn, principalVariation: [], depth: 12 });

describe('mistake analysis', () => {
	it('normalizes the after-position back to the mover perspective for either color', () => {
		expect(playerPerspectiveLoss(evaluation(40), evaluation(100))).toBe(140);
		expect(playerPerspectiveLoss(evaluation(40), evaluation(100))).toBe(140);
	});

	it('recognizes mate transitions separately from centipawn loss', () => {
		expect(mistakeKind(evaluation(0, 3), evaluation(0), 0)).toBe('missed-mate');
		expect(mistakeKind(evaluation(0), evaluation(0, 2), 0)).toBe('allowed-mate');
		expect(mistakeKind(evaluation(0), evaluation(-90), 90)).toBe('evaluation-loss');
	});

	it('detects a sacrifice idea from material given back after the reply', () => {
		const fen = '4k3/3p4/8/8/8/8/4R3/4K3 w - - 0 1';
		const before = evaluation(100);
		before.principalVariation = ['e2e7', 'e8e7'];
		expect(isSacrificeIdea(fen, before)).toBe(true);
	});

	it('creates a provisional puzzle from a quick 60cp signal', () => {
		const game = { id: 'g1', pgn: '', white: { username: 'player' }, black: { username: 'opponent' }, userColor: 'w', opponent: 'opponent', result: '1-0', endTime: 1, timeClass: 'rapid', rated: true, rules: 'chess', url: '', pgnHash: 'h' } as ImportedChessComGame;
		const board = new Chess();
		const move = board.move('e4');
		const analysis: AnalyzedMove = { game, candidate: { ply: 1, moveNumber: 1, color: 'w', fen: new Chess().fen(), afterFen: board.fen(), move }, before: evaluation(0), after: evaluation(60) };
		expect(exerciseFromAnalysis(analysis, 'provisional')?.verificationStatus).toBe('provisional');
	});
});
