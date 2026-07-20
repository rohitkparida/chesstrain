import { describe, expect, it } from 'vitest';
import { mistakeCacheKey, parseCachedMistakes, serializeMistakes } from './gameMistakes';

describe('game mistake cache', () => {
  it('round-trips account-scoped mistake data', () => {
    const raw = serializeMistakes('rohitkparida', 'rohit', [{ id: 'm1' }]);
    expect(mistakeCacheKey('rohitkparida')).toBe('magnus:mistakes:rohitkparida');
    expect(parseCachedMistakes<{ id: string }>(raw, 'rohitkparida')?.mistakes[0]?.id).toBe('m1');
    expect(parseCachedMistakes(raw, 'other')).toBeNull();
  });
});
