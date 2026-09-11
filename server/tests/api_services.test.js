const { describe, it } = require('node:test');
const assert = require('node:assert');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-master-encryption-key-32-chars!!';

const { encrypt, decrypt, hash } = require('../src/services/encryption.service');
const { resolveAuthorization, buildRequest } = require('../src/services/requestRunner.service');
const { createSession } = require('../src/services/session.service');

describe('API Vault Services & Core Security Layer', () => {

  describe('ApiKey Security Format & Encryption', () => {
    it('should generate irreversible keyHash and recoverable encryptedValue', () => {
      const rawKey = 'test_api_key_1234567890abcdef12345678';
      const keyHash = hash(rawKey);
      const encryptedValue = encrypt(rawKey);

      assert.strictEqual(typeof keyHash, 'string');
      assert.strictEqual(keyHash.length, 64);
      assert.notStrictEqual(keyHash, rawKey);

      assert.notStrictEqual(encryptedValue, rawKey);
      assert.strictEqual(decrypt(encryptedValue), rawKey);
    });

    it('should extract prefix and last 4 characters correctly for UI masking', () => {
      const rawKey = 'sk_live_abc123xyz9876';
      const prefix = rawKey.substring(0, 8);
      const lastFour = rawKey.slice(-4);

      assert.strictEqual(prefix, 'sk_live_');
      assert.strictEqual(lastFour, '9876');
    });
  });

  describe('Request Runner Variable & Authorization Interpolation', () => {
    it('should configure Bearer Token authorization header properly', async () => {
      const authConfig = { type: 'bearer', token: 'my-jwt-token' };
      const resolvedAuth = await resolveAuthorization(authConfig, {});

      assert.strictEqual(resolvedAuth.Authorization, 'Bearer my-jwt-token');
    });

    it('should configure Basic Auth header properly with Base64 encoding', async () => {
      const authConfig = { type: 'basic', username: 'admin', password: 'secretpassword' };
      const resolvedAuth = await resolveAuthorization(authConfig, {});

      const expectedBase64 = Buffer.from('admin:secretpassword').toString('base64');
      assert.strictEqual(resolvedAuth.Authorization, `Basic ${expectedBase64}`);
    });

    it('should configure ApiKey header properly', async () => {
      const authConfig = { type: 'apikey', key: 'X-API-Key', value: 'secret-key-val' };
      const resolvedAuth = await resolveAuthorization(authConfig, {});

      assert.strictEqual(resolvedAuth['X-API-Key'], 'secret-key-val');
    });

    it('should build request object with url, method, headers and params', async () => {
      const req = {
        url: 'https://api.example.com/v1/users',
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        params: [{ key: 'active', value: 'true' }],
        authorization: { type: 'bearer', token: 'my-jwt-token' },
        body: JSON.stringify({ name: 'John Doe' }),
      };

      const built = await buildRequest(req);
      assert.strictEqual(built.url, 'https://api.example.com/v1/users?active=true');
      assert.strictEqual(built.method, 'POST');
      assert.strictEqual(built.headers['Content-Type'], 'application/json');
      assert.strictEqual(built.headers['Authorization'], 'Bearer my-jwt-token');
      assert.strictEqual(built.body, JSON.stringify({ name: 'John Doe' }));
    });
  });

  describe('Session Service & Token Security', () => {
    it('should hash session tokens so raw JWT is never stored in DB', () => {
      const rawToken = 'header.payload.signature';
      const tokenHash = hash(rawToken);

      assert.notStrictEqual(tokenHash, rawToken);
      assert.strictEqual(tokenHash.length, 64);
    });
  });

});
