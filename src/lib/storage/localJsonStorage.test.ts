import { describe, expect, it, beforeEach } from 'vitest';
import { readJson, writeJson, removeStorageKey } from './localJsonStorage';

describe('localJsonStorage helper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes and reads validated JSON data', () => {
    const key = 'test_key';
    const data = ['a', 'b', 'c'];

    expect(writeJson(key, data)).toBe(true);

    const read = readJson(key, (raw) => {
      if (Array.isArray(raw)) return raw as string[];
      return null;
    });

    expect(read).toEqual(['a', 'b', 'c']);
  });

  it('returns null on invalid or missing storage key', () => {
    const read = readJson('missing_key', () => 'fallback');
    expect(read).toBeNull();
  });

  it('removes storage key cleanly', () => {
    writeJson('temp', { ok: true });
    removeStorageKey('temp');
    expect(localStorage.getItem('temp')).toBeNull();
  });
});
