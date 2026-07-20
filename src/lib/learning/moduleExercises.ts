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

function calculationExercises(): readonly ValidatedExercise[] {
  return CALCULATION_EXERCISES.map((exercise: CalculationExerciseContent) => validate({ ...exercise, source: 'curated', verification: 'stockfish', conceptIds: exercise.tags }, exercise.concept, 'curated', 'stockfish')).filter((exercise): exercise is ValidatedExercise => exercise !== null);
}

function positionalExercises(): readonly ValidatedExercise[] {
  return POSITIONAL_EXERCISES.map((exercise: PositionalExerciseContent) => validate({ ...exercise, source: 'curated', verification: 'stockfish', conceptIds: exercise.tags }, exercise.prompt, 'curated', 'stockfish')).filter((exercise): exercise is ValidatedExercise => exercise !== null);
}

function decisionExercises(): readonly ValidatedExercise[] {
  return DECISION_SCENARIOS.map((exercise: DecisionScenario) => validate({ ...exercise, source: 'curated', verification: 'stockfish', conceptIds: ['decision:process'] }, exercise.prompt, 'curated', 'stockfish')).filter((exercise): exercise is ValidatedExercise => exercise !== null);
}

function endgameExercises(): readonly ValidatedExercise[] {
  return ENDGAME_SCENARIOS.map((exercise: EndgameScenario) => validate({ ...exercise, source: 'curated', verification: 'stockfish', conceptIds: ['endgame:technique'] }, exercise.goal ?? exercise.title ?? exercise.id, 'curated', 'stockfish')).filter((exercise): exercise is ValidatedExercise => exercise !== null);
}

const curated: readonly ValidatedExercise[] = [
  ...calculationExercises(), ...positionalExercises(), ...decisionExercises(), ...endgameExercises(),
  ...DAILY_PLAN_EXERCISES.map((exercise) => validate(exercise, exercise.title ?? exercise.id, exercise.source ?? 'curated', exercise.verification ?? 'curated')).filter((exercise): exercise is ValidatedExercise => exercise !== null)
];

export function validatedExercises(module?: TrainingModuleId): readonly ValidatedExercise[] {
  const result = curated.filter((exercise) => !module || exercise.module === module);
  return result.filter((exercise, index, all) => all.findIndex((candidate) => candidate.positionFingerprint === exercise.positionFingerprint) === index);
}
