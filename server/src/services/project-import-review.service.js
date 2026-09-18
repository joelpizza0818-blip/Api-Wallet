const { generateReply } = require('../controllers/ai.controller');

const MAX_REVIEW_FILES = 12;
const MAX_FILE_CHARS = 6000;
const MAX_ENDPOINTS = 150;
const MAX_ATTEMPTS = 2;

function isReviewEnabled() {
  return process.env.IMPORT_AI_REVIEW_ENABLED !== 'false'
    && Boolean(process.env.API_KEY_GEMINI1 || process.env.API_KEY_GEMINI2);
}

function redactContent(file) {
  if (/^\.env(?:\.|$)/i.test(file.name)) return null;
  return file.content
    .replace(/(["']?(?:password|secret|token|api[_-]?key|private[_-]?key)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, '$1[REDACTED]')
    .slice(0, MAX_FILE_CHARS);
}

function buildReviewPrompt(files, analysis, attempt) {
  const source = files
    .map((file) => {
      const content = redactContent(file);
      return content ? `FILE: ${file.name}\n${content}` : '';
    })
    .filter(Boolean)
    .slice(0, MAX_REVIEW_FILES)
    .join('\n\n');

  return `Eres un revisor estricto de un importador de APIs. Esta es la revision ${attempt} de ${MAX_ATTEMPTS}.
Revisa los endpoints detectados contra el codigo fuente. No asumas que /api es un prefijo universal: /api/api y /users pueden ser rutas validas distintas. Solo marca un problema si existe evidencia en el codigo.
No inventes endpoints, no borres rutas explicitas y no cambies paths por preferencias.
Devuelve SOLO JSON valido con esta forma:
{"status":"pass"|"review","issues":[{"severity":"high"|"medium"|"low","message":"...","endpointKey":"METHOD:/path o null","evidence":"archivo y fragmento corto"}],"suggestions":["..."]}
Usa status=pass si no hay un problema demostrable. Como maximo devuelve 10 issues y 10 suggestions.

ENDPOINTS DETECTADOS:\n${JSON.stringify(analysis.endpoints.slice(0, MAX_ENDPOINTS))}\n\nCODIGO FUENTE:\n${source}`;
}

function parseReviewResponse(reply) {
  const text = String(reply || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La IA no devolvio JSON valido.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const issues = Array.isArray(parsed.issues) ? parsed.issues.slice(0, 10).map((issue) => ({
    severity: ['high', 'medium', 'low'].includes(issue?.severity) ? issue.severity : 'medium',
    message: String(issue?.message || 'Problema detectado por el revisor.'),
    endpointKey: issue?.endpointKey ? String(issue.endpointKey) : null,
    evidence: issue?.evidence ? String(issue.evidence) : '',
  })) : [];
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 10).map(String) : [];
  return {
    status: parsed.status === 'review' && issues.length ? 'review' : 'pass',
    issues,
    suggestions,
  };
}

async function reviewImport(files, analysis) {
  if (!isReviewEnabled() || !analysis.endpoints.length) {
    return { enabled: false, status: 'skipped', attempts: 0, issues: [], suggestions: [] };
  }

  let lastReview = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      lastReview = parseReviewResponse(await generateReply([
        { role: 'user', content: buildReviewPrompt(files, analysis, attempt) },
      ]));
      lastReview.attempts = attempt;
      if (lastReview.status === 'pass') break;
    } catch (error) {
      return {
        enabled: true,
        status: 'unavailable',
        attempts: attempt,
        issues: [],
        suggestions: [],
        message: error.message,
      };
    }
  }

  return {
    enabled: true,
    status: lastReview?.status || 'unavailable',
    attempts: lastReview?.attempts || 0,
    issues: lastReview?.issues || [],
    suggestions: lastReview?.suggestions || [],
  };
}

module.exports = { reviewImport, parseReviewResponse, buildReviewPrompt, isReviewEnabled };
