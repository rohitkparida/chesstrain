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

const sharpNajdorfFen = 'r1bqk2r/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R1BQK2R w KQkq - 0 8';
const pinnedThreatFen = 'r1b1k2r/pppp1ppp/8/4q3/1bP5/2N1P3/PP3PPP/R2QKB1R w KQkq - 0 10';
const centralBreakFen = 'r1bq1rk1/pp1nbppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 9';

const threats: readonly DecisionChoice[] = [
	{ id: 'central-break', label: 'The opponent is preparing a central pawn break.' },
	{ id: 'pinned-defender', label: 'The opponent is putting pressure on my pinned defender.' },
	{ id: 'flank-attack', label: 'The opponent is launching a flank attack against my king.' },
];

export const DECISION_SCENARIOS: readonly DecisionScenario[] = [
	{
		id: 'decision-najdorf-break', module: 'decision', type: 'decision', estimatedSeconds: 90,
		title: 'Critical Central Decision', fen: sharpNajdorfFen, bestMove: 'e1g1',
		opponentMove: '...c5', prompt: 'Black challenges the centre. Identify the critical threat and calculate candidate responses.',
		threatOptions: threats, expectedThreat: 'central-break',
		candidateOptions: [
			{ id: 'castle-king', label: 'O-O: complete king safety first', uci: 'e1g1' },
			{ id: 'capture-pawn', label: 'dxc5: trade pawns immediately', uci: 'd4c5' },
			{ id: 'push-pawn', label: 'e5: push and close the centre', uci: 'e4e5' },
		],
		refutationOptions: [
			{ id: 'black-counter-strikes', label: 'Black counter-strikes in the centre with ...e5 or ...d5.' },
			{ id: 'black-wins-queen', label: 'Black wins the queen by force.' },
			{ id: 'black-is-mated', label: 'Black is checkmated immediately.' },
		],
		expectedRefutation: 'black-counter-strikes', acceptableMoves: ['e1g1', 'd4c5', 'e4e5'],
	},
	{
		id: 'decision-pinned-piece', module: 'decision', type: 'decision', estimatedSeconds: 90,
		title: 'Respond to Pinned Piece Pressure', fen: pinnedThreatFen, bestMove: 'd1b3',
		opponentMove: '...Bb4', prompt: 'Black pins your c3 knight to the king. Find the best candidate moves.',
		threatOptions: threats, expectedThreat: 'pinned-defender',
		candidateOptions: [
			{ id: 'queen-counter', label: 'Qb3: counter-attack the b4 bishop and b7 pawn', uci: 'd1b3' },
			{ id: 'bishop-pin-break', label: 'Bd2: unpin the knight passively', uci: 'c1d2' },
			{ id: 'castle-king', label: 'O-O: ignore the pin and castle', uci: 'e1g1' },
		],
		refutationOptions: [
			{ id: 'black-trades-damages-structure', label: 'Black trades on c3 and doubles your c-pawns.' },
			{ id: 'black-loses-castling', label: 'Black loses castling rights.' },
			{ id: 'black-has-no-move', label: 'Black has no legal reply.' },
		],
		expectedRefutation: 'black-trades-damages-structure', acceptableMoves: ['d1b3', 'c1d2', 'e1g1'],
	},
	{
		id: 'decision-central-lever', module: 'decision', type: 'decision', estimatedSeconds: 90,
		title: 'Evaluate Central Leverage', fen: centralBreakFen, bestMove: 'b2b3',
		opponentMove: '...d5', prompt: 'The position has reached maximum central tension. Calculate your key candidate moves.',
		threatOptions: threats, expectedThreat: 'central-break',
		candidateOptions: [
			{ id: 'fianchetto-prep', label: 'b3: prepare Ba3 or Bb2 to control long diagonal', uci: 'b2b3' },
			{ id: 'pawn-exchange', label: 'cxd5: resolve tension by taking on d5', uci: 'c4d5' },
			{ id: 'rook-centralize', label: 'Re1: centralize the rook behind the e-pawn', uci: 'f1e1' },
		],
		refutationOptions: [
			{ id: 'black-simplifies', label: 'Black simplifies the position with ...dxc4 or ...Nxd5.' },
			{ id: 'black-drops-queen', label: 'Black drops the queen on the spot.' },
			{ id: 'black-is-stalemated', label: 'Black is stalemated.' },
		],
		expectedRefutation: 'black-simplifies', acceptableMoves: ['b2b3', 'c4d5', 'f1e1'],
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
