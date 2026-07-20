import type { TrainingExercise, TrainingModuleId } from './trainingTypes';
import type { TrainingAttempt } from './trainingTypes';
import type { SRSEntry } from '../srs/sm2';

export interface ExerciseGenerationRequest {
	module: TrainingModuleId;
	targetDifficulty?: number;
	conceptId?: string;
	excludeFingerprints?: ReadonlySet<string>;
	seed?: number;
}

export interface ExerciseGenerator {
	generate(request: ExerciseGenerationRequest): TrainingExercise | null;
}

export interface GeneratorPool {
	list(module: TrainingModuleId): readonly TrainingExercise[];
}

export function selectNextExercise(params: {
	pool: GeneratorPool;
	module: TrainingModuleId;
	attempts: readonly TrainingAttempt[];
	srs?: Readonly<Record<string, SRSEntry>>;
	now?: number;
	targetDifficulty?: number;
}): TrainingExercise | null {
	const now = params.now ?? Date.now();
	const recent = recentFingerprints(params.attempts);
	const due = params.pool.list(params.module).filter((exercise) => {
		const schedule = params.srs?.[exercise.id];
		return schedule?.nextScheduledDate !== undefined && schedule.nextScheduledDate <= now;
	});
	const generator = new PoolExerciseGenerator({ list: () => due.length > 0 ? due : params.pool.list(params.module) });
	return generator.generate({ module: params.module, targetDifficulty: params.targetDifficulty, excludeFingerprints: due.length > 0 ? new Set() : recent });
}

function hashSeed(value: string): number {
	let hash = 2166136261;
	for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
	return hash >>> 0;
}

function pickIndex(length: number, seed: number): number {
	return length === 0 ? 0 : Math.abs(seed) % length;
}

export class PoolExerciseGenerator implements ExerciseGenerator {
	constructor(private readonly pool: GeneratorPool) {}

	generate(request: ExerciseGenerationRequest): TrainingExercise | null {
		const excluded = request.excludeFingerprints ?? new Set<string>();
		const target = request.targetDifficulty ?? 1200;
		const candidates = this.pool.list(request.module)
			.filter((exercise) => !request.conceptId || exercise.conceptIds?.includes(request.conceptId))
			.filter((exercise) => !exercise.positionFingerprint || !excluded.has(exercise.positionFingerprint))
			.slice()
			.sort((a, b) => Math.abs((a.difficulty ?? target) - target) - Math.abs((b.difficulty ?? target) - target));
		if (candidates.length === 0) return null;
		const seed = request.seed ?? hashSeed(`${request.module}:${request.conceptId ?? ''}:${target}`);
		return candidates[pickIndex(candidates.length, seed)];
	}
}

export function exerciseFingerprint(fen: string, prompt: string, module: TrainingModuleId): string {
	return `${module}:${fen.trim().split(/\s+/).slice(0, 4).join(' ')}:${prompt.trim().toLowerCase()}`;
}

export function recentFingerprints(attempts: readonly { positionFingerprint?: string; completedAt: number }[], limit = 30): Set<string> {
	return new Set(attempts.filter((attempt) => attempt.positionFingerprint).slice().sort((a, b) => b.completedAt - a.completedAt).slice(0, limit).map((attempt) => attempt.positionFingerprint!));
}
