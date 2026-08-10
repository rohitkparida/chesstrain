import { describe, expect, it, vi } from 'vitest';
import { createCloudAuthRepository, usernameEmail } from './cloudAuth';

describe('cloud auth', () => {
  it('maps usernames to stable internal auth emails', () => {
    expect(usernameEmail(' RohitKparida ')).toBe('rohitkparida@auth.chesstrain.local');
    expect(() => usernameEmail('bad space')).toThrow();
  });

  it('signs in with username/password and maps metadata', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'xx@auth.chesstrain.local', user_metadata: { username: 'xx' } } }, error: null });
    const client = { auth: { signInWithPassword } } as any;
    await expect(createCloudAuthRepository(client).signIn('XX', 'password')).resolves.toMatchObject({ id: 'u1', username: 'xx' });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'xx@auth.chesstrain.local', password: 'password' });
  });

  it('fails clearly when cloud configuration is missing', async () => {
    await expect(createCloudAuthRepository(null).signIn('xx', 'password')).rejects.toThrow('not configured');
  });
});
