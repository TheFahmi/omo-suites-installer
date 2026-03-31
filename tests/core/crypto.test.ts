import { describe, it, expect } from 'vitest';
import {
  deriveKey,
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
  maskKey,
  quickHash,
} from '../../src/core/crypto.ts';

describe('core/crypto', () => {
  // ─── deriveKey ───────────────────────────────────────────────────
  describe('deriveKey', () => {
    it('should return a 32-byte Buffer', () => {
      const salt = Buffer.from('a'.repeat(64), 'hex');
      const key = deriveKey('password', salt);
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it('should be deterministic for same password and salt', () => {
      const salt = Buffer.from('b'.repeat(64), 'hex');
      const key1 = deriveKey('test', salt);
      const key2 = deriveKey('test', salt);
      expect(key1.equals(key2)).toBe(true);
    });

    it('should produce different keys for different passwords', () => {
      const salt = Buffer.from('c'.repeat(64), 'hex');
      const key1 = deriveKey('password1', salt);
      const key2 = deriveKey('password2', salt);
      expect(key1.equals(key2)).toBe(false);
    });

    it('should produce different keys for different salts', () => {
      const salt1 = Buffer.from('d'.repeat(64), 'hex');
      const salt2 = Buffer.from('e'.repeat(64), 'hex');
      const key1 = deriveKey('password', salt1);
      const key2 = deriveKey('password', salt2);
      expect(key1.equals(key2)).toBe(false);
    });
  });

  // ─── hashPassword / verifyPassword ───────────────────────────────
  describe('hashPassword / verifyPassword', () => {
    it('should hash and verify a password', () => {
      const hash = hashPassword('my-secret');
      expect(verifyPassword('my-secret', hash)).toBe(true);
    });

    it('should reject wrong password', () => {
      const hash = hashPassword('correct-password');
      expect(verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('should produce different hashes for same password (random salt)', () => {
      const hash1 = hashPassword('same-password');
      const hash2 = hashPassword('same-password');
      expect(hash1).not.toBe(hash2);
      // But both should verify
      expect(verifyPassword('same-password', hash1)).toBe(true);
      expect(verifyPassword('same-password', hash2)).toBe(true);
    });

    it('should return false for malformed hash', () => {
      expect(verifyPassword('test', 'not-a-valid-hash')).toBe(false);
      expect(verifyPassword('test', '')).toBe(false);
    });

    it('should handle empty password', () => {
      const hash = hashPassword('');
      expect(verifyPassword('', hash)).toBe(true);
      expect(verifyPassword('not-empty', hash)).toBe(false);
    });
  });

  // ─── encrypt / decrypt ──────────────────────────────────────────
  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'sk-my-api-key-12345';
      const password = 'master-password';

      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV/salt)', () => {
      const plaintext = 'same-text';
      const password = 'password';

      const enc1 = encrypt(plaintext, password);
      const enc2 = encrypt(plaintext, password);

      expect(enc1).not.toBe(enc2);

      // Both should decrypt correctly
      expect(decrypt(enc1, password)).toBe(plaintext);
      expect(decrypt(enc2, password)).toBe(plaintext);
    });

    it('should throw on decryption with wrong password', () => {
      const encrypted = encrypt('secret', 'correct-password');
      expect(() => decrypt(encrypted, 'wrong-password')).toThrow();
    });

    it('should throw on invalid encrypted data format', () => {
      expect(() => decrypt('not:enough:parts', 'password')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('too:many:colons:here:extra', 'password')).toThrow('Invalid encrypted data format');
    });

    it('should handle empty string encryption', () => {
      const encrypted = encrypt('', 'password');
      const decrypted = decrypt(encrypted, 'password');
      expect(decrypted).toBe('');
    });

    it('should handle long plaintext', () => {
      const longText = 'x'.repeat(10000);
      const encrypted = encrypt(longText, 'pwd');
      expect(decrypt(encrypted, 'pwd')).toBe(longText);
    });

    it('should handle special characters', () => {
      const special = '🔐 API Key: sk-aBcDeFgHiJkLmNoPqRsTuVwXyZ-🎉!@#$%^&*()';
      const encrypted = encrypt(special, 'pwd');
      expect(decrypt(encrypted, 'pwd')).toBe(special);
    });

    it('encrypted output should be in salt:iv:authTag:ciphertext format', () => {
      const encrypted = encrypt('test', 'pwd');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);
      // Salt = 32 bytes = 64 hex chars
      expect(parts[0]).toHaveLength(64);
      // IV = 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // AuthTag = 16 bytes = 32 hex chars
      expect(parts[2]).toHaveLength(32);
      // Ciphertext should be non-empty hex
      expect(parts[3].length).toBeGreaterThan(0);
    });
  });

  // ─── maskKey ─────────────────────────────────────────────────────
  describe('maskKey', () => {
    it('should mask a key with dots in the middle', () => {
      const masked = maskKey('sk-abcdefghijklmnop');
      expect(masked.startsWith('sk-a')).toBe(true);
      expect(masked.endsWith('mnop')).toBe(true);
      expect(masked).toContain('•');
    });

    it('should return **** for short keys (<=8 chars)', () => {
      expect(maskKey('short')).toBe('****');
      expect(maskKey('12345678')).toBe('****');
    });

    it('should handle exactly 9 characters (edge case)', () => {
      const masked = maskKey('123456789');
      expect(masked).toBe('1234•6789');
    });
  });

  // ─── quickHash ───────────────────────────────────────────────────
  describe('quickHash', () => {
    it('should return a 16-character hex string', () => {
      const hash = quickHash('test');
      expect(hash).toHaveLength(16);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('should be deterministic', () => {
      expect(quickHash('same')).toBe(quickHash('same'));
    });

    it('should produce different hashes for different inputs', () => {
      expect(quickHash('a')).not.toBe(quickHash('b'));
    });
  });
});
