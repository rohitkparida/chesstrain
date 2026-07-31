import { DEFAULT_USERNAME } from '$lib/account/keys';

export function readJson<T>(key: string, validate: (raw: unknown) => T | null): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed: unknown = JSON.parse(item);
    return validate(parsed);
  } catch {
    return null;
  }
}

export function writeJson<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage availability issues
  }
}

export function readScopedStorageItem(
  baseKey: string,
  username: string = DEFAULT_USERNAME
): string | null {
  if (typeof window === 'undefined') return null;
  const scopedKey = `${baseKey}:${username}`;
  try {
    let raw = localStorage.getItem(scopedKey);
    if (!raw && username === DEFAULT_USERNAME) {
      raw = localStorage.getItem(baseKey);
      if (raw) {
        localStorage.setItem(scopedKey, raw);
        localStorage.removeItem(baseKey);
      }
    }
    return raw;
  } catch {
    return null;
  }
}
