const path = require('node:path');

const MAX_FILES = 300;
const MAX_FILE_BYTES = 250_000;
const MAX_TOTAL_BYTES = 5_000_000;
const SOURCE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.vue', '.svelte',
  '.py', '.go', '.java', '.kt', '.rb', '.php', '.rs', '.cs',
  '.json', '.yml', '.yaml', '.env'
]);
const IGNORED_PARTS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target', 'coverage', '.next', '.turbo', '.cache', 'vendor', '__pycache__', '.pytest_cache', '.venv', 'venv', 'bin', 'obj'
]);
const IGNORED_FILENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', 'cargo.lock', 'gemfile.lock', 'poetry.lock'
]);

function isRelevantFile(name) {
  const normalized = name.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (parts.some((part) => IGNORED_PARTS.has(part))) return false;
  const base = path.basename(normalized).toLowerCase();
  if (IGNORED_FILENAMES.has(base) || base.endsWith('.lock') || base.endsWith('.min.js') || base.endsWith('.min.css') || base.endsWith('.map')) return false;
  return SOURCE_EXTENSIONS.has(path.extname(normalized).toLowerCase()) || base.startsWith('.env');
}

function parseEnv(files) {
  const values = {};
  for (const file of files) {
    if (!path.basename(file.name).startsWith('.env')) continue;
    for (const line of file.content.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(["']?)(.*?)\2\s*$/);
      if (match && match[3]) values[match[1]] = match[3].trim();
    }
  }
  return values;
}

function resolveTemplate(value, env = {}) {
  if (!value || typeof value !== 'string') return '';
  let result = value.replace(/\$\{([^}]+)\}/g, (full, key) => {
    const trimmed = key.trim();
    if (env[trimmed]) return env[trimmed];
    const upper = trimmed.toUpperCase();
    if (upper.includes('URL') || upper.includes('HOST') || upper.includes('API') || upper.includes('BASE') || upper.includes('ORIGIN')) {
      return '{{baseUrl}}';
    }
    const cleanParam = trimmed.split('.').pop().replace(/[^a-zA-Z0-9_]/g, '') || 'id';
    return `:${cleanParam}`;
  });

  result = result.replace(/\b([A-Z][A-Z0-9_]*_URL)\b/g, (full, key) => env[key] || '{{baseUrl}}');
  result = result.replace(/([^:])\/{2,}/g, '$1/');
  return result;
}

function normalizeUrl(raw, env = {}) {
  const resolved = resolveTemplate(raw.trim().replace(/^["'`]|["'`]$/g, ''), env);
  if (/^https?:\/\//i.test(resolved)) return resolved;
  if (resolved.startsWith('{{baseUrl}}')) return resolved;
  return resolved.startsWith('/') ? resolved : `/${resolved}`;
}

function getPath(url) {
  if (!url) return '/';
  let pathStr = url;
  if (url.startsWith('{{baseUrl}}')) {
    pathStr = url.slice('{{baseUrl}}'.length);
  } else {
    try {
      pathStr = new URL(url).pathname || '/';
    } catch {
      const match = url.match(/https?:\/\/[^/]+(\/[^?#]*)/i);
      pathStr = match ? match[1] : url.split('?')[0].split('#')[0];
    }
  }
  try {
    pathStr = decodeURIComponent(pathStr);
  } catch {}
  pathStr = pathStr.split('?')[0].split('#')[0];
  pathStr = pathStr.replace(/([^:])\/{2,}/g, '$1/');
  return pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
}

function getFolderName(fileName, endpointPath) {
  const normalized = (fileName || '').replaceAll('\\', '/');
  const dir = path.dirname(normalized);
  const base = path.basename(normalized, path.extname(normalized));

  if (dir && dir !== '.' && dir !== '/' && dir !== '') {
    const parts = dir.split('/').filter(p => !['src', 'app', 'apps', 'server', 'client', 'lib', 'packages', '.'].includes(p.toLowerCase()));
    if (parts.length > 0) {
      const cleanBase = base.replace(/\.(routes|controller|service|handler|router|api|test|spec)$/i, '');
      if (cleanBase && !['index', 'route', 'app', 'server', 'main'].includes(cleanBase.toLowerCase()) && !parts.includes(cleanBase)) {
        return parts.join(' / ') + ' / ' + cleanBase.charAt(0).toUpperCase() + cleanBase.slice(1);
      }
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
    }
    if (base && !['index', 'route', 'app', 'server', 'main'].includes(base.toLowerCase())) {
      const cleanBase = base.replace(/\.(routes|controller|service|handler|router|api)$/i, '');
      return cleanBase.charAt(0).toUpperCase() + cleanBase.slice(1);
    }
  } else if (base && !['index', 'route', 'app', 'server', 'main'].includes(base.toLowerCase())) {
    const cleanBase = base.replace(/\.(routes|controller|service|handler|router|api)$/i, '');
    return cleanBase.charAt(0).toUpperCase() + cleanBase.slice(1);
  }

  if (endpointPath && endpointPath !== '/') {
    const segments = endpointPath.split('/').filter(Boolean);
    const meaningful = segments.filter(s => !/^v\d+$/i.test(s) && s.toLowerCase() !== 'api');
    if (meaningful.length > 0) {
      const seg = meaningful[0].replace(/^:/, '');
      return seg.charAt(0).toUpperCase() + seg.slice(1);
    }
  }

  return 'General';
}

/**
 * Returns a realistic, human-friendly sample value for a field name and optional type.
 */
function getSampleValueForField(fieldName, typeHint = 'string', exampleValue = null) {
  if (exampleValue !== null && exampleValue !== undefined) return exampleValue;
  const lower = String(fieldName || '').toLowerCase().replace(/[-_]/g, '');

  if (typeHint === 'number' || typeHint === 'integer') {
    if (lower.includes('price') || lower.includes('amount') || lower.includes('cost') || lower.includes('fee') || lower.includes('total') || lower.includes('salary') || lower.includes('rate')) return 49.99;
    if (lower.includes('age')) return 28;
    if (lower.includes('port')) return 3000;
    if (lower.includes('year')) return 2026;
    if (lower.includes('month')) return 9;
    if (lower.includes('day')) return 17;
    if (lower.includes('limit') || lower.includes('page') || lower.includes('count') || lower.includes('quantity') || lower.includes('stock')) return 10;
    return 1;
  }

  if (typeHint === 'boolean') {
    return true;
  }

  if (typeHint === 'array') {
    if (lower.includes('tag') || lower.includes('label')) return ['tag1', 'tag2'];
    if (lower.includes('role') || lower.includes('scope') || lower.includes('permission')) return ['read', 'write'];
    if (lower.includes('item') || lower.includes('product')) return [{ productId: 'prod_101', quantity: 2, price: 19.99 }];
    return ['item1', 'item2'];
  }

  if (typeHint === 'object') {
    if (lower.includes('address')) return { street: '123 Main St', city: 'San Francisco', state: 'CA', country: 'US', zip: '94107' };
    if (lower.includes('meta') || lower.includes('config') || lower.includes('option') || lower.includes('setting')) return { enabled: true, theme: 'dark' };
    return {};
  }

  // String field inference based on semantic name
  if (lower.includes('email') || lower.includes('mail')) return 'user@example.com';
  if (lower === 'currentpassword' || lower === 'oldpassword') return 'currentPassword123';
  if (lower.includes('password') || lower.includes('pass') || lower.includes('secret') || lower.includes('pwd')) return 'password123';
  if (lower.includes('token') || lower.includes('auth')) {
    if (lower.includes('refresh')) return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh_token_sample';
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access_token_sample';
  }
  if (lower.includes('otp') || lower.includes('code') || lower.includes('pin')) return '123456';
  if (lower === 'firstname') return 'Alex';
  if (lower === 'lastname') return 'Johnson';
  if (lower.includes('fullname') || lower === 'name' || lower === 'author' || lower === 'owner' || lower === 'username' || lower === 'user') return 'Alex Johnson';
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) return '+1234567890';
  if (lower.includes('url') || lower.includes('link') || lower.includes('website') || lower.includes('avatar') || lower.includes('image') || lower.includes('photo')) return 'https://example.com/avatar.png';
  if (lower.includes('title') || lower.includes('subject') || lower.includes('heading')) return 'Sample Title';
  if (lower.includes('description') || lower.includes('details') || lower.includes('summary') || lower.includes('bio') || lower.includes('about')) return 'This is a sample description for testing.';
  if (lower.includes('content') || lower.includes('message') || lower.includes('body') || lower.includes('text') || lower.includes('prompt') || lower.includes('query')) return 'Sample message content';
  if (lower.includes('currency')) return 'USD';
  if (lower.includes('role')) return 'DEVELOPER';
  if (lower.includes('status')) return 'ACTIVE';
  if (lower.includes('type') || lower.includes('category')) return 'General';
  if (lower.includes('sku') || lower.includes('code')) return 'SKU-1001';
  if (lower.includes('id') || lower.endsWith('id')) return 'id_12345';
  if (lower.includes('date') || lower.includes('time') || lower.includes('at')) return '2026-09-17T12:00:00.000Z';
  if (lower.startsWith('is') || lower.startsWith('has') || lower === 'active' || lower === 'enabled' || lower === 'verified' || lower === 'public') return 'true';

  return 'sample_' + fieldName;
}

/**
 * Resolves OpenAPI schemas (including $ref, properties, items, types).
 */
function resolveOpenApiSchema(schema, doc, depth = 0) {
  if (!schema || depth > 5) return {};
  if (schema.$ref && typeof schema.$ref === 'string') {
    const refPath = schema.$ref.replace(/^#\//, '').split('/');
    let target = doc;
    for (const seg of refPath) target = target?.[seg];
    if (target) return resolveOpenApiSchema(target, doc, depth + 1);
    return {};
  }

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  const type = schema.type || (schema.properties ? 'object' : 'string');

  if (type === 'object' || schema.properties) {
    const obj = {};
    for (const [propName, propSchema] of Object.entries(schema.properties || {})) {
      obj[propName] = resolveOpenApiSchema(propSchema, doc, depth + 1);
    }
    return obj;
  }

  if (type === 'array') {
    if (schema.items) return [resolveOpenApiSchema(schema.items, doc, depth + 1)];
    return [];
  }

  if (type === 'number' || type === 'integer') return 10;
  if (type === 'boolean') return true;
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  return getSampleValueForField(schema.title || 'value', type);
}

/**
 * Generates an accurate, realistic JSON body payload for endpoints.
 */
function inferRequestBody(method, endpointPath, contentContext = '', rawBodySample = null) {
  const upperMethod = (method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(upperMethod)) {
    return rawBodySample && typeof rawBodySample === 'string' ? rawBodySample.trim() : '';
  }

  // 1. If raw body sample already provided (e.g. from Postman or OpenAPI)
  if (rawBodySample) {
    if (typeof rawBodySample === 'string' && rawBodySample.trim()) {
      try {
        const parsed = JSON.parse(rawBodySample);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return rawBodySample.trim();
      }
    } else if (typeof rawBodySample === 'object' && rawBodySample !== null) {
      return JSON.stringify(rawBodySample, null, 2);
    }
  }

  // 2. Code-level extraction from contentContext (if available)
  if (contentContext && typeof contentContext === 'string') {
    const extractedFields = {};

    // Pattern A: const { a, b, c } = req.body / request.body / c.req.json() / payload
    const destructureMatches = contentContext.matchAll(/(?:const|let|var)\s*\{\s*([^}]+)\s*\}\s*=\s*(?:req|request|c\.req)\.(?:body|json)/gi);
    for (const dm of destructureMatches) {
      const vars = dm[1].split(',');
      for (const v of vars) {
        const cleanVar = v.trim().split(':')[0].split('=')[0].trim();
        if (cleanVar && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(cleanVar)) {
          extractedFields[cleanVar] = getSampleValueForField(cleanVar);
        }
      }
    }

    // Pattern B: req.body.fieldName or request.body.get("fieldName") or c.req.json().fieldName
    const propMatches = contentContext.matchAll(/(?:req|request|c\.req)\.body(?:\.([a-zA-Z0-9_$]+)|\[['"`]([^'"`]+)['"`]\])/gi);
    for (const pm of propMatches) {
      const field = pm[1] || pm[2];
      if (field && !['length', 'toString', 'valueOf'].includes(field)) {
        extractedFields[field] = getSampleValueForField(field);
      }
    }

    // Pattern C: Zod schema object fields: z.object({ fieldName: z.string() })
    const zodMatches = contentContext.matchAll(/z\.object\s*\(\s*\{([^}]+)\}\s*\)/gi);
    for (const zm of zodMatches) {
      const lines = zm[1].split(',');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim().replace(/['"`]/g, '');
          const typeStr = parts.slice(1).join(':').toLowerCase();
          let t = 'string';
          if (typeStr.includes('number') || typeStr.includes('int')) t = 'number';
          else if (typeStr.includes('boolean')) t = 'boolean';
          else if (typeStr.includes('array')) t = 'array';
          if (k && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)) {
            extractedFields[k] = getSampleValueForField(k, t);
          }
        }
      }
    }

    // Pattern D: Joi schema: Joi.object({ fieldName: Joi.string() })
    const joiMatches = contentContext.matchAll(/Joi\.object\s*\(\s*\{([^}]+)\}\s*\)/gi);
    for (const jm of joiMatches) {
      const lines = jm[1].split(',');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim().replace(/['"`]/g, '');
          const typeStr = parts.slice(1).join(':').toLowerCase();
          let t = 'string';
          if (typeStr.includes('number')) t = 'number';
          else if (typeStr.includes('boolean')) t = 'boolean';
          else if (typeStr.includes('array')) t = 'array';
          if (k && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)) {
            extractedFields[k] = getSampleValueForField(k, t);
          }
        }
      }
    }

    // Pattern E: axios / fetch POST call data object literal: axios.post(url, { ... })
    const axiosPostMatches = contentContext.matchAll(/(?:axios|fetch|client)\s*(?:\.(?:post|put|patch)|\([^,]+,\s*\{[^}]*\bbody:\s*JSON\.stringify)\s*\(\s*(?:[^,]+,\s*)?\{([^}]+)\}/gi);
    for (const apm of axiosPostMatches) {
      const lines = apm[1].split(',');
      for (const line of lines) {
        const parts = line.split(':');
        const k = parts[0].trim().replace(/['"`]/g, '');
        if (k && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)) {
          let val = null;
          if (parts[1]) {
            const rawVal = parts[1].trim();
            if (rawVal.startsWith("'") || rawVal.startsWith('"') || rawVal.startsWith('`')) {
              val = rawVal.slice(1, -1);
            } else if (!isNaN(Number(rawVal))) {
              val = Number(rawVal);
            } else if (rawVal === 'true' || rawVal === 'false') {
              val = rawVal === 'true';
            }
          }
          extractedFields[k] = val !== null ? val : getSampleValueForField(k);
        }
      }
    }

    if (Object.keys(extractedFields).length > 0) {
      return JSON.stringify(extractedFields, null, 2);
    }
  }

  // 3. Semantic Path & Resource Pattern Inference
  const cleanPath = (endpointPath || '').toLowerCase();
  const segments = cleanPath.split('/').filter(Boolean).map(s => s.replace(/^:/, ''));

  const matchKeyword = (...keywords) => {
    return keywords.some(k => {
      const kl = k.toLowerCase();
      return segments.some(s => s === kl || s.startsWith(kl) || s.endsWith(kl)) || cleanPath.includes(`/${kl}`);
    });
  };

  // Auth / Login / Register / Password
  if (matchKeyword('login', 'signin', 'authenticate', 'auth') || cleanPath.endsWith('/token') || segments.includes('session')) {
    return JSON.stringify({
      email: "user@example.com",
      password: "password123"
    }, null, 2);
  }

  if (matchKeyword('register', 'signup', 'join')) {
    return JSON.stringify({
      name: "Alex Johnson",
      email: "alex.johnson@example.com",
      password: "SecurePassword123!",
      role: "DEVELOPER"
    }, null, 2);
  }

  if (cleanPath.includes('forgot-password') || cleanPath.includes('password/reset-request')) {
    return JSON.stringify({
      email: "user@example.com"
    }, null, 2);
  }

  if (cleanPath.includes('reset-password') || cleanPath.includes('change-password') || matchKeyword('password')) {
    return JSON.stringify({
      currentPassword: "currentPassword123",
      newPassword: "NewSecurePassword123!",
      confirmPassword: "NewSecurePassword123!"
    }, null, 2);
  }

  if (matchKeyword('verify', 'otp', '2fa', 'mfa')) {
    return JSON.stringify({
      email: "user@example.com",
      code: "123456"
    }, null, 2);
  }

  if (matchKeyword('invite', 'invitation')) {
    return JSON.stringify({
      email: "colleague@example.com",
      role: "DEVELOPER",
      message: "Te invito a colaborar en este proyecto en Api-Wallet"
    }, null, 2);
  }

  if (matchKeyword('refresh')) {
    return JSON.stringify({
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh_token_sample"
    }, null, 2);
  }

  if (matchKeyword('api-key', 'apikey', 'tokens')) {
    return JSON.stringify({
      name: "Production API Key",
      environment: "production",
      scopes: ["read", "write"]
    }, null, 2);
  }

  // Payments / Billing / Subscriptions / Invoices
  if (matchKeyword('payment', 'charge', 'stripe', 'invoice', 'billing', 'pay')) {
    return JSON.stringify({
      amount: 99.99,
      currency: "USD",
      paymentMethodId: "pm_card_visa_demo",
      description: "Pago de servicio o suscripción"
    }, null, 2);
  }

  if (matchKeyword('subscription', 'plan')) {
    return JSON.stringify({
      planId: "plan_pro_monthly",
      interval: "month",
      autoRenew: true
    }, null, 2);
  }

  // Orders / Cart / Checkout
  if (matchKeyword('cart', 'basket')) {
    return JSON.stringify({
      productId: "prod_101",
      quantity: 2
    }, null, 2);
  }

  if (matchKeyword('order', 'checkout', 'purchase')) {
    return JSON.stringify({
      items: [
        { productId: "prod_101", quantity: 2, price: 49.99 }
      ],
      totalAmount: 99.98,
      shippingAddress: {
        street: "123 Innovation Way",
        city: "San Francisco",
        state: "CA",
        postalCode: "94107",
        country: "US"
      },
      paymentMethod: "credit_card",
      currency: "USD"
    }, null, 2);
  }

  // Chat / Messages / Comments / Posts
  if (matchKeyword('message', 'chat', 'comment', 'post', 'conversation')) {
    return JSON.stringify({
      content: "Mensaje de prueba generado para Api-Wallet.",
      recipientId: "user_456"
    }, null, 2);
  }

  // AI / LLM / Prompts / Completions
  if (matchKeyword('ai', 'completion', 'generate', 'prompt', 'llm', 'openai', 'claude', 'gemini')) {
    return JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hola, ¿cómo puedo probar esta API?" }
      ],
      temperature: 0.7
    }, null, 2);
  }

  // Profile / Me (only exact segment 'me' or 'profile')
  if (segments.includes('me') || matchKeyword('profile')) {
    return JSON.stringify({
      name: "Alex Johnson",
      bio: "Full Stack Developer",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Alex",
      theme: "dark"
    }, null, 2);
  }

  // Users / Accounts / Members / Customers
  if (matchKeyword('user', 'member', 'customer', 'client', 'account')) {
    return JSON.stringify({
      name: "Alex Johnson",
      email: "alex.johnson@example.com",
      role: "USER",
      status: "ACTIVE"
    }, null, 2);
  }

  // Products / Items / Catalog / Inventory
  if (matchKeyword('product', 'item', 'article', 'good')) {
    return JSON.stringify({
      name: "Wireless Noise-Canceling Headphones",
      description: "High-fidelity audio with active noise cancellation and 30h battery life.",
      price: 99.99,
      category: "Electronics",
      stock: 50,
      isAvailable: true
    }, null, 2);
  }

  if (matchKeyword('category', 'tag')) {
    return JSON.stringify({
      name: "Electrónica y Gadgets",
      slug: "electronica-gadgets",
      description: "Dispositivos y accesorios tecnológicos"
    }, null, 2);
  }

  // Workspaces / Projects / Collections
  if (matchKeyword('workspace', 'team', 'organization', 'org')) {
    return JSON.stringify({
      name: "Mi Espacio de Trabajo",
      description: "Espacio para gestionar APIs y microservicios",
      visibility: "TEAM"
    }, null, 2);
  }

  if (matchKeyword('project', 'repo')) {
    return JSON.stringify({
      name: "Proyecto Principal",
      description: "Proyecto de APIs para el sistema",
      isPublic: false
    }, null, 2);
  }

  if (matchKeyword('collection')) {
    return JSON.stringify({
      name: "Nueva Colección",
      description: "Colección para agrupar endpoints relacionados"
    }, null, 2);
  }

  if (matchKeyword('flow', 'webhook')) {
    return JSON.stringify({
      name: "Monitor Healthcheck",
      targetType: "REQUEST",
      intervalMinutes: 15,
      alertThresholdMs: 800
    }, null, 2);
  }

  // Search / Query / Filter
  if (matchKeyword('search', 'filter', 'query')) {
    return JSON.stringify({
      query: "prueba",
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      order: "desc"
    }, null, 2);
  }

  // Generic resource fallback
  const lastSegment = segments[segments.length - 1] || 'item';
  const singular = lastSegment.endsWith('s') && lastSegment.length > 3 ? lastSegment.slice(0, -1) : lastSegment;

  return JSON.stringify({
    name: `Ejemplo de ${singular.charAt(0).toUpperCase() + singular.slice(1)}`,
    description: `Descripción de prueba para ${singular}`,
    status: "ACTIVE",
    isActive: true
  }, null, 2);
}

function detectFromContent(content, fileName, env) {
  const matches = [];
  const normalizedFileName = fileName.replaceAll('\\', '/');

  const add = (method, rawUrl, library, customDescription, customFolder, customBody, customHeaders, customParams) => {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.length > 500 || rawUrl === '*' || rawUrl === '/*') return;
    const url = normalizeUrl(rawUrl, env);
    const cleanPath = getPath(url);
    const upperMethod = (method || 'GET').toUpperCase();
    const folderName = customFolder || getFolderName(fileName, cleanPath);
    const key = `${upperMethod}:${cleanPath}`;

    const body = inferRequestBody(upperMethod, cleanPath, content, customBody);

    const headers = Array.isArray(customHeaders) && customHeaders.length > 0 ? [...customHeaders] : [];
    if (body && !headers.some((h) => (h.key || h.name || '').toLowerCase() === 'content-type')) {
      headers.push({ key: 'Content-Type', value: 'application/json', enabled: true });
    }

    const params = Array.isArray(customParams) && customParams.length > 0 ? [...customParams] : [];
    const pathParams = [...cleanPath.matchAll(/:([a-zA-Z0-9_]+)|\{([a-zA-Z0-9_]+)\}/g)];
    for (const pp of pathParams) {
      const pName = pp[1] || pp[2];
      if (pName && !params.some((p) => p.key === pName)) {
        params.push({ key: pName, value: String(getSampleValueForField(pName)), enabled: true });
      }
    }

    if (!matches.some((item) => `${item.method}:${item.path}` === key)) {
      matches.push({
        name: `${upperMethod} ${cleanPath}`,
        method: upperMethod,
        path: cleanPath,
        url: url.startsWith('http') || url.startsWith('{{baseUrl}}') ? url : `{{baseUrl}}${cleanPath}`,
        description: customDescription || `Detectado en ${fileName} (${library})`,
        folderName,
        headers,
        params,
        body,
      });
    }
  };

  // ── 1. Express / Router / Server Route Definitions ─────────────────────
  const httpMethods = 'get|post|put|patch|delete|options|head|all';
  const serverRouteRegex = new RegExp(`\\b(?:router|app|server|api)\\s*\\.\\s*(${httpMethods})\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'gi');
  for (const match of content.matchAll(serverRouteRegex)) {
    add(match[1] === 'all' ? 'GET' : match[1], match[2], 'Express/Server Route');
  }

  const routeChainedRegex = /\b(?:router|app)\s*\.\s*route\s*\(\s*['"`]([^'"`]+)['"`]\)([\s\S]*?)(?=(?:router|app|module\.exports|const\s|let\s|var\s|export\s|\n\s*\n|$))/gi;
  for (const match of content.matchAll(routeChainedRegex)) {
    const routePath = match[1];
    const chainBlock = match[2];
    const chainedMethodsRegex = new RegExp(`\\.\\s*(${httpMethods})\\s*\\(`, 'gi');
    for (const m of chainBlock.matchAll(chainedMethodsRegex)) {
      add(m[1] === 'all' ? 'GET' : m[1], routePath, 'Express Chained Route');
    }
  }

  // ── 2. NestJS Controllers & Method Decorators ─────────────────────────
  const nestMethodRegex = /@(Get|Post|Put|Patch|Delete|Options|Head|All)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/gi;
  for (const match of content.matchAll(nestMethodRegex)) {
    const m = match[1];
    const p = match[2] || '/';
    add(m === 'All' ? 'GET' : m, p.startsWith('/') ? p : `/${p}`, 'NestJS Decorator');
  }

  // ── 3. Fastify & Koa & Hono & Elysia ──────────────────────────────────
  const fastifyRegex = /\b(?:fastify|hono|elysia)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  for (const match of content.matchAll(fastifyRegex)) {
    add(match[1], match[2], 'Fastify/Hono Route');
  }

  // ── 4. Python (FastAPI, Flask, Django) ─────────────────────────────────
  const pyDecoratorRegex = /@(?:app|router|api|bp)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  for (const match of content.matchAll(pyDecoratorRegex)) {
    add(match[1], match[2], 'Python FastAPI/Flask Route');
  }
  const flaskRouteRegex = /@app\s*\.\s*route\s*\(\s*['"`]([^'"`]+)['"`](?:[\s\S]*?methods\s*=\s*\[([^\]]+)\])?/gi;
  for (const match of content.matchAll(flaskRouteRegex)) {
    const routePath = match[1];
    const methodsStr = match[2];
    if (methodsStr) {
      for (const m of methodsStr.matchAll(/['"`](GET|POST|PUT|PATCH|DELETE)['"`]/gi)) {
        add(m[1], routePath, 'Flask Route');
      }
    } else {
      add('GET', routePath, 'Flask Route');
    }
  }
  const djangoPathRegex = /\bpath\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  for (const match of content.matchAll(djangoPathRegex)) {
    if (!match[1].startsWith('admin/')) {
      add('GET', `/${match[1].replace(/\/+$/, '')}`, 'Django Path');
    }
  }

  // ── 5. Go (Gin, Fiber, Echo, Chi, net/http) ───────────────────────────
  const goRouterRegex = /\b(?:r|router|api|app|e|g|v1)\s*\.\s*(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*["`philosophy]([^"`]+)["`]/g;
  for (const match of content.matchAll(goRouterRegex)) {
    add(match[1], match[2], 'Go Router');
  }
  const goHttpRegex = /http\s*\.\s*HandleFunc\s*\(\s*["`philosophy]([^"`]+)["`]/g;
  for (const match of content.matchAll(goHttpRegex)) {
    add('GET', match[1], 'Go net/http');
  }

  // ── 6. Java / Kotlin / Spring Boot ────────────────────────────────────
  const springMappingRegex = /@(Get|Post|Put|Patch|Delete)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']+)["']/gi;
  for (const match of content.matchAll(springMappingRegex)) {
    add(match[1], match[2], 'Spring Boot Mapping');
  }

  // ── 7. PHP / Laravel / Symfony ────────────────────────────────────────
  const laravelRouteRegex = /Route\s*::\s*(get|post|put|patch|delete|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  for (const match of content.matchAll(laravelRouteRegex)) {
    add(match[1], match[2], 'Laravel Route');
  }

  // ── 8. Next.js App Router route.js/ts ──────────────────────────────────
  if (normalizedFileName.match(/(?:app|pages)\/api\/(.+?)(?:\/route)?\.(?:js|jsx|ts|tsx)$/i)) {
    const routeMatch = normalizedFileName.match(/(?:app|pages)\/api\/(.+?)(?:\/route)?\.(?:js|jsx|ts|tsx)$/i);
    const inferredPath = `/api/${routeMatch[1].replace(/\[([^\]]+)\]/g, ':$1')}`;
    const nextExportRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
    let foundNextExport = false;
    for (const expMatch of content.matchAll(nextExportRegex)) {
      foundNextExport = true;
      add(expMatch[1], inferredPath, 'Next.js App Route');
    }
    if (!foundNextExport && normalizedFileName.includes('/pages/api/')) {
      add('GET', inferredPath, 'Next.js API Handler');
    }
  }

  // ── 9. Client-side HTTP Calls (fetch, axios, got, ky, superagent, etc.) ─
  for (const match of content.matchAll(/\bfetch\s*\(\s*[`'"]([^`'"]+)[`'"](?:\s*,\s*\{([\s\S]{0,600}?)\})?/g)) {
    const method = (match[2]?.match(/\bmethod\s*:\s*['"](\w+)['"]/i)?.[1] || 'GET').toUpperCase();
    const bodySnippet = match[2]?.match(/\bbody\s*:\s*JSON\.stringify\s*\(\s*\{([^}]+)\}\s*\)/i)?.[1];
    let customBody = null;
    if (bodySnippet) {
      const bObj = {};
      for (const p of bodySnippet.split(',')) {
        const k = p.trim().split(':')[0].trim();
        if (k) bObj[k] = getSampleValueForField(k);
      }
      customBody = JSON.stringify(bObj, null, 2);
    }
    add(method, match[1], 'fetch', null, null, customBody);
  }

  for (const match of content.matchAll(/\baxios\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*[`'"]([^`'"]+)[`'"](?:\s*,\s*\{([^}]+)\})?/gi)) {
    const method = match[1].toUpperCase();
    let customBody = null;
    if (match[3]) {
      const bObj = {};
      for (const p of match[3].split(',')) {
        const k = p.trim().split(':')[0].trim();
        if (k && !['headers', 'params', 'auth'].includes(k)) bObj[k] = getSampleValueForField(k);
      }
      if (Object.keys(bObj).length > 0) customBody = JSON.stringify(bObj, null, 2);
    }
    add(method, match[2], 'Axios', null, null, customBody);
  }

  for (const match of content.matchAll(/\baxios\s*\(\s*\{[\s\S]{0,300}?\burl\s*:\s*[`'"]([^`'"]+)[`'"][\s\S]{0,300}?\bmethod\s*:\s*[`'"](\w+)['"]/gi)) {
    add(match[2].toUpperCase(), match[1], 'Axios');
  }

  for (const match of content.matchAll(/\b(?:got|ky|superagent|wretch|api|client|http|request)\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi)) {
    add(match[1].toUpperCase(), match[2], 'HTTP Client');
  }

  for (const match of content.matchAll(/\.(?:open|request)\s*\(\s*[`'"](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)[`'"]\s*,\s*[`'"]([^`'"]+)[`'"]/gi)) {
    add(match[1].toUpperCase(), match[2], 'XMLHttpRequest/HTTP');
  }

  for (const match of content.matchAll(/\b(?:graphql|request)\s*\([^\)]{0,120}?\b(?:url|endpoint)\s*[:=]\s*[`'"]([^`'"]+)[`'"]/gi)) {
    add('POST', match[1], 'GraphQL', null, null, JSON.stringify({ query: "{ user { id name email } }" }, null, 2));
  }

  // ── 10. OpenAPI / Swagger JSON ────────────────────────────────────────
  if (normalizedFileName.endsWith('.json') && (content.includes('"openapi"') || content.includes('"swagger"'))) {
    try {
      const doc = JSON.parse(content);
      if (doc.paths && typeof doc.paths === 'object') {
        for (const [docPath, methods] of Object.entries(doc.paths)) {
          if (typeof methods === 'object' && methods !== null) {
            for (const [m, op] of Object.entries(methods)) {
              if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(m.toLowerCase())) {
                const tag = op.tags?.[0] || getFolderName(fileName, docPath);
                let customBody = null;
                const reqBodySchema = op.requestBody?.content?.['application/json']?.schema;
                if (reqBodySchema) {
                  const resolved = resolveOpenApiSchema(reqBodySchema, doc);
                  if (resolved && typeof resolved === 'object' && Object.keys(resolved).length > 0) {
                    customBody = JSON.stringify(resolved, null, 2);
                  }
                }
                add(m, docPath, 'OpenAPI Spec', op.summary || op.description || `OpenAPI: ${m.toUpperCase()} ${docPath}`, tag, customBody);
              }
            }
          }
        }
      }
    } catch {}
  }

  // ── 11. Postman Collection JSON inside repository ──────────────────────
  if (normalizedFileName.endsWith('.json') && (content.includes('schema.getpostman.com') || (content.includes('"item"') && content.includes('"request"')))) {
    try {
      const postmanDoc = JSON.parse(content);
      const parseItems = (items, currentFolder) => {
        for (const it of items || []) {
          if (it.request) {
            const rawUrl = typeof it.request.url === 'string'
              ? it.request.url
              : (it.request.url?.raw || (Array.isArray(it.request.url?.path) ? `/${it.request.url.path.join('/')}` : ''));
            let customBody = null;
            if (it.request.body?.raw) {
              customBody = it.request.body.raw;
            } else if (Array.isArray(it.request.body?.urlencoded)) {
              const urlEncodedObj = {};
              for (const param of it.request.body.urlencoded) {
                if (param.key) urlEncodedObj[param.key] = param.value || getSampleValueForField(param.key);
              }
              customBody = JSON.stringify(urlEncodedObj, null, 2);
            }
            add(it.request.method || 'GET', rawUrl, 'Postman Collection', it.name || it.request.description || '', currentFolder || 'Postman Collection', customBody);
          } else if (Array.isArray(it.item)) {
            parseItems(it.item, it.name || currentFolder);
          }
        }
      };
      if (Array.isArray(postmanDoc.item)) {
        parseItems(postmanDoc.item, postmanDoc.info?.name || 'Postman Collection');
      }
    } catch {}
  }

  return matches;
}

function analyzeFiles(inputFiles) {
  const relevantFiles = inputFiles
    .filter((file) => file && typeof file.name === 'string' && typeof file.content === 'string' && isRelevantFile(file.name))
    .filter((file) => Buffer.byteLength(file.content, 'utf8') <= MAX_FILE_BYTES);

  const scoreFile = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('route') || lower.includes('router') || lower.includes('controller') || lower.includes('api')) return 100;
    if (lower.includes('service') || lower.includes('handler') || lower.includes('client') || lower.includes('fetch')) return 80;
    if (lower.includes('app') || lower.includes('server') || lower.includes('index') || lower.includes('main')) return 60;
    if (lower.startsWith('.env')) return 50;
    return 10;
  };

  const sortedFiles = relevantFiles.sort((a, b) => scoreFile(b.name) - scoreFile(a.name));

  let currentBytes = 0;
  const safeFiles = [];
  for (const file of sortedFiles) {
    const size = Buffer.byteLength(file.content, 'utf8');
    if (safeFiles.length >= MAX_FILES || (currentBytes + size > MAX_TOTAL_BYTES && safeFiles.length >= 20)) {
      break;
    }
    safeFiles.push(file);
    currentBytes += size;
  }

  const env = parseEnv(safeFiles);
  const endpoints = safeFiles.flatMap((file) => detectFromContent(file.content, file.name, env));

  // Deduplicate endpoints by method + path
  const seen = new Set();
  const uniqueEndpoints = [];
  for (const ep of endpoints) {
    const key = `${ep.method}:${ep.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEndpoints.push(ep);
    }
  }

  const configKeys = [...new Set(safeFiles.flatMap((file) => [...file.content.matchAll(/\b([A-Z][A-Z0-9_]*(?:URL|HOST|ENDPOINT|DATABASE|REDIS|SERVICE|KEY|SECRET|TOKEN)[A-Z0-9_]*)\b/g)].map((match) => match[1])))];
  return { endpoints: uniqueEndpoints, filesAnalyzed: safeFiles.length, configKeys };
}

async function readGithubRepository(repositoryUrl) {
  if (!repositoryUrl || typeof repositoryUrl !== 'string') {
    throw Object.assign(new Error('Indica la URL de un repositorio GitHub.'), { statusCode: 400 });
  }
  const match = repositoryUrl.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?(?:[/?#].*)?$/i);
  if (!match) {
    throw Object.assign(new Error('Usa una URL válida de repositorio GitHub (ej: https://github.com/usuario/repo).'), { statusCode: 400 });
  }
  const [, owner, repo] = match;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'api-wallet-importer' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers });
  if (!treeResponse.ok) {
    throw Object.assign(new Error('No se pudo leer el repositorio GitHub. Comprueba que sea público o que la URL sea correcta.'), { statusCode: treeResponse.status === 404 ? 404 : 502 });
  }
  const tree = await treeResponse.json();
  const blobs = (tree.tree || []).filter((item) => item.type === 'blob' && isRelevantFile(item.path)).slice(0, MAX_FILES);
  const files = [];
  for (const blob of blobs) {
    if (blob.size > MAX_FILE_BYTES) continue;
    const encodedPath = blob.path.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${encodedPath}`, { headers: { 'User-Agent': 'api-wallet-importer' } });
    if (response.ok) files.push({ name: blob.path, content: await response.text() });
  }
  return files;
}

module.exports = {
  analyzeFiles,
  readGithubRepository,
  detectFromContent,
  isRelevantFile,
  normalizeUrl,
  getPath,
  getFolderName,
  getSampleValueForField,
  inferRequestBody,
  resolveOpenApiSchema,
};
