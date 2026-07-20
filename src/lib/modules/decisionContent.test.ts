import { describe, expect, it } from 'vitest';
import { DECISION_SCENARIOS, isDecisionProcessReady, scoreDecisionProcess } from './decisionContent';

describe('decision content contract', () => {
	const scenario = DECISION_SCENARIOS[0];

	it('rejects filler and duplicate candidate entries', () => {
		expect(scoreDecisionProcess(scenario, {
			threatId: scenario.expectedThreat,
			candidateIds: ['filler', 'filler'],
			refutationId: scenario.expectedRefutation,
			committed: false,
		}).candidatesReady).toBe(false);
	});

	it('requires the structured threat, candidate, and refutation flow before commitment', () => {
		const state = {
			threatId: scenario.expectedThreat,
			candidateIds: scenario.candidateOptions.slice(0, 2).map((candidate) => candidate.id),
			refutationId: scenario.expectedRefutation,
			committed: false,
		};
		expect(isDecisionProcessReady(scenario, state)).toBe(true);
		expect(scoreDecisionProcess(scenario, { ...state, committed: true }).processScore).toBe(1);
	});

	it('allows an imperfect process to be committed for feedback', () => {
		const state = {
			threatId: 'development-race',
			candidateIds: scenario.candidateOptions.slice(0, 2).map((candidate) => candidate.id),
			refutationId: 'black-wins-queen',
			committed: false,
		};
		expect(isDecisionProcessReady(scenario, state)).toBe(true);
		expect(scoreDecisionProcess(scenario, state).processScore).toBeLessThan(1);
	});
});
