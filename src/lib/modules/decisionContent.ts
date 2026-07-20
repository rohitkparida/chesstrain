import type { DecisionExercise } from '../learning/trainingTypes';

export interface DecisionChoice {
	id: string;
	label: string;
}

export interface DecisionCandidate extends DecisionChoice {
	uci: string;
}

export interface DecisionScenario extends DecisionExercise {
	opponentMove: string;
	prompt: string;
	threatOptions: readonly DecisionChoice[];
	expectedThreat: string;
	candidateOptions: readonly DecisionCandidate[];
	refutationOptions: readonly DecisionChoice[];
	expectedRefutation: string;
	acceptableMoves: readonly string[];
}

export interface DecisionProcessState {
	threatId: string | null;
	candidateIds: readonly string[];
	refutationId: string | null;
	committed: boolean;
}

export interface DecisionProcessScore {
	completed: number;
	total: 4;
	processScore: number;
	threatCorrect: boolean;
	candidatesReady: boolean;
	refutationCorrect: boolean;
	commitmentRecorded: boolean;
}

const e4AfterE5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const d5AfterD5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const e4AfterNf6 = 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2';

const threats: readonly DecisionChoice[] = [
	{ id: 'central-control', label: 'The opponent is contesting the centre.' },
	{ id: 'development-race', label: 'The opponent is racing to develop.' },
	{ id: 'king-safety', label: 'The opponent is preparing to attack my king.' },
];

export const DECISION_SCENARIOS: readonly DecisionScenario[] = [
	{
		id: 'decision-after-e5', module: 'decision', type: 'decision', estimatedSeconds: 90,
		title: 'Respond to ...e5', fen: e4AfterE5, bestMove: 'g1f3',
		opponentMove: '...e5', prompt: 'What changed after the opponent claimed the centre?',
		threatOptions: threats, expectedThreat: 'central-control',
		candidateOptions: [
			{ id: 'develop-knight', label: 'Nf3: develop and pressure e5', uci: 'g1f3' },
			{ id: 'develop-bishop', label: 'Bc4: develop with a tempo idea', uci: 'f1c4' },
			{ id: 'strike-centre', label: 'd4: challenge the centre immediately', uci: 'd2d4' },
		],
		refutationOptions: [
			{ id: 'black-develops', label: 'Black develops with ...Nc6 or ...Nf6.' },
			{ id: 'black-wins-queen', label: 'Black wins the queen by force.' },
			{ id: 'black-is-mated', label: 'Black is checkmated immediately.' },
		],
		expectedRefutation: 'black-develops', acceptableMoves: ['g1f3', 'f1c4', 'd2d4'],
	},
	{
		id: 'decision-after-d5', module: 'decision', type: 'decision', estimatedSeconds: 90,
		title: 'Respond to ...d5', fen: d5AfterD5, bestMove: 'e4d5',
		opponentMove: '...d5', prompt: 'The opponent has challenged your e-pawn. Compare forcing replies.',
		threatOptions: threats, expectedThreat: 'central-control',
		candidateOptions: [
			{ id: 'take-centre', label: 'exd5: clarify the centre', uci: 'e4d5' },
			{ id: 'develop-knight', label: 'Nc3: develop and keep tension', uci: 'b1c3' },
			{ id: 'build-centre', label: 'd4: build a broad pawn centre', uci: 'd2d4' },
		],
		refutationOptions: [
			{ id: 'black-recaptures', label: 'Black recaptures or develops naturally.' },
			{ id: 'black-loses-castling', label: 'Black loses castling rights by rule.' },
			{ id: 'black-has-no-move', label: 'Black has no legal reply.' },
		],
		expectedRefutation: 'black-recaptures', acceptableMoves: ['e4d5', 'b1c3', 'd2d4'],
	},
	{
		id: 'decision-after-nf6', module: 'decision', type: 'decision', estimatedSeconds: 90,
		title: 'Respond to ...Nf6', fen: e4AfterNf6, bestMove: 'e4e5',
		opponentMove: '...Nf6', prompt: 'The knight attacks e4. Identify the practical candidates before moving.',
		threatOptions: threats, expectedThreat: 'development-race',
		candidateOptions: [
			{ id: 'advance-pawn', label: 'e5: gain space and chase the knight', uci: 'e4e5' },
			{ id: 'develop-knight', label: 'Nc3: protect and develop', uci: 'b1c3' },
			{ id: 'develop-bishop', label: 'Bc4: develop with an active target', uci: 'f1c4' },
		],
		refutationOptions: [
			{ id: 'black-chases', label: 'Black gains a tempo by chasing the advanced piece.' },
			{ id: 'black-loses-queen', label: 'Black drops the queen immediately.' },
			{ id: 'black-is-stalemated', label: 'Black is stalemated immediately.' },
		],
		expectedRefutation: 'black-chases', acceptableMoves: ['e4e5', 'b1c3', 'f1c4'],
	},
];

export function scoreDecisionProcess(
	scenario: DecisionScenario,
	state: DecisionProcessState,
): DecisionProcessScore {
	const validCandidateIds = new Set(scenario.candidateOptions.map((candidate) => candidate.id));
	const uniqueCandidates = new Set(state.candidateIds);
	const candidatesReady = uniqueCandidates.size >= 2
		&& uniqueCandidates.size === state.candidateIds.length
		&& [...uniqueCandidates].every((id) => validCandidateIds.has(id));
	const threatCorrect = state.threatId === scenario.expectedThreat;
	const refutationCorrect = state.refutationId === scenario.expectedRefutation;
	const commitmentRecorded = state.committed === true;
	const completed = [threatCorrect, candidatesReady, refutationCorrect, commitmentRecorded].filter(Boolean).length;
	return {
		completed, total: 4, processScore: completed / 4,
		threatCorrect, candidatesReady, refutationCorrect, commitmentRecorded,
	};
}

export function isDecisionProcessReady(scenario: DecisionScenario, state: DecisionProcessState): boolean {
	const score = scoreDecisionProcess(scenario, state);
	return state.threatId !== null && score.candidatesReady && state.refutationId !== null && !score.commitmentRecorded;
}

export function scoreDecisionMove(scenario: DecisionScenario, uci: string): number {
	return scenario.acceptableMoves.includes(uci.toLowerCase()) ? 1 : 0;
}
