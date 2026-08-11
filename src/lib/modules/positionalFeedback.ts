import type { PositionalRubricScore } from '../learning/objectiveScoring';

/** Vetted, deterministic feedback for the positional exercise. */
export function explainPositionalResult(score: PositionalRubricScore): string {
	if (score.total >= 80) {
		return 'You identified the d6 pressure point and chose a plan that increases pressure before changing the structure.';
	}
	if (score.plan >= 20 && score.observations < 20) {
		return 'Your plan is reasonable, but first identify the d6 weakness. The position rewards increasing pressure before changing the structure.';
	}
	if (score.observations >= 20 && score.plan < 20) {
		return 'You found the d6 pressure point, but the plan does not use it effectively. Reroute the knight and prepare the c4 break.';
	}
	if (score.evaluation < 15) {
		return 'The evaluation is too far from the reference. White has a small edge, so look for pressure rather than a forced attack.';
	}
	return 'You have part of the idea. Focus on the d6 weakness, then increase pressure before changing the structure.';
}
