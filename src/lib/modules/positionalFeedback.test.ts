import { describe, expect, it } from 'vitest';
import { explainPositionalResult } from './positionalFeedback';

describe('positional feedback', () => {
	it('explains a strong plan using verified position facts', () => {
		expect(explainPositionalResult({ total: 90, evaluation: 30, plan: 30, observations: 30, matchedEvidence: ['d6 weakness'] })).toContain('d6 pressure point');
	});

	it('distinguishes a missed plan from a missed feature', () => {
		expect(explainPositionalResult({ total: 55, evaluation: 25, plan: 20, observations: 10, matchedEvidence: [] })).toContain('identify the d6 weakness');
		expect(explainPositionalResult({ total: 55, evaluation: 25, plan: 10, observations: 30, matchedEvidence: ['d6 weakness'] })).toContain('found the d6 pressure point');
	});
});
