import type { ImportedChessComGame, MistakeAnalysisJob, PersonalMistakeExercise } from '$lib/chesscom/types';
import type { SRSEntry } from '$lib/srs/sm2';
import type { TrainingAttempt } from '$lib/learning/trainingTypes';
import type { LearningRecordRepository, UserContentRepository } from './contracts';

function read<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback;
	try {
		const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
		return value === null ? fallback : value as T;
	} catch { return fallback; }
}

function write(key: string, value: unknown): void {
	if (typeof window === 'undefined') return;
	try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local persistence is best effort */ }
}

function scoped(userId: string, name: string): string { return `magnus:${name}:${userId}`; }

export function createLocalLearningRepository(): LearningRecordRepository {
	return {
		async listRatings(userId) { return read(scoped(userId, 'ratings'), []); },
		async putRating(record) {
			const records = read<ReturnType<LearningRecordRepository['listRatings']> extends Promise<infer T> ? T : never>(scoped(record.userId, 'ratings'), []);
			const next = [...records.filter((item) => item.skill !== record.skill || item.subType !== record.subType), record];
			write(scoped(record.userId, 'ratings'), next);
		},
		async listAttempts(userId) { return read<TrainingAttempt[]>(scoped(userId, 'attempts'), []); },
		async putAttempt(attempt) {
			const records = read<TrainingAttempt[]>(scoped(attempt.userId, 'attempts'), []);
			if (!records.some((item) => item.id === attempt.id)) write(scoped(attempt.userId, 'attempts'), [...records, attempt].slice(-1000));
		},
		async listSrsCards(userId) { return read<Record<string, SRSEntry>>(scoped(userId, 'srs'), {}); },
		async putSrsCard(userId, exerciseId, card) {
			const cards = read<Record<string, SRSEntry>>(scoped(userId, 'srs'), {});
			write(scoped(userId, 'srs'), { ...cards, [exerciseId]: card });
		}
	};
}

export function createLocalUserContentRepository(): UserContentRepository {
	const bucket = (userId: string, playerId: number, name: string) => scoped(`${userId}:${playerId}`, name);
	return {
		async listGames(userId, playerId) { return read<ImportedChessComGame[]>(bucket(userId, playerId, 'games'), []); },
		async putGames(userId, games) {
			if (!games.length) return;
			const current = read<ImportedChessComGame[]>(bucket(userId, 0, 'games'), []);
			const playerId = Number(games[0]?.id.split(':')[0]) || 0;
			const merged = [...new Map([...current, ...games].map((game) => [game.id, game])).values()];
			write(bucket(userId, playerId, 'games'), merged);
		},
		async getAnalysisJob(userId, playerId) { return read<MistakeAnalysisJob | null>(bucket(userId, playerId, 'job'), null); },
		async putAnalysisJob(job) { write(bucket(job.userId, job.playerId, 'job'), job); },
		async listMistakes(userId, playerId) { return read<PersonalMistakeExercise[]>(bucket(userId, playerId, 'mistakes'), []); },
		async putMistakes(userId, mistakes) {
			if (!mistakes.length) return;
			const playerId = Number(mistakes[0]?.gameId.split(':')[0]) || 0;
			const current = read<PersonalMistakeExercise[]>(bucket(userId, playerId, 'mistakes'), []);
			write(bucket(userId, playerId, 'mistakes'), [...new Map([...current, ...mistakes].map((mistake) => [mistake.id, mistake])).values()]);
		}
	};
}
