const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  analyzeFiles,
  readGithubRepository,
  getFolderName,
  inferRequestBody,
  getSampleValueForField,
  resolveOpenApiSchema,
} = require('../src/services/project-import.service');

describe('Project importer', () => {
  it('detects fetch and Axios endpoints and resolves .env URLs without exposing secrets', () => {
    const result = analyzeFiles([
      { name: '.env', content: 'API_URL="https://api.example.com"\nAPI_TOKEN=secret-value' },
      { name: 'src/client.js', content: 'fetch(`${API_URL}/users`); axios.post("https://api.example.com/login", { email: "test@example.com", password: "pwd" });' },
      { name: 'node_modules/ignored.js', content: 'fetch("https://ignored.example.com")' },
    ]);

    assert.equal(result.endpoints.length, 2);
    assert.equal(result.endpoints[0].url, 'https://api.example.com/users');
    assert.equal(result.endpoints[1].method, 'POST');
    assert.ok(result.endpoints[1].body.includes('email'));
    assert.ok(!JSON.stringify(result).includes('secret-value'));
  });

  it('detects Express routes, app methods, and chained routes with folder grouping and body generation', () => {
    const result = analyzeFiles([
      {
        name: 'src/routes/auth.routes.js',
        content: `
          router.post('/login', authController.login);
          router.post('/register', (req, res) => {
            const { name, email, password, role } = req.body;
          });
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

    assert.equal(result.endpoints.length, 7);
    const loginEp = result.endpoints.find((e) => e.path === '/login');
    assert.ok(loginEp);
    assert.equal(loginEp.method, 'POST');
    assert.equal(loginEp.folderName, 'routes / Auth');
    assert.ok(loginEp.body.includes('user@example.com'));
    assert.ok(loginEp.headers.some((h) => h.key === 'Content-Type' && h.value === 'application/json'));

    const registerEp = result.endpoints.find((e) => e.path === '/register');
    assert.ok(registerEp);
    assert.ok(registerEp.body.includes('name'));
    assert.ok(registerEp.body.includes('email'));
    assert.ok(registerEp.body.includes('password'));

    const healthEp = result.endpoints.find((e) => e.path === '/api/health');
    assert.ok(healthEp);
    assert.equal(healthEp.folderName, 'Health');

    const putUserEp = result.endpoints.find((e) => e.path === '/api/users/:id' && e.method === 'PUT');
    assert.ok(putUserEp);
    assert.equal(putUserEp.folderName, 'Users');
    assert.ok(putUserEp.params.some((p) => p.key === 'id'));

    const wildcardEp = result.endpoints.find((e) => e.path === '/*' || e.path === '*');
    assert.equal(wildcardEp, undefined);
  });

  it('generates body from Zod schemas and req.body code patterns', () => {
    const result = analyzeFiles([
      {
        name: 'src/controllers/product.controller.js',
        content: `
          const productSchema = z.object({
            title: z.string(),
            price: z.number(),
            inStock: z.boolean(),
          });
          router.post('/api/products', (req, res) => {
            const data = productSchema.parse(req.body);
          });
        `,
      },
    ]);

    const prodEp = result.endpoints.find((e) => e.path === '/api/products');
    assert.ok(prodEp);
    assert.equal(prodEp.method, 'POST');
    const parsedBody = JSON.parse(prodEp.body);
    assert.ok(parsedBody.title);
    assert.equal(typeof parsedBody.price, 'number');
    assert.equal(typeof parsedBody.inStock, 'boolean');
  });

  it('detects OpenAPI and Postman specs, extracting schema bodies and tags', () => {
    const result = analyzeFiles([
      {
        name: 'docs/openapi.json',
        content: JSON.stringify({
          openapi: '3.0.0',
          paths: {
            '/api/orders': {
              get: { summary: 'List orders', tags: ['Orders'] },
              post: {
                summary: 'Create order',
                tags: ['Orders'],
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          orderId: { type: 'string', example: 'ord_999' },
                          totalAmount: { type: 'number', example: 150.50 },
                          items: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
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
              request: {
                method: 'POST',
                url: 'https://api.example.com/charges',
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({ amount: 5000, currency: 'usd', customerId: 'cus_123' }),
                },
              },
            },
          ],
        }),
      },
    ]);

    assert.equal(result.endpoints.length, 3);
    const postOrderEp = result.endpoints.find((e) => e.path === '/api/orders' && e.method === 'POST');
    assert.ok(postOrderEp);
    assert.equal(postOrderEp.folderName, 'Orders');
    const orderBody = JSON.parse(postOrderEp.body);
    assert.equal(orderBody.orderId, 'ord_999');
    assert.equal(orderBody.totalAmount, 150.50);

    const chargeEp = result.endpoints.find((e) => e.path === '/charges');
    assert.ok(chargeEp);
    assert.equal(chargeEp.method, 'POST');
    assert.equal(chargeEp.folderName, 'Payments API');
    const chargeBody = JSON.parse(chargeEp.body);
    assert.equal(chargeBody.amount, 5000);
    assert.equal(chargeBody.currency, 'usd');
  });

  it('correctly categorizes folder names and modules with getFolderName', () => {
    assert.equal(getFolderName('server/src/routes/auth.routes.js', '/login'), 'routes / Auth');
    assert.equal(getFolderName('controllers/billing/payment.controller.js', '/checkout'), 'controllers / billing / Payment');
    assert.equal(getFolderName('server.js', '/api/chats/:chatId'), 'Chats');
    assert.equal(getFolderName('app.js', '/api/health'), 'Health');
    assert.equal(getFolderName('index.js', '/'), 'General');
  });

  it('infers realistic fallback JSON bodies for all common API patterns', () => {
    const loginBody = JSON.parse(inferRequestBody('POST', '/api/v1/auth/login'));
    assert.equal(loginBody.email, 'user@example.com');
    assert.equal(loginBody.password, 'password123');

    const paymentBody = JSON.parse(inferRequestBody('POST', '/api/checkout/payments'));
    assert.equal(paymentBody.currency, 'USD');
    assert.equal(typeof paymentBody.amount, 'number');

    const chatBody = JSON.parse(inferRequestBody('POST', '/api/chat/messages'));
    assert.ok(chatBody.content);

    const getBody = inferRequestBody('GET', '/api/users');
    assert.equal(getBody, '');
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
