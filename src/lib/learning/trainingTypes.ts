import type { Puzzle } from '../../stores/session';

export const TRAINING_MODULE_IDS = [
	'board-grip',
	'tactics',
	'openings',
	'calculation',
	'positional',
	'decision',
	'endgame',
	'mistakes'
] as const;

export type TrainingModuleId = (typeof TRAINING_MODULE_IDS)[number];

export type TrainingExerciseType = TrainingModuleId;

export type AssistanceLevel = 'none' | 'hint' | 'guided' | 'solution';

export type ExerciseSource = 'curated' | 'lichess' | 'personal-game' | 'repertoire' | 'generated' | 'tablebase';
export type ExerciseVerification = 'curated' | 'stockfish' | 'tablebase';
export type ExerciseMemoryMode = 'exact-position' | 'concept-variation';

export const ASSISTANCE_SCORE_MULTIPLIER: Record<AssistanceLevel, number> = {
	none: 1,
	hint: 0.75,
	guided: 0.5,
	solution: 0
};

export interface TrainingExerciseBase {
	id: string;
	module: TrainingModuleId;
	type: TrainingExerciseType;
	title?: string;
	tags?: readonly string[];
	estimatedSeconds: number;
	difficulty?: number;
	source?: ExerciseSource;
	verification?: ExerciseVerification;
	conceptIds?: readonly string[];
	positionFingerprint?: string;
	generationVersion?: string;
	memoryMode?: ExerciseMemoryMode;
}

export interface BoardGripExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'board-grip';
	type: 'board-grip';
	kind?: 'name-square' | 'attackers' | 'loose-pieces' | 'pinned-pieces';
	fen?: string;
	prompt?: string;
	answers?: readonly string[];
}

export interface TacticsExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'tactics';
	type: 'tactics';
	puzzle?: Puzzle;
}

export interface OpeningsExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'openings';
	type: 'openings';
	opening?: string;
	moves?: readonly string[];
	concept?: string;
}

export interface CalculationExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'calculation';
	type: 'calculation';
	fen?: string;
	solution?: readonly string[];
}

export interface PositionalExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'positional';
	type: 'positional';
	fen?: string;
	planOptions?: readonly string[];
}

export interface DecisionExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'decision';
	type: 'decision';
	fen?: string;
	bestMove?: string;
}

export interface EndgameExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'endgame';
	type: 'endgame';
	fen?: string;
	goal?: string;
}

export interface MistakesExercise extends Omit<TrainingExerciseBase, 'module' | 'type'> {
	module: 'mistakes';
	type: 'mistakes';
	fen?: string;
	playedMove?: string;
	bestMove?: string;
}

export type TrainingExercise =
	| BoardGripExercise
	| TacticsExercise
	| OpeningsExercise
	| CalculationExercise
	| PositionalExercise
	| DecisionExercise
	| EndgameExercise
	| MistakesExercise;

export interface TrainingAttempt {
	id: string;
	userId: string;
	exerciseId: string;
	module: TrainingModuleId;
	score: number;
	assistance: AssistanceLevel;
	startedAt: number;
	completedAt: number;
	durationMs: number;
	correct?: boolean;
	result?: 'correct' | 'incorrect' | 'slow';
	tags?: readonly string[];
	scheduledAt?: number;
	positionFingerprint?: string;
	conceptIds?: readonly string[];
	source?: ExerciseSource;
}

export type DailyPlanReason = 'due-review' | 'weakest-unlocked' | 'new';

export interface DailyPlanItem {
	exerciseId: string;
	module: TrainingModuleId;
	reason: DailyPlanReason;
	estimatedSeconds: number;
	priority: number;
}

export interface DailyPlan {
	version: 1;
	userId: string;
	dateKey: string;
	targetMinutes: number;
	items: DailyPlanItem[];
}

export interface ModuleProgress {
	module: TrainingModuleId;
	unlocked: boolean;
	mastered: boolean;
	masteryScore: number | null;
	attemptCount: number;
	unassistedAttemptCount: number;
	recentScores: number[];
	lastAttemptAt: number | null;
}

export const MODULE_PREREQUISITES: Readonly<Record<TrainingModuleId, readonly TrainingModuleId[]>> = {
	'board-grip': [],
	tactics: ['board-grip'],
	openings: ['board-grip'],
	calculation: ['tactics', 'openings'],
	positional: ['calculation'],
	decision: ['positional'],
	endgame: ['positional'],
	mistakes: []
};

export function isAssistanceLevel(value: unknown): value is AssistanceLevel {
	return value === 'none' || value === 'hint' || value === 'guided' || value === 'solution';
}

export function isTrainingModuleId(value: unknown): value is TrainingModuleId {
	return typeof value === 'string' && (TRAINING_MODULE_IDS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTrainingAttempt(value: unknown): value is TrainingAttempt {
	if (!isRecord(value)) return false;
	return typeof value.id === 'string'
		&& typeof value.userId === 'string'
		&& typeof value.exerciseId === 'string'
		&& isTrainingModuleId(value.module)
		&& typeof value.score === 'number'
		&& Number.isFinite(value.score)
		&& value.score >= 0
		&& value.score <= 1
		&& isAssistanceLevel(value.assistance)
		&& typeof value.startedAt === 'number'
		&& Number.isFinite(value.startedAt)
		&& typeof value.completedAt === 'number'
		&& Number.isFinite(value.completedAt)
		&& typeof value.durationMs === 'number'
		&& Number.isFinite(value.durationMs);
}

export function isDailyPlan(value: unknown): value is DailyPlan {
	if (!isRecord(value) || value.version !== 1) return false;
	return typeof value.userId === 'string'
		&& typeof value.dateKey === 'string'
		&& typeof value.targetMinutes === 'number'
		&& Number.isFinite(value.targetMinutes)
		&& Array.isArray(value.items)
		&& value.items.every((item) => {
			if (!isRecord(item)) return false;
			return typeof item.exerciseId === 'string'
				&& isTrainingModuleId(item.module)
				&& (item.reason === 'due-review' || item.reason === 'weakest-unlocked' || item.reason === 'new')
				&& typeof item.estimatedSeconds === 'number'
				&& Number.isFinite(item.estimatedSeconds)
				&& typeof item.priority === 'number'
				&& Number.isFinite(item.priority);
		});
}

export function moduleIdForSkill(skill: string): TrainingModuleId {
	if (skill === 'squares' || skill === 'boardGrip' || skill === 'board-grip') return 'board-grip';
	if (skill === 'opening' || skill === 'openings') return 'openings';
	if (skill === 'mistakes' || skill === 'game-mistakes') return 'mistakes';
	if (isTrainingModuleId(skill)) return skill;
	return 'tactics';
}
