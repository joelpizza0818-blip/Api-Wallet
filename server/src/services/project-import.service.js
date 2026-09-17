const path = require('node:path');

const MAX_FILES = 300;
const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 1_500_000;
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.py', '.go', '.java', '.rb', '.php', '.json', '.yml', '.yaml', '.env']);
const IGNORED_PARTS = new Set(['node_modules', '.git', 'dist', 'build', 'target', 'coverage', '.next']);

function isRelevantFile(name) {
  const normalized = name.replaceAll('\\', '/');
  if (normalized.split('/').some((part) => IGNORED_PARTS.has(part))) return false;
  return SOURCE_EXTENSIONS.has(path.extname(normalized).toLowerCase()) || path.basename(normalized).startsWith('.env');
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

function resolveTemplate(value, env) {
  return value.replace(/\$\{([A-Z][A-Z0-9_]*)\}|\b([A-Z][A-Z0-9_]*_URL)\b/g, (full, templateKey, plainKey) => env[templateKey || plainKey] || full);
}

function normalizeUrl(raw, env) {
  const resolved = resolveTemplate(raw.trim().replace(/["'`]$/, ''), env);
  if (/^https?:\/\//i.test(resolved)) return resolved;
  return resolved.startsWith('/') ? resolved : `/${resolved}`;
}

function getPath(url) {
  try {
    return new URL(url).pathname || '/';
  } catch {
    const pathPart = url.match(/https?:\/\/[^/]+(\/[^?#]*)/i)?.[1] || url.split('?')[0];
    return pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  }
}

function detectFromContent(content, fileName, env) {
  const matches = [];
  const add = (method, rawUrl, library) => {
    if (!rawUrl || rawUrl.length > 500) return;
    const url = normalizeUrl(rawUrl, env);
    const key = `${method}:${url}`;
    if (!matches.some((item) => `${item.method}:${item.url}` === key)) matches.push({ name: `${method} ${getPath(url)}`, method, path: getPath(url), url, description: `Detectado en ${fileName} (${library})`, headers: [], params: [], body: '' });
  };

  for (const match of content.matchAll(/\bfetch\s*\(\s*[`'\"]([^`'\"]+)[`'\"](?:\s*,\s*\{([\s\S]{0,600}?)\})?/g)) add((match[2]?.match(/\bmethod\s*:\s*['"](\w+)/i)?.[1] || 'GET').toUpperCase(), match[1], 'fetch');
  for (const match of content.matchAll(/\baxios\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*[`'\"]([^`'\"]+)/gi)) add(match[1].toUpperCase(), match[2], 'Axios');
  for (const match of content.matchAll(/\b(?:got|ky|superagent)\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*[`'\"]([^`'\"]+)/gi)) add(match[1].toUpperCase(), match[2], match[0].split('.')[0]);
  for (const match of content.matchAll(/\.(?:open|request)\s*\(\s*[`'\"](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)[`'\"]\s*,\s*[`'\"]([^`'\"]+)/gi)) add(match[1].toUpperCase(), match[2], 'XMLHttpRequest/HTTP');
  for (const match of content.matchAll(/\b(?:graphql|request)\s*\([^)]{0,120}?\b(?:url|endpoint)\s*[:=]\s*[`'\"]([^`'\"]+)/gi)) add('POST', match[1], 'GraphQL');
  return matches;
}

function analyzeFiles(inputFiles) {
  const files = inputFiles.filter((file) => file && typeof file.name === 'string' && typeof file.content === 'string' && isRelevantFile(file.name)).slice(0, MAX_FILES);
  const totalBytes = files.reduce((total, file) => total + Buffer.byteLength(file.content, 'utf8'), 0);
  if (totalBytes > MAX_TOTAL_BYTES) throw Object.assign(new Error('El proyecto supera el límite de 1.5 MB para análisis.'), { statusCode: 413 });
  const safeFiles = files.filter((file) => Buffer.byteLength(file.content, 'utf8') <= MAX_FILE_BYTES);
  const env = parseEnv(safeFiles);
  const endpoints = safeFiles.flatMap((file) => detectFromContent(file.content, file.name, env));
  const configKeys = [...new Set(safeFiles.flatMap((file) => [...file.content.matchAll(/\b([A-Z][A-Z0-9_]*(?:URL|HOST|ENDPOINT|DATABASE|REDIS|SERVICE)[A-Z0-9_]*)\b/g)].map((match) => match[1])))];
  return { endpoints, filesAnalyzed: safeFiles.length, configKeys };
}

async function readGithubRepository(repositoryUrl) {
  const match = repositoryUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?(?:[/?#].*)?$/i);
  if (!match) throw Object.assign(new Error('Usa una URL válida de repositorio GitHub.'), { statusCode: 400 });
  const [, owner, repo] = match;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'api-wallet-importer' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers });
  if (!treeResponse.ok) throw Object.assign(new Error('No se pudo leer el repositorio GitHub. Comprueba que sea público o configura GITHUB_TOKEN.'), { statusCode: treeResponse.status === 404 ? 404 : 502 });
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

module.exports = { analyzeFiles, readGithubRepository };
