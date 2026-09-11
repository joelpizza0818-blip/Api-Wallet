const prisma = require('../config/database');
const { encrypt, decrypt, hash, compareHash } = require('./encryption.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

/**
 * Sanitizes ApiKey object for frontend/external consumption (removes encryptedValue).
 */
function sanitizeApiKey(key) {
  if (!key) return null;
  const { encryptedValue, ...safe } = key;
  return safe;
}

/**
 * Creates a new API Key with reversible encryption and irreversible hash.
 */
async function createApiKey({ projectId, userId, name, key, prefix, scopes = [], expiresAt = null }) {
  if (!projectId) throw fail('projectId is required');
  if (!userId) throw fail('userId is required');
  if (!name || !name.trim()) throw fail('API Key name is required');
  if (!key || typeof key !== 'string' || !key.trim()) throw fail('API key value is required');

  const rawKey = key.trim();
  const keyPrefix = prefix === 'sk_test' ? 'sk_test' : 'sk_live';
  const keyHash = hash(rawKey);

  const existing = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (existing) throw fail('An API key with this value already exists', 409);

  const apiKey = await prisma.apiKey.create({
    data: {
      projectId,
      createdById: userId,
      name: name.trim(),
      prefix: keyPrefix,
      keyHash,
      encryptedValue: encrypt(rawKey),
      encryptionKeyVersion: 1,
      lastFourCharacters: rawKey.slice(-4),
      scopes: Array.isArray(scopes) ? scopes : [],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'ACTIVE',
    },
  });

  return { ...sanitizeApiKey(apiKey), key: rawKey };
}

/**
 * Returns all active/non-revoked API keys for a project.
 */
async function getApiKeys(projectId, includeRevoked = false) {
  if (!projectId) throw fail('projectId is required');

  const where = { projectId };
  if (!includeRevoked) {
    where.status = { not: 'REVOKED' };
    where.revokedAt = null;
  }

  const keys = await prisma.apiKey.findMany({
    where,
    select: {
      id: true,
      projectId: true,
      name: true,
      prefix: true,
      lastFourCharacters: true,
      scopes: true,
      status: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
      createdById: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return keys;
}

/**
 * Gets a single API key by ID (sanitized).
 */
async function getApiKeyById(apiKeyId) {
  if (!apiKeyId) throw fail('apiKeyId is required');

  const key = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    include: { project: true },
  });

  if (!key) throw fail('API key not found', 404);
  return sanitizeApiKey(key);
}

/**
 * Recovers the plaintext API key strictly on the backend (internal use only, e.g. request runner).
 */
async function getPlaintextApiKey(apiKeyId) {
  if (!apiKeyId) throw fail('apiKeyId is required');

  const key = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  });

  if (!key) throw fail('API key not found', 404);
  if (key.status !== 'ACTIVE') throw fail('API key is not active', 403);
  if (key.expiresAt && key.expiresAt < new Date()) throw fail('API key has expired', 403);

  return decrypt(key.encryptedValue, key.encryptionKeyVersion);
}

/**
 * Permanently deletes an API key without breaking historical execution relations.
 */
async function revokeApiKey(apiKeyId) {
  if (!apiKeyId) throw fail('apiKeyId is required');

  try {
    return await prisma.apiKey.delete({ where: { id: apiKeyId } });
  } catch (error) {
    if (error.code === 'P2025') throw fail('API key not found', 404);
    throw error;
  }
}

/**
 * Rotates an existing API Key with a new raw key value.
 */
async function rotateApiKey(apiKeyId, newKey) {
  if (!apiKeyId) throw fail('apiKeyId is required');
  if (!newKey || typeof newKey !== 'string' || !newKey.trim()) throw fail('New API key value is required');

  const raw = newKey.trim();
  const keyHash = hash(raw);

  const updated = await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      keyHash,
      encryptedValue: encrypt(raw),
      lastFourCharacters: raw.slice(-4),
      status: 'ACTIVE',
      revokedAt: null,
    },
  });

  return { ...sanitizeApiKey(updated), key: raw };
}

/**
 * Hard deletes an API key (when explicitly permitted).
 */
async function deleteApiKey(apiKeyId) {
  if (!apiKeyId) throw fail('apiKeyId is required');
  return prisma.apiKey.delete({ where: { id: apiKeyId } });
}

/**
 * Validates a raw API key presented in incoming requests.
 * Updates lastUsedAt on success.
 */
async function validateApiKey(rawKey, projectId = null) {
  if (!rawKey || typeof rawKey !== 'string') return null;

  const keyHash = hash(rawKey.trim());
  const where = { keyHash };
  if (projectId) where.projectId = projectId;

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { project: true },
  });

  if (!apiKey) return null;
  if (apiKey.status !== 'ACTIVE') return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    await prisma.apiKey.update({ where: { id: apiKey.id }, data: { status: 'EXPIRED' } });
    return null;
  }
  if (projectId && apiKey.projectId !== projectId) return null;

  // Asynchronously record lastUsedAt
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return sanitizeApiKey(apiKey);
}

module.exports = {
  createApiKey,
  getApiKeys,
  getApiKeyById,
  getPlaintextApiKey,
  revokeApiKey,
  rotateApiKey,
  deleteApiKey,
  validateApiKey,
  sanitizeApiKey,
};
