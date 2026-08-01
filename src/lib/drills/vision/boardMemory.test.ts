import { describe, it, expect } from 'vitest';
import { drill } from './boardMemory';
import { generateRandomPosition, targetPieceCount } from './boardMemoryUtils';
import { Chess } from 'chess.js';

describe('boardMemory drill', () => {
	it('scales target piece count by difficulty', () => {
		expect(targetPieceCount(100)).toBe(6);
		expect(targetPieceCount(450)).toBe(8);
		expect(targetPieceCount(750)).toBe(10);
		expect(targetPieceCount(1000)).toBe(13);
	});

	it('generates a valid position with mandatory Kings and target piece count', () => {
		const { fen, pieceCount } = generateRandomPosition(4, Math.random);
		expect(pieceCount).toBe(4);
		const board = new Chess(fen);
		expect(board.fen()).toContain('w');
		const pieces = board.board().flat().filter((p) => p !== null);
		expect(pieces.length).toBe(4);
		expect(pieces.filter((p) => p?.type === 'k' && p?.color === 'w').length).toBe(1);
		expect(pieces.filter((p) => p?.type === 'k' && p?.color === 'b').length).toBe(1);
	});

	it('generates a valid drill instance with public and private data', async () => {
		const instance = await drill.generate({
			userId: 'user1',
			difficulty: 200,
			random: Math.random
		});

		expect(instance.drillId).toBe('vision.board-memory');
		expect(instance.prompt).toContain('Memorize the position');
		expect(instance.publicData.fen).toBeDefined();
		expect(instance.publicData.memorizeSeconds).toBe(3);
		expect(instance.privateData.targetFen).toBe(instance.publicData.fen);
	});

	it('evaluates exact match board reconstruction as 100% score', async () => {
		const { fen } = generateRandomPosition(4, Math.random);
		const assessment = await drill.evaluate(
			{ targetFen: fen, pieceCount: 4 },
			{ placedFen: fen }
		);

		expect(assessment.correct).toBe(true);
		expect(assessment.score).toBe(1.0);
		expect(assessment.feedback).toContain('100%');
	});

	it('evaluates partial board reconstruction correctly', async () => {
		const targetBoard = new Chess('8/8/8/8/8/8/4P3/K3k3 w - - 0 1');
		const placedBoard = new Chess('8/8/8/8/8/8/8/K3k3 w - - 0 1'); // Missed Pawn (2/3 pieces placed)

		const assessment = await drill.evaluate(
			{ targetFen: targetBoard.fen(), pieceCount: 3 },
			{ placedFen: placedBoard.fen() }
		);

		expect(assessment.score).toBe(0.0);
		expect(assessment.feedback).toContain('2/3');
	});
});
