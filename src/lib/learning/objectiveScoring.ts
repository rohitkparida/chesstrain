export interface ObjectiveMetric {
	label: string;
	value: string;
	note?: string;
}

export interface PositionalRubricScore {
	total: number;
	evaluation: number;
	plan: number;
	observations: number;
	matchedEvidence: string[];
}

export interface DecisionEvidence {
	completed: number;
	total: number;
	threatReady: boolean;
	candidatesReady: boolean;
	refutationReady: boolean;
}

export function accuracyPercent(correct: number, attempts: number): number | null {
	if (attempts <= 0) return null;
	return Math.round((correct / attempts) * 100);
}

export function scoreDecisionEvidence(params: {
	threat: string;
	candidates: string;
	refutation: string;
}): DecisionEvidence {
	const candidateCount = params.candidates
		.split(/[,\n]+/)
		.map((candidate) => candidate.trim())
		.filter(Boolean).length;
	const threatReady = params.threat.trim().length >= 3;
	const candidatesReady = candidateCount >= 2;
	const refutationReady = params.refutation.trim().length >= 3;

	return {
		completed: [threatReady, candidatesReady, refutationReady].filter(Boolean).length,
		total: 3,
		threatReady,
		candidatesReady,
		refutationReady,
	};
}

export function scorePositionalAnalysis(params: {
	evaluation: number;
	space: string;
	weakSquares: string;
	pawnStructure: string;
	planOrder: string[];
}): PositionalRubricScore {
	const evaluationError = Math.abs(params.evaluation - 0.5);
	const evaluation =
		evaluationError === 0 ? 30 :
		evaluationError <= 0.5 ? 25 :
		evaluationError <= 1 ? 15 :
		evaluationError <= 2 ? 5 : 0;

	const preferredPlanIndex = params.planOrder.indexOf('b');
	const plan = [30, 20, 10, 0][preferredPlanIndex] ?? 0;
	const matchedEvidence: string[] = [];
	let observations = 0;

	const space = params.space.toLowerCase();
	if (space.includes('white') && (space.includes('queen') || space.includes('space') || space.includes('control'))) {
		observations += 15;
		matchedEvidence.push('White space advantage');
	}

	if (params.weakSquares.toLowerCase().includes('d6')) {
		observations += 15;
		matchedEvidence.push('d6 weakness');
	}

	const pawnStructure = params.pawnStructure.toLowerCase();
	if (
		pawnStructure.includes('d6')
		&& ['weak', 'backward', 'isolated', 'target'].some((term) => pawnStructure.includes(term))
	) {
		observations += 10;
		matchedEvidence.push('Weak d6 pawn');
	}

	return {
		total: evaluation + plan + observations,
		evaluation,
		plan,
		observations,
		matchedEvidence,
	};
}
