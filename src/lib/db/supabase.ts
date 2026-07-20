export async function updateSkillElo(
  userId: string,
  skill: string,
  subType: string,
  newElo: number
) {
  if (typeof window === 'undefined') return { data: null };
  const ratingsKey = `magnus_skill_ratings:${userId}`;
  let list: Array<{ skill: string; sub_type: string; elo: number }> = [];
  try {
    const raw = localStorage.getItem(ratingsKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      list = parsed.filter((item): item is { skill: string; sub_type: string; elo: number } =>
        typeof item === 'object' && item !== null
        && typeof item.skill === 'string'
        && typeof item.sub_type === 'string'
        && typeof item.elo === 'number'
      );
    }
  } catch {}
  
  const existingIdx = list.findIndex(x => x.skill === skill && x.sub_type === subType);
  if (existingIdx > -1) {
    list[existingIdx].elo = newElo;
  } else {
    list.push({ skill, sub_type: subType, elo: newElo });
  }
  
  localStorage.setItem(ratingsKey, JSON.stringify(list));
  return { data: list, error: null };
}
