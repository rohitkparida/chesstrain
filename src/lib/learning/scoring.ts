import {
	ASSISTANCE_SCORE_MULTIPLIER,
	type AssistanceLevel,
	type TrainingAttempt
} from './trainingTypes';

export interface FractionalScoreInput {
	correctness: number;
	assistance?: AssistanceLevel;
	completion?: number;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
	return Math.min(maximum, Math.max(minimum, value));
}

export function fractionalScore(input: FractionalScoreInput): number {
	const correctness = clamp(input.correctness);
	const completion = clamp(input.completion ?? 1);
	const assistance = input.assistance ?? 'none';
	return Number((correctness * completion * ASSISTANCE_SCORE_MULTIPLIER[assistance]).toFixed(4));
}

export function attemptIsUnassisted(attempt: Pick<TrainingAttempt, 'assistance'>): boolean {
	return attempt.assistance === 'none';
}

export function createTrainingAttempt(params: {
	id: string;
	userId: string;
	exerciseId: string;
	module: TrainingAttempt['module'];
	correct: boolean;
	correctness?: number;
	completion?: number;
	assistance?: AssistanceLevel;
	startedAt: number;
	completedAt: number;
	tags?: readonly string[];
	result?: TrainingAttempt['result'];
	scheduledAt?: number;
}): TrainingAttempt {
	const assistance = params.assistance ?? 'none';
	return {
		id: params.id,
		userId: params.userId,
		exerciseId: params.exerciseId,
		module: params.module,
		score: fractionalScore({ correctness: params.correctness ?? (params.correct ? 1 : 0), assistance, completion: params.completion }),
		assistance,
		startedAt: params.startedAt,
		completedAt: params.completedAt,
		durationMs: Math.max(0, params.completedAt - params.startedAt),
		correct: params.correct,
		result: params.result,
		tags: params.tags,
		scheduledAt: params.scheduledAt
	};
}
