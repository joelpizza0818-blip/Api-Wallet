const { describe, it, before } = require('node:test');
const assert = require('node:assert');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-master-encryption-key-32-chars!!';

const { encrypt, decrypt, hash, compareHash } = require('../src/services/encryption.service');

describe('Encryption Service (AES-256-GCM)', () => {
  it('should encrypt a plaintext string into a versioned ciphertext format', () => {
    const secret = 'sk_live_super_secret_production_key_12345';
    const encrypted = encrypt(secret);

    assert.notStrictEqual(encrypted, secret);
    assert.strictEqual(typeof encrypted, 'string');
    assert.match(encrypted, /^v1:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/);
  });

  it('should decrypt ciphertext back to original plaintext value', () => {
    const original = 'my-super-secret-stripe-token';
    const ciphertext = encrypt(original);
    const decrypted = decrypt(ciphertext);

    assert.strictEqual(decrypted, original);
  });

  it('should produce different ciphertexts for the same plaintext due to random IVs', () => {
    const text = 'reproducible-payload';
    const cipher1 = encrypt(text);
    const cipher2 = encrypt(text);

    assert.notStrictEqual(cipher1, cipher2);
    assert.strictEqual(decrypt(cipher1), text);
    assert.strictEqual(decrypt(cipher2), text);
  });

  it('should fail to decrypt if ciphertext or auth tag is tampered with', () => {
    const text = 'authentic-message';
    const cipher = encrypt(text);
    const parts = cipher.split(':');

    // Tamper with ciphertext bytes
    parts[3] = Buffer.from('corrupted').toString('base64url');
    const tampered = parts.join(':');

    assert.throws(() => {
      decrypt(tampered);
    });
  });

  it('should support legacy dot-separated format (iv.tag.ciphertext) for backward compatibility', () => {
    const original = 'legacy-data';
    const encrypted = encrypt(original);
    // Convert to legacy dot format
    const [, iv, tag, ciphertext] = encrypted.split(':');
    const legacyFormat = `${iv}.${tag}.${ciphertext}`;

    const decrypted = decrypt(legacyFormat);
    assert.strictEqual(decrypted, original);
  });

  it('should create deterministic irreversible SHA-256 hashes', () => {
    const value = 'api_key_sample_token';
    const hash1 = hash(value);
    const hash2 = hash(value);

    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64); // SHA-256 hex length
    assert.notStrictEqual(hash1, value);
  });

  it('should safely compare hash values using timing-safe compareHash', () => {
    const raw = 'my_raw_password_or_token';
    const storedHash = hash(raw);

    assert.strictEqual(compareHash(raw, storedHash), true);
    assert.strictEqual(compareHash('wrong_token', storedHash), false);
    assert.strictEqual(compareHash(null, storedHash), false);
  });
});
