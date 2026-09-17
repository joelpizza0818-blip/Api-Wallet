const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeFiles, readGithubRepository, getFolderName } = require('../src/services/project-import.service');

describe('Project importer', () => {
  it('detects fetch and Axios endpoints and resolves .env URLs without exposing secrets', () => {
    const result = analyzeFiles([
      { name: '.env', content: 'API_URL="https://api.example.com"\nAPI_TOKEN=secret-value' },
      { name: 'src/client.js', content: 'fetch(`${API_URL}/users`); axios.post("https://api.example.com/login");' },
      { name: 'node_modules/ignored.js', content: 'fetch("https://ignored.example.com")' },
    ]);

    assert.equal(result.endpoints.length, 2);
    assert.equal(result.endpoints[0].url, 'https://api.example.com/users');
    assert.equal(result.endpoints[1].method, 'POST');
    assert.ok(!JSON.stringify(result).includes('secret-value'));
  });

  it('detects Express routes, app methods, and chained routes with folder grouping', () => {
    const result = analyzeFiles([
      {
        name: 'src/routes/auth.routes.js',
        content: `
          router.post('/login', authController.login);
          router.post('/register', authController.register);
          router.get('/me', authController.me);
        `,
      },
      {
        name: 'server.js',
        content: `
          app.get('/api/health', (req, res) => res.json({ ok: true }));
          router.route('/api/users/:id').get(getUser).put(updateUser).delete(deleteUser);
          app.get('/*', serveSpa);
        `,
      },
    ]);

    assert.equal(result.endpoints.length, 7); // login, register, me, health, get user, put user, delete user (wildcard /* filtered)
    const loginEp = result.endpoints.find((e) => e.path === '/login');
    assert.ok(loginEp);
    assert.equal(loginEp.method, 'POST');
    assert.equal(loginEp.folderName, 'routes / Auth');

    const healthEp = result.endpoints.find((e) => e.path === '/api/health');
    assert.ok(healthEp);
    assert.equal(healthEp.folderName, 'Health');

    const putUserEp = result.endpoints.find((e) => e.path === '/api/users/:id' && e.method === 'PUT');
    assert.ok(putUserEp);
    assert.equal(putUserEp.folderName, 'Users');

    const wildcardEp = result.endpoints.find((e) => e.path === '/*' || e.path === '*');
    assert.equal(wildcardEp, undefined);
  });

  it('detects OpenAPI and Postman specs and assigns proper collection tags', () => {
    const result = analyzeFiles([
      {
        name: 'docs/openapi.json',
        content: JSON.stringify({
          openapi: '3.0.0',
          paths: {
            '/api/orders': {
              get: { summary: 'List orders', tags: ['Orders'] },
              post: { summary: 'Create order', tags: ['Orders'] },
            },
          },
        }),
      },
      {
        name: 'postman_collection.json',
        content: JSON.stringify({
          info: { name: 'Payments API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
          item: [
            {
              name: 'Process Charge',
              request: { method: 'POST', url: 'https://api.example.com/charges' },
            },
          ],
        }),
      },
    ]);

    assert.equal(result.endpoints.length, 3);
    const orderEp = result.endpoints.find((e) => e.path === '/api/orders' && e.method === 'GET');
    assert.ok(orderEp);
    assert.equal(orderEp.folderName, 'Orders');

    const chargeEp = result.endpoints.find((e) => e.path === '/charges');
    assert.ok(chargeEp);
    assert.equal(chargeEp.method, 'POST');
    assert.equal(chargeEp.folderName, 'Payments API');
  });

  it('correctly categorizes folder names and modules with getFolderName', () => {
    assert.equal(getFolderName('server/src/routes/auth.routes.js', '/login'), 'routes / Auth');
    assert.equal(getFolderName('controllers/billing/payment.controller.js', '/checkout'), 'controllers / billing / Payment');
    assert.equal(getFolderName('server.js', '/api/chats/:chatId'), 'Chats');
    assert.equal(getFolderName('app.js', '/api/health'), 'Health');
    assert.equal(getFolderName('index.js', '/'), 'General');
  });

  it('loads relevant files from a GitHub tree without making a real network call', async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
      calls.push(url);
      if (url.includes('/git/trees/HEAD')) return { ok: true, json: async () => ({ tree: [
        { type: 'blob', path: 'src/client.js', size: 80 },
        { type: 'blob', path: 'README.md', size: 80 },
        { type: 'blob', path: 'package-lock.json', size: 50000 },
        { type: 'blob', path: 'node_modules/pkg/index.js', size: 80 },
      ] }) };
      return { ok: true, text: async () => 'fetch("https://api.example.com/users")' };
    };

    try {
      const files = await readGithubRepository('https://github.com/acme/demo.git');
      assert.deepEqual(files, [{ name: 'src/client.js', content: 'fetch("https://api.example.com/users")' }]);
      assert.equal(calls.length, 2);
      assert.ok(calls[0].includes('/acme/demo/git/trees/HEAD'));
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('rejects non-GitHub repository URLs before fetching', async () => {
    await assert.rejects(() => readGithubRepository('https://gitlab.com/acme/demo'), /URL válida de repositorio GitHub/);
  });
});
