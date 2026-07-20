export interface LocalAccountDefinition {
  username: string;
  chessComUsername: string;
}

export const LOCAL_ACCOUNTS: LocalAccountDefinition[] = [
  { username: 'rohitkparida', chessComUsername: 'rohitkparida' },
  { username: 'shawttybad', chessComUsername: 'shawttybad' }
];

export const LOCAL_ACCOUNT_USERNAME = LOCAL_ACCOUNTS[0].username;
export const GUEST_USERNAME = 'guest';
export const LOCAL_CREDENTIAL_KEY = 'magnus_local_credential';
export const LOCAL_AUTH_SESSION_KEY = 'magnus_local_authenticated';

const PASSWORD_ITERATIONS = 210_000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const DEFAULT_PASSWORD_VERSION_KEY = 'magnus_default_password_version';
const DEFAULT_PASSWORD_VERSION = '1';

const DEFAULT_CREDENTIALS: Record<string, { salt: string; hash: string }> = {
  rohitkparida: {
    salt: 'EPwLkmhsKuuMZ0+CWWEBiw==',
    hash: 'Hnmxl6LkrqRGbRdznlg6KEjsUzVJ+pfGEll9cF8BeFs='
  },
  shawttybad: {
    salt: 'Y07upjsBFyjmiMXZOjRqbA==',
    hash: 'iINoBsxPydwhFkhhCJTxwqP6b/H+xqHBE9RFMDLoWX0='
  }
};

interface LocalCredential {
  version: 1;
  username: string;
  salt: string;
  hash: string;
  iterations: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownAccount(username: string): boolean {
  return LOCAL_ACCOUNTS.some((account) => account.username === username);
}

function credentialKey(username: string): string {
  return `${LOCAL_CREDENTIAL_KEY}:${username}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function sanitizeCredential(value: unknown, username: string): LocalCredential | null {
  if (!isRecord(value) || !isKnownAccount(username)) return null;
  if (value.version !== 1 || value.username !== username) return null;
  if (typeof value.salt !== 'string' || typeof value.hash !== 'string') return null;
  if (typeof value.iterations !== 'number' || value.iterations < 100_000 || value.iterations > 1_000_000) return null;
  if (!base64ToBytes(value.salt) || !base64ToBytes(value.hash)) return null;
  return value as unknown as LocalCredential;
}

function parseCredential(raw: string | null, username: string): LocalCredential | null {
  try {
    return sanitizeCredential(raw ? JSON.parse(raw) : null, username);
  } catch {
    return null;
  }
}

function ensureDefaultCredentials(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(DEFAULT_PASSWORD_VERSION_KEY) === DEFAULT_PASSWORD_VERSION) return;
  for (const account of LOCAL_ACCOUNTS) {
    const seed = DEFAULT_CREDENTIALS[account.username];
    if (!seed) continue;
    const credential: LocalCredential = {
      version: 1,
      username: account.username,
      salt: seed.salt,
      hash: seed.hash,
      iterations: PASSWORD_ITERATIONS
    };
    localStorage.setItem(credentialKey(account.username), JSON.stringify(credential));
  }
  localStorage.removeItem(LOCAL_CREDENTIAL_KEY);
  localStorage.setItem(DEFAULT_PASSWORD_VERSION_KEY, DEFAULT_PASSWORD_VERSION);
}

function readCredential(username: string): LocalCredential | null {
  if (typeof window === 'undefined' || !isKnownAccount(username)) return null;
  ensureDefaultCredentials();
  const scopedKey = credentialKey(username);
  const scoped = parseCredential(localStorage.getItem(scopedKey), username);
  if (scoped) return scoped;

  if (username === LOCAL_ACCOUNT_USERNAME) {
    const legacy = parseCredential(localStorage.getItem(LOCAL_CREDENTIAL_KEY), username);
    if (legacy) {
      localStorage.setItem(scopedKey, JSON.stringify(legacy));
      localStorage.removeItem(LOCAL_CREDENTIAL_KEY);
      return legacy;
    }
  }
  return null;
}

async function deriveHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function passwordMatches(password: string, credential: LocalCredential): Promise<boolean> {
  const salt = base64ToBytes(credential.salt);
  const expected = base64ToBytes(credential.hash);
  if (!salt || !expected) return false;
  const actual = await deriveHash(password, salt, credential.iterations);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

function markAuthenticated(username: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(LOCAL_AUTH_SESSION_KEY, username);
}

export function passwordValidationError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}

export const localAuthRepository = {
  activeUsername(): string | null {
    if (typeof window === 'undefined') return null;
    const username = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
    return username && isKnownAccount(username) && readCredential(username) ? username : null;
  },
  hasPassword(username: string): boolean {
    return readCredential(username) !== null;
  },
  isAuthenticated(username: string): boolean {
    return this.activeUsername() === username;
  },
  async setPassword(username: string, newPassword: string, currentPassword = ''): Promise<void> {
    if (!isKnownAccount(username)) throw new Error('Unknown local account.');
    const validationError = passwordValidationError(newPassword);
    if (validationError) throw new Error(validationError);
    const current = readCredential(username);
    if (current && !(await passwordMatches(currentPassword, current))) throw new Error('Current password is incorrect.');

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await deriveHash(newPassword, salt, PASSWORD_ITERATIONS);
    const credential: LocalCredential = {
      version: 1,
      username,
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash),
      iterations: PASSWORD_ITERATIONS
    };
    localStorage.setItem(credentialKey(username), JSON.stringify(credential));
  },
  async signIn(username: string, password: string): Promise<boolean> {
    const credential = readCredential(username);
    if (!credential) return false;
    const valid = await passwordMatches(password, credential);
    if (valid) markAuthenticated(username);
    return valid;
  },
  signOut(): void {
    if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
  }
};
