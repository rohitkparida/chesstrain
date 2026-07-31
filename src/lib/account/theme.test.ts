import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultProfile, localProfileRepository, PROFILE_STORAGE_KEY, resolveThemePreference } from './profile';
import { DEFAULT_USERNAME, LOCAL_AUTH_SESSION_KEY } from './keys';

describe('theme behavior and profile persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('localProfileRepository theme persistence', () => {
    it('persists theme per account under magnus_profile:<username>', () => {
      const username = 'testuser';
      const profile = { ...defaultProfile, theme: 'dark' as const };

      localProfileRepository.write(username, profile);

      const raw = localStorage.getItem(`${PROFILE_STORAGE_KEY}:${username}`);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toMatchObject({ theme: 'dark' });

      const readBack = localProfileRepository.read(username);
      expect(readBack.theme).toBe('dark');
    });

    it('updates persisted theme when write is called with new theme preference', () => {
      const username = 'testuser';
      localProfileRepository.write(username, { ...defaultProfile, theme: 'dark' as const });
      expect(localProfileRepository.read(username).theme).toBe('dark');

      localProfileRepository.write(username, { ...defaultProfile, theme: 'light' as const });
      expect(localProfileRepository.read(username).theme).toBe('light');
    });
  });

  describe('account isolation', () => {
    it('ensures writing theme for user A does not mutate user B profile theme', () => {
      const userA = 'user_alpha';
      const userB = 'user_beta';

      localProfileRepository.write(userA, { ...defaultProfile, theme: 'light' as const });
      localProfileRepository.write(userB, { ...defaultProfile, theme: 'dark' as const });

      expect(localProfileRepository.read(userA).theme).toBe('light');
      expect(localProfileRepository.read(userB).theme).toBe('dark');

      // Update user A
      localProfileRepository.write(userA, { ...defaultProfile, theme: 'system' as const });

      // User B remains unchanged
      expect(localProfileRepository.read(userA).theme).toBe('system');
      expect(localProfileRepository.read(userB).theme).toBe('dark');
    });
  });

  describe('anti-FOUC key lookup logic', () => {
    function resolveAntiFOUCTheme(): 'light' | 'dark' {
      try {
        const u = localStorage.getItem(LOCAL_AUTH_SESSION_KEY) || DEFAULT_USERNAME;
        const raw = localStorage.getItem(`${PROFILE_STORAGE_KEY}:${u}`) || localStorage.getItem(PROFILE_STORAGE_KEY);
        let t: 'system' | 'light' | 'dark' = 'system';
        if (raw) {
          const p = JSON.parse(raw);
          if (p && p.theme) t = p.theme;
        }
        return resolveThemePreference(t, Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches));
      } catch {
        return 'dark';
      }
    }

    it('resolves theme for active user in magnus_local_authenticated correctly', () => {
      localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'rohitkparida');
      localStorage.setItem(`${PROFILE_STORAGE_KEY}:rohitkparida`, JSON.stringify({ theme: 'light' }));
      localStorage.setItem(`${PROFILE_STORAGE_KEY}:shawttybad`, JSON.stringify({ theme: 'dark' }));

      expect(resolveAntiFOUCTheme()).toBe('light');

      localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'shawttybad');
      expect(resolveAntiFOUCTheme()).toBe('dark');
    });

    it('defaults to default account rohitkparida when unauthenticated', () => {
      localStorage.setItem(`${PROFILE_STORAGE_KEY}:${DEFAULT_USERNAME}`, JSON.stringify({ theme: 'light' }));
      expect(resolveAntiFOUCTheme()).toBe('light');
    });

    it('falls back to legacy magnus_profile key if active user scoped key is missing', () => {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ theme: 'light' }));
      expect(resolveAntiFOUCTheme()).toBe('light');
    });
  });

  describe('system theme resolution against matchMedia', () => {
    it('resolves system theme to light when prefers-color-scheme: light matches', () => {
      expect(resolveThemePreference('system', true)).toBe('light');
    });

    it('resolves system theme to dark when prefers-color-scheme: light does not match', () => {
      expect(resolveThemePreference('system', false)).toBe('dark');
    });

    it('always resolves explicit light or dark preference regardless of matchMedia', () => {
      expect(resolveThemePreference('light', false)).toBe('light');
      expect(resolveThemePreference('dark', true)).toBe('dark');
    });

    it('interacts with window.matchMedia correctly', () => {
      const matchMediaSpy = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-color-scheme: light'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }));
      vi.stubGlobal('matchMedia', matchMediaSpy);

      const media = window.matchMedia('(prefers-color-scheme: light)');
      expect(media.matches).toBe(true);

      const resolved = resolveThemePreference('system', media.matches);
      expect(resolved).toBe('light');

      vi.unstubAllGlobals();
    });
  });

  describe('document data-theme attribute application', () => {
    function applyTheme(isLight: boolean) {
      document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    }

    it('applies data-theme="light" when light mode is selected', () => {
      applyTheme(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('applies data-theme="dark" when dark mode is selected', () => {
      applyTheme(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
