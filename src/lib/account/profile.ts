export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserProfile {
  displayName: string;
  chessComUsername: string;
  theme: ThemePreference;
  showDefinitions: boolean;
  difficultyOffset: number;
  onboardingCompletedAt: number | null;
}

export const PROFILE_STORAGE_KEY = 'magnus_profile';

export function defaultProfileFor(username: string): UserProfile {
  const account = LOCAL_ACCOUNTS.find((candidate) => candidate.username === username) ?? LOCAL_ACCOUNTS[0];
  return { displayName: account.username, chessComUsername: account.chessComUsername, theme: 'system', showDefinitions: true, difficultyOffset: 0, onboardingCompletedAt: null };
}

export const defaultProfile: UserProfile = defaultProfileFor(LOCAL_ACCOUNT_USERNAME);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeProfile(value: unknown): UserProfile {
  if (!isRecord(value)) return { ...defaultProfile };

  const theme = value.theme === 'light' || value.theme === 'dark' || value.theme === 'system'
    ? value.theme
    : defaultProfile.theme;

  return {
    displayName: typeof value.displayName === 'string' ? value.displayName.trim().slice(0, 50) : '',
    chessComUsername: typeof value.chessComUsername === 'string'
      ? value.chessComUsername.trim().slice(0, 50)
      : '',
    theme,
    showDefinitions: typeof value.showDefinitions === 'boolean' ? value.showDefinitions : true
		,difficultyOffset: typeof value.difficultyOffset === 'number' && Number.isFinite(value.difficultyOffset)
			? Math.max(-300, Math.min(300, Math.round(value.difficultyOffset)))
			: 0
    ,onboardingCompletedAt: typeof value.onboardingCompletedAt === 'number' && Number.isFinite(value.onboardingCompletedAt)
      ? value.onboardingCompletedAt
      : null
  };
}

export interface ProfileRepository {
  read(username: string): UserProfile;
  write(username: string, profile: UserProfile): void;
  clear(username: string): void;
}

export const localProfileRepository: ProfileRepository = {
  read(username) {
    const fallback = defaultProfileFor(username);
    if (typeof window === 'undefined') return fallback;
    try {
      const scopedKey = `${PROFILE_STORAGE_KEY}:${username}`;
      let raw = localStorage.getItem(scopedKey);
      if (!raw && username === LOCAL_ACCOUNT_USERNAME) {
        raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (raw) {
          localStorage.setItem(scopedKey, raw);
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      }
      if (!raw) return fallback;
      const profile = sanitizeProfile(raw ? JSON.parse(raw) : null);
      if (!profile.displayName && !profile.chessComUsername) {
        return { ...fallback, theme: profile.theme };
      }
      return profile;
    } catch {
      return fallback;
    }
  },
  write(username, profile) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${PROFILE_STORAGE_KEY}:${username}`, JSON.stringify(sanitizeProfile(profile)));
    } catch {
      // Profile editing should not break training when storage is unavailable.
    }
  },
  clear(username) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${PROFILE_STORAGE_KEY}:${username}`);
    } catch {
      // Ignore unavailable storage.
    }
  }
};

export function profileInitials(profile: UserProfile): string {
  const name = profile.displayName.trim();
  if (!name) return 'ME';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
import { LOCAL_ACCOUNT_USERNAME, LOCAL_ACCOUNTS } from './localAuth';
