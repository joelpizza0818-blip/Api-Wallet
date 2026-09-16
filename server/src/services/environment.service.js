const prisma = require('../config/database');
const { decrypt } = require('./encryption.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Creates a new environment for a project.
 * If isDefault is true, unsets isDefault on any other environment for this project.
 */
async function createEnvironment(projectId, data = {}) {
  if (!projectId) throw fail('projectId is required');
  if (!data.name || !data.name.trim()) throw fail('Environment name is required');

  const name = data.name.trim();
  const slug = data.slug ? slugify(data.slug) : slugify(name);
  const isDefault = Boolean(data.isDefault);

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.environment.updateMany({
        where: { projectId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.environment.create({
      data: {
        projectId,
        name,
        slug,
        baseUrl: data.baseUrl ? data.baseUrl.trim() : null,
        isDefault,
      },
    });
  });
}

/**
 * Returns all environments for a project.
 */
async function getEnvironments(projectId) {
  if (!projectId) throw fail('projectId is required');
  return prisma.environment.findMany({
    where: { projectId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

/**
 * Updates an existing environment.
 */
async function updateEnvironment(environmentId, data = {}) {
  if (!environmentId) throw fail('environmentId is required');

  const env = await prisma.environment.findUnique({ where: { id: environmentId } });
  if (!env) throw fail('Environment not found', 404);

  const isDefault = data.isDefault !== undefined ? Boolean(data.isDefault) : undefined;

  return prisma.$transaction(async (tx) => {
    if (isDefault === true) {
      await tx.environment.updateMany({
        where: { projectId: env.projectId, isDefault: true, id: { not: env.id } },
        data: { isDefault: false },
      });
    }

    return tx.environment.update({
      where: { id: environmentId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.slug && { slug: slugify(data.slug) }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl ? data.baseUrl.trim() : null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });
  });
}

/**
 * Deletes an environment by ID.
 */
async function deleteEnvironment(environmentId) {
  if (!environmentId) throw fail('environmentId is required');
  return prisma.environment.delete({ where: { id: environmentId } });
}

/**
 * Sets a specific environment as the default for its project.
 */
async function setDefaultEnvironment(projectId, environmentId) {
  if (!projectId || !environmentId) throw fail('projectId and environmentId are required');

  return prisma.$transaction(async (tx) => {
    await tx.environment.updateMany({
      where: { projectId, isDefault: true },
      data: { isDefault: false },
    });

    return tx.environment.update({
      where: { id: environmentId },
      data: { isDefault: true },
    });
  });
}

/**
 * Gets the default environment for a project (or null if none exists).
 */
async function getDefaultEnvironment(projectId) {
  if (!projectId) throw fail('projectId is required');

  return prisma.environment.findFirst({
    where: { projectId, isDefault: true },
    include: { secrets: true },
  });
}

/**
 * Resolves templated variables like `{{baseUrl}}` and encrypted `{{SECRET_NAME}}`
 * using the given environment.
 */
async function resolveEnvironmentVariables(templateText, environmentId) {
  if (!templateText || typeof templateText !== 'string') return templateText;
  if (!environmentId) return templateText;

  const env = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { secrets: true },
  });

  if (!env) return templateText;

  // Build variable dictionary
  const variableMap = new Map();
  if (env.baseUrl) {
    variableMap.set('baseUrl', env.baseUrl);
    variableMap.set('BASE_URL', env.baseUrl);
    // Keep API_URL compatible with requests created before environments used
    // BASE_URL as the canonical variable name.
    variableMap.set('API_URL', env.baseUrl);
  }

  // Decrypt secrets into memory for substitution
  for (const secret of env.secrets || []) {
    try {
      const decrypted = decrypt(secret.encryptedValue, secret.encryptionKeyVersion);
      if (decrypted !== null) {
        variableMap.set(secret.name, decrypted);
      }
    } catch {
      // Ignore unresolvable individual secrets
    }
  }

  // Replace all {{variableName}}
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
    if (variableMap.has(varName)) {
      return variableMap.get(varName);
    }
    return match;
  });
}

module.exports = {
  createEnvironment,
  getEnvironments,
  updateEnvironment,
  deleteEnvironment,
  setDefaultEnvironment,
  getDefaultEnvironment,
  resolveEnvironmentVariables,
  // Backwards compatibility alias
  listByProject: getEnvironments,
  create: createEnvironment,
  update: updateEnvironment,
  remove: deleteEnvironment,
};
