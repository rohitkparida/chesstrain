import { Chess } from 'chess.js';
import { DAILY_PLAN_EXERCISES } from '../../components/trainingCatalog';
import { CALCULATION_EXERCISES, type CalculationExerciseContent } from '../modules/calculationContent';
import { POSITIONAL_EXERCISES, type PositionalExerciseContent } from '../modules/positionalContent';
import { DECISION_SCENARIOS, type DecisionScenario } from '../modules/decisionContent';
import { ENDGAME_SCENARIOS, type EndgameScenario } from '../modules/endgameContent';
import type { TrainingExercise, TrainingModuleId } from './trainingTypes';
import { exerciseFingerprint } from './generator';

export type ValidatedExercise = TrainingExercise & { positionFingerprint: string; source: NonNullable<TrainingExercise['source']>; verification: NonNullable<TrainingExercise['verification']> };

function validFen(fen: string | undefined): boolean {
  if (!fen) return true;
  try { new Chess(fen); return true; } catch { return false; }
}

function fenForExercise(exercise: TrainingExercise): string | undefined {
  return 'fen' in exercise && typeof exercise.fen === 'string' ? exercise.fen : undefined;
}

function validate(exercise: TrainingExercise, prompt: string, source: NonNullable<ValidatedExercise['source']>, verification: NonNullable<ValidatedExercise['verification']>): ValidatedExercise | null {
  const fen = fenForExercise(exercise);
  if (!validFen(fen)) return null;
  return { ...exercise, source, verification, positionFingerprint: exercise.positionFingerprint ?? exerciseFingerprint(fen ?? '', prompt, exercise.module) } as ValidatedExercise;
}

function validateList<T>(
	items: readonly T[],
	toExercise: (item: T) => { exercise: TrainingExercise; prompt: string; conceptIds?: readonly string[] }
): ValidatedExercise[] {
	return items
		.map((item) => {
			const { exercise, prompt, conceptIds } = toExercise(item);
			return validate(
				{ ...exercise, source: 'curated', verification: 'stockfish', ...(conceptIds ? { conceptIds } : {}) },
				prompt,
				'curated',
				'stockfish'
			);
		})
		.filter((exercise): exercise is ValidatedExercise => exercise !== null);
}

function calculationExercises(): readonly ValidatedExercise[] {
	return validateList(CALCULATION_EXERCISES, (exercise: CalculationExerciseContent) => ({
		exercise,
		prompt: exercise.concept,
		conceptIds: exercise.tags
	}));
}

function positionalExercises(): readonly ValidatedExercise[] {
	return validateList(POSITIONAL_EXERCISES, (exercise: PositionalExerciseContent) => ({
		exercise,
		prompt: exercise.prompt,
		conceptIds: exercise.tags
	}));
}

function decisionExercises(): readonly ValidatedExercise[] {
	return validateList(DECISION_SCENARIOS, (exercise: DecisionScenario) => ({
		exercise,
		prompt: exercise.prompt,
		conceptIds: ['decision:process']
	}));
}

function endgameExercises(): readonly ValidatedExercise[] {
	return validateList(ENDGAME_SCENARIOS, (exercise: EndgameScenario) => ({
		exercise,
		prompt: exercise.goal ?? exercise.title ?? exercise.id,
		conceptIds: ['endgame:technique']
	}));
}

const curated: readonly ValidatedExercise[] = [
  ...calculationExercises(), ...positionalExercises(), ...decisionExercises(), ...endgameExercises(),
  ...DAILY_PLAN_EXERCISES.map((exercise) => validate(exercise, exercise.title ?? exercise.id, exercise.source ?? 'curated', exercise.verification ?? 'curated')).filter((exercise): exercise is ValidatedExercise => exercise !== null)
];

export function validatedExercises(module?: TrainingModuleId): readonly ValidatedExercise[] {
  const result = curated.filter((exercise) => !module || exercise.module === module);
  return result.filter((exercise, index, all) => all.findIndex((candidate) => candidate.positionFingerprint === exercise.positionFingerprint) === index);
}
