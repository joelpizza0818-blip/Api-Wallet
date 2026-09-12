const { describe, it } = require('node:test');
const assert = require('node:assert');
const { sessionCookieOptions } = require('../src/controllers/auth.controller');

describe('Authentication session cookie security', () => {
  it('allows credentialed cross-site production frontend requests', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const options = sessionCookieOptions();
      assert.strictEqual(options.sameSite, 'none');
      assert.strictEqual(options.secure, true);
      assert.strictEqual(options.httpOnly, true);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
