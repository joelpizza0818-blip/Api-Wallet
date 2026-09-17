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

function detectFromContent(content, fileName, env) {
  const matches = [];
  const normalizedFileName = fileName.replaceAll('\\', '/');

  const add = (method, rawUrl, library, customDescription, customFolder) => {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.length > 500 || rawUrl === '*' || rawUrl === '/*') return;
    const url = normalizeUrl(rawUrl, env);
    const cleanPath = getPath(url);
    const upperMethod = (method || 'GET').toUpperCase();
    const folderName = customFolder || getFolderName(fileName, cleanPath);
    const key = `${upperMethod}:${cleanPath}`;
    if (!matches.some((item) => `${item.method}:${item.path}` === key)) {
      matches.push({
        name: `${upperMethod} ${cleanPath}`,
        method: upperMethod,
        path: cleanPath,
        url: url.startsWith('http') || url.startsWith('{{baseUrl}}') ? url : `{{baseUrl}}${cleanPath}`,
        description: customDescription || `Detectado en ${fileName} (${library})`,
        folderName,
        headers: [],
        params: [],
        body: '',
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
  const goRouterRegex = /\b(?:r|router|api|app|e|g|v1)\s*\.\s*(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(\s*["`]([^"`]+)["`]/g;
  for (const match of content.matchAll(goRouterRegex)) {
    add(match[1], match[2], 'Go Router');
  }
  const goHttpRegex = /http\s*\.\s*HandleFunc\s*\(\s*["`]([^"`]+)["`]/g;
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
    add(method, match[1], 'fetch');
  }

  for (const match of content.matchAll(/\baxios\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi)) {
    add(match[1].toUpperCase(), match[2], 'Axios');
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

  for (const match of content.matchAll(/\b(?:graphql|request)\s*\([^)]{0,120}?\b(?:url|endpoint)\s*[:=]\s*[`'"]([^`'"]+)[`'"]/gi)) {
    add('POST', match[1], 'GraphQL');
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
                add(m, docPath, 'OpenAPI Spec', op.summary || op.description || `OpenAPI: ${m.toUpperCase()} ${docPath}`, tag);
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
            add(it.request.method || 'GET', rawUrl, 'Postman Collection', it.name || it.request.description || '', currentFolder || 'Postman Collection');
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
  const match = repositoryUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?(?:[/?#].*)?$/i);
  if (!match) throw Object.assign(new Error('Usa una URL válida de repositorio GitHub (ej: https://github.com/usuario/repo).'), { statusCode: 400 });
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
    const response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${blob.path}`, { headers: { 'User-Agent': 'api-wallet-importer' } });
    if (response.ok) files.push({ name: blob.path, content: await response.text() });
  }
  return files;
}

module.exports = { analyzeFiles, readGithubRepository, detectFromContent, isRelevantFile, normalizeUrl, getPath, getFolderName };
