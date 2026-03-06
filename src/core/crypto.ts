import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const DIGEST = 'sha512';

// ─── Key Derivation ──────────────────────────────────────────────────
export function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
}

// ─── Hash Password (for verification) ────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, DIGEST);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, DIGEST);
  return hash.toString('hex') === hashHex;
}

// ─── Encrypt ─────────────────────────────────────────────────────────
export function encrypt(plaintext: string, password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:ciphertext (all hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted,
  ].join(':');
}

// ─── Decrypt ─────────────────────────────────────────────────────────
export function decrypt(encryptedData: string, password: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltHex, ivHex, authTagHex, ciphertext] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ─── Simple Obfuscation (for display masking) ────────────────────────
export function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
}

// ─── Quick Hash (for non-security fingerprinting) ────────────────────
export function quickHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}
