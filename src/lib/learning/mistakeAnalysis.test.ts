import { describe, expect, it } from 'vitest';
import { mistakeKind, playerPerspectiveLoss } from './mistakeAnalysis';
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
});
