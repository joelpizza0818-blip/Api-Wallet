const ivm = require('isolated-vm');

const MAX_SCRIPT_SIZE = 64 * 1024;
const SCRIPT_TIMEOUT_MS = 1000;

function runScript(source, { phase = 'pre', headers = {}, response = null, variables = {} } = {}) {
  if (!source || !String(source).trim()) return { headers, variables, tests: [] };
  const code = String(source);
  if (Buffer.byteLength(code, 'utf8') > MAX_SCRIPT_SIZE) throw new Error('Script exceeds the 64 KB limit.');

  const isolate = new ivm.Isolate({ memoryLimit: 16 });
  try {
    const context = isolate.createContextSync();
    const jail = context.global;
    jail.setSync('global', jail.derefInto());
    const state = { headers: { ...headers }, variables: { ...variables }, tests: [] };
    jail.setSync('__state', new ivm.ExternalCopy(state).copyInto());
    jail.setSync('__response', new ivm.ExternalCopy(response || {}).copyInto());
    const wrapped = `(() => {
      const state = global.__state;
      const response = global.__response;
      const pm = {
        variables: { set: (k, v) => { state.variables[String(k)] = String(v); }, get: (k) => state.variables[String(k)] },
        request: { headers: { add: ({ key, value }) => { state.headers[String(key)] = String(value); } } },
        response,
        test: (name, fn) => { try { fn(); state.tests.push({ name: String(name), passed: true }); } catch (e) { state.tests.push({ name: String(name), passed: false, error: String(e.message || e) }); } },
        expect: (value) => ({ to: { eql: (expected) => { if (value !== expected) throw new Error('Expected values to be equal'); }, include: (expected) => { if (!String(value).includes(expected)) throw new Error('Expected value to include text'); } } })
      };
      ${code}
    })()`;
    new ivm.Script(wrapped).runSync(context, { timeout: SCRIPT_TIMEOUT_MS });
    return context.evalSync('global.__state', { copy: true });
  } finally {
    isolate.dispose();
  }
}

module.exports = { runScript, MAX_SCRIPT_SIZE, SCRIPT_TIMEOUT_MS };
