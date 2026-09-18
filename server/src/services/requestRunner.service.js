const dns = require('dns').promises;
const net = require('net');
const prisma = require('../config/database');
const { resolveEnvironmentVariables } = require('./environment.service');
const { getPlaintextApiKey } = require('./apiKey.service');
const { runScript } = require('./scriptSandbox.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

function isPrivateIp(address) {
  if (net.isIP(address) === 4) {
    return /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(address);
  }
  return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:');
}

function isDevelopmentLoopback(url) {
  if (process.env.NODE_ENV === 'production') return false;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1';
}

const sensitiveQueryNames = /^(token|access_token|api[_-]?key|secret|password|authorization|credential)$/i;

function hasSensitiveQueryData(url) {
  for (const [name] of url.searchParams) {
    if (sensitiveQueryNames.test(name)) return true;
  }
  return false;
}

async function safeUrl(targetUrl) {
  const url = new URL(targetUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP(S) destinations are allowed');
  }
  if (process.env.BLOCK_SENSITIVE_QUERY_PARAMS !== 'false' && hasSensitiveQueryData(url)) {
    throw fail('Sensitive credentials must not be sent in URL query parameters', 400);
  }

  const records = await dns.lookup(url.hostname, { all: true });
  const isLoopback = isDevelopmentLoopback(url);

  if (!records.length || (!isLoopback && records.some((record) => isPrivateIp(record.address)))) {
    throw new Error('Private network destinations are blocked');
  }

  return url;
}

/**
 * Resolves authorization configuration into header entries.
 */
async function resolveAuthorization(requestAuth = {}, collectionAuth = {}) {
  const auth = (requestAuth && requestAuth.type && requestAuth.type !== 'none')
    ? requestAuth
    : collectionAuth;

  if (!auth || !auth.type || auth.type === 'none') {
    return {};
  }

  if (auth.type === 'bearer' || auth.type === 'oauth2') {
    const token = auth.token || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  if (auth.type === 'basic') {
    const user = auth.username || '';
    const pass = auth.password || '';
    const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  if (auth.type === 'apikey') {
    const headerName = auth.key || 'X-API-Key';
    let headerValue = auth.value || '';

    // If an apiKeyId is specified in auth config, securely load plaintext key
    if (auth.apiKeyId) {
      try {
        headerValue = await getPlaintextApiKey(auth.apiKeyId);
      } catch {
        // Fallback to auth.value if plaintext retrieval fails
      }
    }

    return headerName && headerValue ? { [headerName]: headerValue } : {};
  }

  return {};
}

/**
 * Resolves template variables and secrets in request fields.
 */
async function resolveRequestVariables(request, environmentId, runtimeVariables = {}) {
  const resolved = { ...request };

  if (environmentId || Object.keys(runtimeVariables).length) {
    if (resolved.url) {
      resolved.url = await resolveEnvironmentVariables(resolved.url, environmentId, runtimeVariables);
    }
    if (resolved.path) {
      resolved.path = await resolveEnvironmentVariables(resolved.path, environmentId, runtimeVariables);
    }
    if (resolved.body) {
      resolved.body = await resolveEnvironmentVariables(resolved.body, environmentId, runtimeVariables);
    }
    if (Array.isArray(resolved.headers)) {
      resolved.headers = await Promise.all(
        resolved.headers.map(async (h) => ({
          key: await resolveEnvironmentVariables(h.key, environmentId, runtimeVariables),
          value: await resolveEnvironmentVariables(h.value, environmentId, runtimeVariables),
        }))
      );
    }
    if (Array.isArray(resolved.params)) {
      resolved.params = await Promise.all(
        resolved.params.map(async (p) => ({
          key: await resolveEnvironmentVariables(p.key, environmentId, runtimeVariables),
          value: await resolveEnvironmentVariables(p.value, environmentId, runtimeVariables),
        }))
      );
    }
    if (resolved.authorization && typeof resolved.authorization === 'object') {
      resolved.authorization = { ...resolved.authorization };
      for (const field of ['key', 'value', 'token', 'username', 'password']) {
        if (typeof resolved.authorization[field] === 'string') {
          resolved.authorization[field] = await resolveEnvironmentVariables(resolved.authorization[field], environmentId, runtimeVariables);
        }
      }
    }
  }

  return resolved;
}

/**
 * Builds standard request parameters (url, method, headers, body).
 */
async function buildRequest(request, environmentId = null, runtimeVariables = {}) {
  const resolved = await resolveRequestVariables(request, environmentId, runtimeVariables);

  // Construct target URL
  let fullUrl = resolved.url || resolved.path;
  if (environmentId) {
    const env = await prisma.environment.findUnique({ where: { id: environmentId } });
    if (env?.baseUrl) {
      const base = env.baseUrl.replace(/\/+$/, '');
      if (!fullUrl) {
        fullUrl = base;
      } else if (fullUrl.includes('{{baseUrl}}')) {
        fullUrl = fullUrl.replace(/\{\{baseUrl\}\}\/?/g, base + '/');
      } else if (fullUrl.startsWith('/')) {
        fullUrl = `${base}${fullUrl}`;
      }
    }
  }
  if (fullUrl && fullUrl.includes('{{baseUrl}}')) {
    fullUrl = fullUrl.replace(/\{\{baseUrl\}\}\/?/g, '');
  }

  if (!fullUrl) {
    throw fail('Request URL or Environment Base URL is required to execute');
  }

  // Parse query parameters
  const urlObj = new URL(fullUrl);
  if (Array.isArray(resolved.params)) {
    for (const p of resolved.params) {
      if (p.key) urlObj.searchParams.append(p.key, p.value || '');
    }
  }

  // Merge headers
  const headers = {};
  if (Array.isArray(resolved.headers)) {
    for (const h of resolved.headers) {
      if (h.key) headers[h.key] = h.value || '';
    }
  }

  // Resolve Authorization
  const authHeaders = await resolveAuthorization(
    resolved.authorization,
    resolved.collection?.authorization
  );
  Object.assign(headers, authHeaders);

  return {
    url: urlObj.toString(),
    method: (resolved.method || 'GET').toUpperCase(),
    headers,
    body: ['GET', 'HEAD'].includes(resolved.method) ? undefined : resolved.body || undefined,
  };
}

/**
 * Saves execution results into `request_executions`.
 */
async function saveExecution({ requestId, apiKeyId = null, flowId = null, statusCode = null, latencyMs = null, responseBody = null, errorMessage = null }) {
  return prisma.requestExecution.create({
    data: {
      requestId,
      apiKeyId,
      flowId,
      statusCode,
      latencyMs,
      responseBody: responseBody ? String(responseBody).slice(0, 20000) : null,
      errorMessage: errorMessage ? String(errorMessage).slice(0, 2000) : null,
    },
  });
}

/**
 * Executes a single API request and records the result.
 */
async function executeRequest(requestId, options = {}) {
  const request = await prisma.apiRequest.findUnique({
    where: { id: requestId },
    include: { collection: { include: { project: true } } },
  });

  if (!request) throw fail('API Request not found', 404);

  const environmentId = options.environmentId || (await prisma.environment.findFirst({
    where: { projectId: request.collection.projectId, isDefault: true },
    select: { id: true },
  }))?.id || null;
  const flowId = options.flowId || null;
  const apiKeyId = options.apiKeyId || null;

  const started = Date.now();
  let statusCode = null;
  let responseBody = null;
  let responseHeaders = {};
  let errorMessage = null;

  try {
    const built = await buildRequest(request, environmentId, options.variables || {});
    const destination = await safeUrl(built.url);
    const preScript = request.preRequestScript || request.collection?.preRequestScript || '';
    if (preScript) {
      const scripted = runScript(preScript, { phase: 'pre', headers: built.headers });
      Object.assign(built.headers, scripted.headers);
    }

    const res = await fetch(destination, {
      method: built.method,
      headers: built.headers,
      body: built.body,
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
      redirect: 'error',
    });

    statusCode = res.status;
    responseBody = await res.text();
    responseHeaders = Object.fromEntries(res.headers.entries());
    const postScript = request.testScript || request.collection?.testScript || '';
    if (postScript) {
      const scripted = runScript(postScript, {
        phase: 'post',
        headers: built.headers,
        response: { status: res.status, code: res.status, body: responseBody, headers: responseHeaders },
      });
      const failed = scripted.tests.find((test) => !test.passed);
      if (failed) errorMessage = `Script test failed: ${failed.name}${failed.error ? ` - ${failed.error}` : ''}`;
    }
  } catch (err) {
    errorMessage = err.message;
  }

  const latencyMs = Date.now() - started;

  // Persist execution
  await saveExecution({
    requestId: request.id,
    apiKeyId,
    flowId,
    statusCode,
    latencyMs,
    responseBody,
    errorMessage,
  });

  // Update request lastStatusCode
  await prisma.apiRequest.update({
    where: { id: request.id },
    data: { lastStatusCode: statusCode },
  });

  return {
    statusCode,
    latencyMs,
    headers: responseHeaders,
    body: responseBody,
    error: errorMessage,
  };
}

module.exports = {
  executeRequest,
  buildRequest,
  resolveRequestVariables,
  resolveAuthorization,
  saveExecution,
  hasSensitiveQueryData,
};
