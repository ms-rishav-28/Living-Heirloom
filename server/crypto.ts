import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Encryption-at-rest helpers (contract v1):
 * - AES-256-GCM per field, key = LH_ENCRYPTION_KEY (32-byte base64)
 * - payload format: base64(iv) . base64(tag) . base64(ciphertext)
 * - tokens: 32 random bytes, base64url, stored hashed (sha256 hex)
 */

const KEY_ENV = 'LH_ENCRYPTION_KEY';
const IV_LENGTH = 12;

let cachedKey: Buffer | null = null;
let keyResolved = false;
let warned = false;

function resolveKey(): Buffer | null {
  if (keyResolved) return cachedKey;
  keyResolved = true;
  const raw = process.env[KEY_ENV];
  if (!raw) {
    if (!warned) {
      warned = true;
      console.warn(
        `[crypto] ${KEY_ENV} is not set — the delivery feature is disabled. ` +
          `Generate a key with: openssl rand -base64 32`
      );
    }
    return null;
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    if (!warned) {
      warned = true;
      console.warn(
        `[crypto] ${KEY_ENV} must decode to exactly 32 bytes (got ${key.length}) — ` +
          `the delivery feature is disabled. Generate a key with: openssl rand -base64 32`
      );
    }
    return null;
  }
  cachedKey = key;
  return cachedKey;
}

/** True when a valid 32-byte encryption key is configured. */
export function encryptionAvailable(): boolean {
  return resolveKey() !== null;
}

/** Emits the startup warning (once) when the key is missing or invalid. */
export function warnIfEncryptionUnavailable(): void {
  resolveKey();
}

/** AES-256-GCM encrypt a UTF-8 string → `base64(iv).base64(tag).base64(ciphertext)`. */
export function encryptField(plaintext: string): string {
  const key = resolveKey();
  if (!key) throw new Error('Encryption key is not configured');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

/** Decrypt a payload produced by {@link encryptField}. */
export function decryptField(payload: string): string {
  const key = resolveKey();
  if (!key) throw new Error('Encryption key is not configured');
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload');
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** 32 random bytes, base64url — returned to the client exactly once. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** sha256 hex digest of a raw token — the only form persisted for auth checks. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time comparison of a raw token against a stored sha256 hex hash. */
export function tokenMatchesHash(token: string, storedHashHex: string): boolean {
  const candidate = Buffer.from(hashToken(token), 'hex');
  const stored = Buffer.from(storedHashHex, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
