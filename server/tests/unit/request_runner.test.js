const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildRequest, resolveAuthorization, hasSensitiveQueryData } = require('../../src/services/requestRunner.service');

describe('Request runner unit behavior', () => {
  it('builds a request with query parameters and authorization', async () => {
    const result = await buildRequest({
      url: 'https://example.com/items',
      method: 'GET',
      params: [{ key: 'page', value: '2' }],
      headers: [{ key: 'Accept', value: 'application/json' }],
      authorization: { type: 'bearer', token: 'test-token' },
    });

    assert.strictEqual(result.url, 'https://example.com/items?page=2');
    assert.strictEqual(result.headers.Accept, 'application/json');
    assert.strictEqual(result.headers.Authorization, 'Bearer test-token');
  });

  it('resolves supported authorization modes', async () => {
    assert.deepStrictEqual(await resolveAuthorization({ type: 'basic', username: 'u', password: 'p' }), {
      Authorization: `Basic ${Buffer.from('u:p').toString('base64')}`,
    });
    assert.deepStrictEqual(await resolveAuthorization({ type: 'apikey', key: 'X-Test', value: 'secret' }), {
      'X-Test': 'secret',
    });
  });

  it('detects credentials placed in URL query parameters', () => {
    assert.strictEqual(hasSensitiveQueryData(new URL('https://example.com/callback?token=secret')), true);
    assert.strictEqual(hasSensitiveQueryData(new URL('https://example.com/items?page=2')), false);
  });
});
