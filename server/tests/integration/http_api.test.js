const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../../src/app');

let server;
let baseUrl;

describe('HTTP API integration', () => {
  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it('reports service and database health', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.database, 'ok');
  });

  it('protects workspace data without authentication', async () => {
    const response = await fetch(`${baseUrl}/api/workspaces`);
    const body = await response.json();

    assert.strictEqual(response.status, 401);
    assert.strictEqual(body.message, 'Unauthorized');
  });

  it('rejects cross-site state-changing requests before authentication', async () => {
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Origin: 'https://attacker.example' },
    });
    const body = await response.json();

    assert.strictEqual(response.status, 403);
    assert.strictEqual(body.message, 'Origin not allowed');
  });
});
