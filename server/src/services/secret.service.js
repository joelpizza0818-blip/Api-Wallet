const prisma = require('../config/database');
const { encrypt, decrypt } = require('./encryption.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

/**
 * Creates or upserts an encrypted secret for a given environment.
 */
async function createSecret(environmentId, name, value) {
  if (!environmentId) throw fail('environmentId is required');
  if (!name || !name.trim()) throw fail('Secret name is required');
  if (value === undefined || value === null || typeof value !== 'string' || !value.length) {
    throw fail('Secret value is required');
  }

  const cleanName = name.trim();
  const secret = await prisma.secret.upsert({
    where: {
      environmentId_name: {
        environmentId,
        name: cleanName,
      },
    },
    update: {
      encryptedValue: encrypt(value),
      encryptionKeyVersion: 1,
    },
    create: {
      environmentId,
      name: cleanName,
      encryptedValue: encrypt(value),
      encryptionKeyVersion: 1,
    },
  });

  return {
    id: secret.id,
    environmentId: secret.environmentId,
    name: secret.name,
    encryptionKeyVersion: secret.encryptionKeyVersion,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  };
}

/**
 * Returns the list of secrets for an environment without exposing sensitive values.
 */
async function getSecrets(environmentId) {
  if (!environmentId) throw fail('environmentId is required');

  return prisma.secret.findMany({
    where: { environmentId },
    select: {
      id: true,
      environmentId: true,
      name: true,
      encryptionKeyVersion: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Returns metadata of a secret by name.
 */
async function getSecretByName(environmentId, name) {
  if (!environmentId || !name) return null;

  return prisma.secret.findUnique({
    where: {
      environmentId_name: {
        environmentId,
        name: name.trim(),
      },
    },
    select: {
      id: true,
      environmentId: true,
      name: true,
      encryptionKeyVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Updates a secret's value by ID.
 */
async function updateSecret(secretId, value) {
  if (!secretId) throw fail('secretId is required');
  if (value === undefined || value === null || typeof value !== 'string') {
    throw fail('Secret value is required');
  }

  const secret = await prisma.secret.update({
    where: { id: secretId },
    data: {
      encryptedValue: encrypt(value),
      encryptionKeyVersion: 1,
    },
    select: {
      id: true,
      environmentId: true,
      name: true,
      encryptionKeyVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return secret;
}

/**
 * Deletes a secret by ID.
 */
async function deleteSecret(secretId) {
  if (!secretId) throw fail('secretId is required');
  return prisma.secret.delete({ where: { id: secretId } });
}

/**
 * Resolves and decrypts a secret strictly in-memory for the request runner.
 */
async function resolveSecret(environmentId, name) {
  if (!environmentId || !name) return null;

  const secret = await prisma.secret.findUnique({
    where: {
      environmentId_name: {
        environmentId,
        name: name.trim(),
      },
    },
  });

  if (!secret) return null;
  return decrypt(secret.encryptedValue, secret.encryptionKeyVersion);
}

module.exports = {
  createSecret,
  getSecrets,
  getSecretByName,
  updateSecret,
  deleteSecret,
  resolveSecret,
  // Backwards compatibility alias
  listByEnvironment: getSecrets,
  upsert: createSecret,
  remove: deleteSecret,
};
