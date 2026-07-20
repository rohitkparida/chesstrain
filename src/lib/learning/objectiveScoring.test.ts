import { describe, expect, it } from 'vitest';
import { accuracyPercent, scoreDecisionEvidence, scorePositionalAnalysis } from './objectiveScoring';

describe('objective scoring', () => {
	it('reports accuracy only when attempts exist', () => {
		expect(accuracyPercent(1, 2)).toBe(50);
		expect(accuracyPercent(0, 0)).toBeNull();
	});

	it('requires two distinct candidate entries for decision evidence', () => {
		expect(scoreDecisionEvidence({
			threat: 'Attacks e4',
			candidates: 'e4',
			refutation: 'Check Qh4',
		}).completed).toBe(2);
		expect(scoreDecisionEvidence({
			threat: 'Attacks e4',
			candidates: 'e4, Nf3',
			refutation: 'Check Qh4',
		}).completed).toBe(3);
	});

	it('scores positional answers against the disclosed reference rubric', () => {
		expect(scorePositionalAnalysis({
			evaluation: 0.5,
			space: 'White has queenside space',
			weakSquares: 'd6',
			pawnStructure: 'Backward d6 pawn is a target',
			planOrder: ['b', 'a', 'c', 'd'],
		})).toMatchObject({ total: 100, evaluation: 30, plan: 30, observations: 40 });
	});
});
