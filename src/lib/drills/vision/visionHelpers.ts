import type { AssistanceLevel, DrillAssessment, DrillContext, DrillDefinition } from '../types';
import { NONE_ANSWER_RATE, makeBoardGripRound, randomBoardGripView, type BoardGripKind } from '$lib/learning/boardGrip';
import { randomRealisticFen } from '$lib/learning/nameTheSquare';
import type { DrillMeta } from '../metadata';

export function extractTargetSquare(previousFingerprint?: string): string | undefined {
	if (!previousFingerprint) return undefined;
	if (/^[a-h][1-8]$/i.test(previousFingerprint)) {
		return previousFingerprint.toLowerCase();
	}
	const parts = previousFingerprint.split(':');
	if (parts.length > 1 && /^[a-h][1-8]$/i.test(parts[1])) {
		return parts[1].toLowerCase();
	}
	return undefined;
}

export function assessSingleSquare(
	targetSquare: string,
	response: string | null,
	assistance?: AssistanceLevel
): DrillAssessment {
	if (assistance === 'solution' || !response) {
		return {
			score: 0,
			correct: false,
			feedback: `Gave up. Correct square: ${targetSquare}.`,
			reveal: targetSquare
		};
	}

	const normalizedResponse = response.trim().toLowerCase();
	const normalizedTarget = targetSquare.trim().toLowerCase();
	const correct = normalizedResponse === normalizedTarget;

	return {
		score: correct ? 1 : 0,
		correct,
		feedback: correct
			? 'Correct!'
			: `Incorrect. Expected ${targetSquare}, but got ${normalizedResponse}.`,
		reveal: targetSquare
	};
}

export function sampleSquareSelectionRound<T extends { answers: string[]; fen: string }>(
	context: DrillContext,
	makeRound: (fen: string) => T
): T {
	const wantNone = context.random() < NONE_ANSWER_RATE;
	let fen = randomRealisticFen('', context.random);
	let round = makeRound(fen);

	for (let attempt = 0; attempt < 12; attempt += 1) {
		if ((round.answers.length === 0) === wantNone) break;
		fen = randomRealisticFen(fen, context.random);
		round = makeRound(fen);
	}

	return round;
}

export function assessSquareSelection(
	targetSquares: string[],
	response: string[] | null,
	assistance?: AssistanceLevel,
	copy: { correct?: string; noneExpected?: string; expectedPrefix?: string } = {}
): DrillAssessment {
	if (assistance === 'solution' || !response) {
		const revealText = targetSquares.length === 0 ? 'none' : targetSquares.join(', ');
		return {
			score: 0,
			correct: false,
			feedback: `Gave up. Correct squares: ${revealText}.`,
			reveal: targetSquares
		};
	}

	const expected = new Set(targetSquares);
	const actual = new Set(response);
	const correct = expected.size === actual.size && [...expected].every((sq) => actual.has(sq));

	if (correct) {
		return {
			score: 1,
			correct: true,
			feedback: copy.correct ?? 'Correct square selection.',
			reveal: targetSquares
		};
	}

	if (targetSquares.length === 0) {
		return {
			score: 0,
			correct: false,
			feedback: copy.noneExpected ?? 'No squares matched the rule.',
			reveal: targetSquares
		};
	}

	const prefix = copy.expectedPrefix ?? 'Expected';
	return {
		score: 0,
		correct: false,
		feedback: `${prefix}: ${targetSquares.join(', ')}. Selected: ${response.length === 0 ? 'none' : response.join(', ')}.`,
		reveal: targetSquares
	};
}

export function createSelectionVisionDrill(config: {
	metadata?: DrillMeta<'square-select'>;
	id?: string;
	label?: string;
	description?: string;
	kind: 'loose-pieces' | 'pinned-pieces' | 'square-control';
	noneExpected: string;
}): DrillDefinition<'square-select'> {
	const id = config.metadata?.id ?? config.id!;
	const module = config.metadata?.module ?? 'board-grip';
	const label = config.metadata?.label ?? config.label!;
	const description = config.metadata?.description ?? config.description!;

	return {
		id,
		module,
		label,
		description,
		interaction: 'square-select',
		version: 1,
		generate(context) {
			const gripKind: BoardGripKind = config.kind === 'square-control' ? 'attackers' : config.kind;
			const round = sampleSquareSelectionRound(context, (fen) =>
				makeBoardGripRound(gripKind, fen, context.random)
			);
			const view = randomBoardGripView(gripKind, context.random);
			return {
				id: `${config.kind}-${Date.now()}-${context.random()}`,
				drillId: id,
				prompt: round.prompt,
				fen: round.fen,
				publicData: {
					fen: round.fen,
					orientation: view.orientation,
					rotation: view.rotation,
					markedSquare: round.targetSquare,
					allowNone: true
				},
				privateData: { targetSquares: round.answers },
				fingerprint: round.targetSquare
					? `${round.fen}:${round.targetSquare}:${round.answers.join(',')}`
					: `${round.fen}:${round.answers.join(',')}`,
				definitionVersion: 1
			};
		},
		evaluate(privateData, response, assistance) {
			return Promise.resolve(
				assessSquareSelection(privateData.targetSquares, response, assistance, {
					correct: 'Correct!',
					noneExpected: config.noneExpected,
					expectedPrefix: 'Incorrect. Expected'
				})
			);
		}
	};
}
