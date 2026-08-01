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
  persistRating() {
    return Promise.resolve();
  }
};
