import type { ImportedChessComGame, MistakeAnalysisJob, PersonalMistakeExercise } from '$lib/chesscom/types';
import type { SRSEntry } from '$lib/srs/sm2';
import type { TrainingAttempt, TrainingModuleId } from '$lib/learning/trainingTypes';

export interface SkillRatingRecord {
	userId: string;
	skill: string;
	subType: string;
	elo: number;
	updatedAt: number;
}

export interface LearningRecordRepository {
	listRatings(userId: string): Promise<SkillRatingRecord[]>;
	putRating(record: SkillRatingRecord): Promise<void>;
	listAttempts(userId: string): Promise<TrainingAttempt[]>;
	putAttempt(attempt: TrainingAttempt): Promise<void>;
	listSrsCards(userId: string): Promise<Record<string, SRSEntry>>;
	putSrsCard(userId: string, exerciseId: string, card: SRSEntry): Promise<void>;
}

export interface UserContentRepository {
	listGames(userId: string, playerId: number): Promise<ImportedChessComGame[]>;
	putGames(userId: string, games: ImportedChessComGame[]): Promise<void>;
	getAnalysisJob(userId: string, playerId: number): Promise<MistakeAnalysisJob | null>;
	putAnalysisJob(job: MistakeAnalysisJob): Promise<void>;
	listMistakes(userId: string, playerId: number): Promise<PersonalMistakeExercise[]>;
	putMistakes(userId: string, mistakes: PersonalMistakeExercise[]): Promise<void>;
}

export interface PuzzleShardManifest {
	version: number;
	shards: readonly PuzzleShardDescriptor[];
}

export interface PuzzleShardDescriptor {
	id: string;
	url: string;
	minRating: number;
	maxRating: number;
	tags: readonly string[];
	count: number;
}

export interface SharedPuzzleRepository {
	getManifest(signal?: AbortSignal): Promise<PuzzleShardManifest>;
	getShard(id: string, signal?: AbortSignal): Promise<unknown>;
}

export interface TrainingStorage {
	learning: LearningRecordRepository;
	userContent: UserContentRepository;
	sharedPuzzles: SharedPuzzleRepository;
}

export function ratingKey(skill: string, subType: string): string {
	return `${skill}:${subType}`;
}

export function moduleForSource(source: string): TrainingModuleId {
	if (source === 'personal-game') return 'mistakes';
	if (source === 'lichess') return 'tactics';
	return 'tactics';
}
