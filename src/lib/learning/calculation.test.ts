import { describe, expect, it } from 'vitest';
import { assessCalculation } from './calculation';

const line = ['Nxf7', 'Rxf7', 'Qd5+', 'Kh8', 'Qxa8'];

describe('calculation feedback', () => {
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
