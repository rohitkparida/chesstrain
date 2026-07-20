import { updateSkillElo } from '$lib/db/supabase';

export interface SessionRepository {
  persistRating(
    userId: string,
    skill: string,
    subType: string,
    elo: number
  ): Promise<unknown>;
}

/** Persistence boundary for session progress. The store remains state-only. */
export const sessionRepository: SessionRepository = {
  persistRating(userId, skill, subType, elo) {
    return updateSkillElo(userId, skill, subType, elo);
  }
};
