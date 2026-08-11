import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_ACCOUNTS } from './localAuth';
import { defaultProfile, localProfileRepository, profileInitials, sanitizeProfile } from './profile';

describe('local profile', () => {
  beforeEach(() => localStorage.clear());

  it('sanitizes malformed profile data and bounds editable text', () => {
    const profile = sanitizeProfile({
      displayName: `  ${'A'.repeat(80)} `,
      chessComUsername: '  player  ',
      theme: 'unknown'
    });

    expect(profile.displayName).toHaveLength(50);
    expect(profile.chessComUsername).toBe('player');
    expect(profile.theme).toBe(defaultProfile.theme);
    expect(profile.showDefinitions).toBe(true);
  });

  it('preserves the beginner definition preference', () => {
    expect(sanitizeProfile({ showDefinitions: false }).showDefinitions).toBe(false);
  });

  it('migrates older profiles into the one-time onboarding state', () => {
    expect(sanitizeProfile({ displayName: 'Rohit' }).onboardingCompletedAt).toBeNull();
    expect(sanitizeProfile({ onboardingCompletedAt: 123 }).onboardingCompletedAt).toBe(123);
  });

  it('uses readable initials and a stable fallback', () => {
    expect(profileInitials({ ...defaultProfile, displayName: 'Rohit Kumar' })).toBe('RK');
    expect(profileInitials({ ...defaultProfile, displayName: '' })).toBe('ME');
  });

  it('keeps account profiles separate', () => {
    const [first, second] = LOCAL_ACCOUNTS;
    localProfileRepository.write(first.username, { ...defaultProfile, displayName: 'First' });
    expect(localProfileRepository.read(second.username)).toMatchObject({
      displayName: second.username,
      chessComUsername: second.chessComUsername
    });
  });

  it('uses the account defaults when a scoped profile is malformed', () => {
    const secondary = LOCAL_ACCOUNTS[1];
    localStorage.setItem(`magnus_profile:${secondary.username}`, JSON.stringify({ displayName: 42 }));

    expect(localProfileRepository.read(secondary.username)).toMatchObject({
      displayName: secondary.username,
      chessComUsername: secondary.chessComUsername
    });
  });
});
