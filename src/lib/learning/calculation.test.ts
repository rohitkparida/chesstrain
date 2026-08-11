import { describe, expect, it } from 'vitest';
import { assessCalculation, isLegalCalculationLine } from './calculation';

const line = ['Nxf7', 'Rxf7', 'Qd5+', 'Kh8', 'Qxa8'];

describe('calculation feedback', () => {
	it('validates curated lines as complete legal continuations', () => {
		expect(isLegalCalculationLine('8/8/8/8/8/8/4K3/4k3 w - - 0 1', ['Kf2'])).toBe(false);
		expect(isLegalCalculationLine('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', ['e5', 'Nf3'])).toBe(true);
	});
	it('does not leak the next move or full solution for a partial line', () => {
		const result = assessCalculation('Nxf7', line);
		expect(result.status).toBe('partial');
		expect(result.revealSolution).toBe(false);
		expect(result.feedback).not.toContain('Rxf7');
	});

	it('reveals review only after a committed wrong or complete line', () => {
		expect(assessCalculation('Nxf7 Rxf7 Qd4', line)).toMatchObject({
			revealSolution: true,
			matchedMoves: 2,
			score: 40
		});
		expect(assessCalculation(line.join(' '), line)).toMatchObject({
			revealSolution: true,
			matchedMoves: 5,
			score: 100
		});
	});

	it('does not treat an empty submission as an attempt', () => {
		expect(assessCalculation('', line)).toMatchObject({ status: 'empty', revealSolution: false });
	});
});
