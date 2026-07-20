import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOCAL_ACCOUNT_USERNAME,
  LOCAL_ACCOUNTS,
  LOCAL_CREDENTIAL_KEY,
  localAuthRepository,
  passwordValidationError
} from './localAuth';

describe('local account password', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts locked with the common default password configured', async () => {
    expect(localAuthRepository.hasPassword(LOCAL_ACCOUNT_USERNAME)).toBe(true);
    expect(localAuthRepository.isAuthenticated(LOCAL_ACCOUNT_USERNAME)).toBe(false);
    expect(await localAuthRepository.signIn(LOCAL_ACCOUNT_USERNAME, 'magnus123')).toBe(true);
  });

  it('stores a salted hash and unlocks only with the correct password', async () => {
    expect(localAuthRepository.hasPassword(LOCAL_ACCOUNT_USERNAME)).toBe(true);
    const stored = localStorage.getItem(`${LOCAL_CREDENTIAL_KEY}:${LOCAL_ACCOUNT_USERNAME}`) ?? '';
    expect(stored).not.toContain('magnus123');

    localAuthRepository.signOut();
    expect(localAuthRepository.isAuthenticated(LOCAL_ACCOUNT_USERNAME)).toBe(false);
    expect(await localAuthRepository.signIn(LOCAL_ACCOUNT_USERNAME, 'wrong password')).toBe(false);
    expect(await localAuthRepository.signIn(LOCAL_ACCOUNT_USERNAME, 'magnus123')).toBe(true);
  });

  it('requires the current password before replacing an existing one', async () => {
    await expect(localAuthRepository.setPassword(LOCAL_ACCOUNT_USERNAME, 'second password', 'wrong password'))
      .rejects.toThrow('Current password is incorrect.');
    await localAuthRepository.setPassword(LOCAL_ACCOUNT_USERNAME, 'second password', 'magnus123');
    localAuthRepository.signOut();
    expect(await localAuthRepository.signIn(LOCAL_ACCOUNT_USERNAME, 'second password')).toBe(true);
  }, 20_000);

  it('keeps manually provisioned accounts isolated', async () => {
    const secondUsername = LOCAL_ACCOUNTS[1].username;
    await localAuthRepository.setPassword(LOCAL_ACCOUNT_USERNAME, 'first password', 'magnus123');
    expect(await localAuthRepository.signIn(secondUsername, 'first password')).toBe(false);
    expect(await localAuthRepository.signIn(secondUsername, 'magnus123')).toBe(true);
    expect(localAuthRepository.activeUsername()).toBe(secondUsername);
  }, 15_000);

  it('rejects passwords outside the supported length', () => {
    expect(passwordValidationError('short')).toBe('Use at least 8 characters.');
    expect(passwordValidationError('long enough')).toBeNull();
  });
});
