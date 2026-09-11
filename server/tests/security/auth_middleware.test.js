const { describe, it } = require('node:test');
const assert = require('node:assert');
const { requireAuth } = require('../../src/middleware/auth.middleware');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

describe('Authentication security', () => {
  it('rejects requests without a token', async () => {
    const response = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    let nextCalled = false;
    await requireAuth({ headers: {} }, response, () => { nextCalled = true; });

    assert.strictEqual(response.statusCode, 401);
    assert.deepStrictEqual(response.body, { success: false, message: 'Unauthorized' });
    assert.strictEqual(nextCalled, false);
  });

  it('rejects malformed bearer tokens without querying a user', async () => {
    const response = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await requireAuth({ headers: { authorization: 'Bearer invalid-token' } }, response, () => {});

    assert.strictEqual(response.statusCode, 401);
    assert.deepStrictEqual(response.body, { success: false, message: 'Unauthorized' });
  });
});
