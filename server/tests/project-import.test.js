const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeFiles, readGithubRepository } = require('../src/services/project-import.service');

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

  it('loads relevant files from a GitHub tree without making a real network call', async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
      calls.push(url);
      if (url.includes('/git/trees/HEAD')) return { ok: true, json: async () => ({ tree: [
        { type: 'blob', path: 'src/client.js', size: 80 },
        { type: 'blob', path: 'README.md', size: 80 },
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