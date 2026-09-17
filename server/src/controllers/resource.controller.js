const crypto = require('crypto');
const prisma = require('../config/database');
const apiKeyService = require('../services/apiKey.service');
const secretService = require('../services/secret.service');
const environmentService = require('../services/environment.service');
const { createActivity } = require('../services/activity.service');
const { executeRequest } = require('../services/requestRunner.service');
const { WRITE_ROLES, ADMIN_ROLES, requireWorkspaceRole, projectAccess, collectionAccess } = require('../services/authorization.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const clean = (value) => (typeof value === 'string' ? value.trim() : value);
const slug = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const page = (res, data, status = 200) => res.status(status).json({ success: true, data });
const checkName = (name) => {
  if (!clean(name)) throw fail('Name is required');
};

async function logActivity(workspaceId, userId, type, entityType, entityId, metadata = {}) {
  try {
    await createActivity({ workspaceId, userId, type, entityType, entityId, metadata });
  } catch (err) {
    console.error(`[Activity Log Error]: ${err.message}`);
  }
}

// =================== WORKSPACES ===================
async function listWorkspaces(req, res) {
  page(
    res,
    await prisma.workspace.findMany({
      where: { members: { some: { userId: req.user.id, status: 'ACTIVE' } } },
      include: { _count: { select: { projects: true, members: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  );
}

async function listPublicProjects(_req, res) {
  page(res, await prisma.project.findMany({
    where: { workspace: { visibility: 'PUBLIC' } },
    select: { id: true, name: true, description: true, updatedAt: true, workspace: { select: { id: true, name: true, description: true } }, _count: { select: { collections: true } } },
    orderBy: { updatedAt: 'desc' },
  }));
}

async function accessPublicProject(req, res) {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId }, select: { id: true, workspaceId: true, workspace: { select: { visibility: true, name: true } } } });
  if (!project || project.workspace.visibility !== 'PUBLIC') throw fail('Proyecto público no encontrado', 404);
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: req.user.id } },
    update: {},
    create: { workspaceId: project.workspaceId, userId: req.user.id, role: 'VIEWER', status: 'ACTIVE' },
  });
  page(res, { projectId: project.id, workspaceId: project.workspaceId, workspaceName: project.workspace.name, role: 'VIEWER' });
}

async function createWorkspace(req, res) {
  checkName(req.body.name);
  const visibility = ['personal', 'team', 'public'].includes(req.body.visibility) ? req.body.visibility.toUpperCase() : 'TEAM';
  const workspace = await prisma.workspace.create({
    data: {
      name: clean(req.body.name),
      slug: slug(req.body.slug || req.body.name),
      description: clean(req.body.description) || null,
      visibility,
      ownerId: req.user.id,
      members: { create: { userId: req.user.id, role: 'OWNER' } },
      projects: { create: { name: 'Default Project', description: 'Proyecto inicial del workspace' } },
    },
  });
  await logActivity(workspace.id, req.user.id, 'PROJECT_CREATED', 'workspace', workspace.id);
  page(res, workspace, 201);
}

async function getWorkspace(req, res) {
  await requireWorkspaceRole(req.user.id, req.params.workspaceId);
  page(
    res,
    await prisma.workspace.findUnique({
      where: { id: req.params.workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        projects: true,
      },
    })
  );
}

async function updateWorkspace(req, res) {
  await requireWorkspaceRole(req.user.id, req.params.workspaceId, ADMIN_ROLES);
  const inviteCode = req.body.regenerateInviteCode
    ? `WS-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
    : undefined;

  page(
    res,
    await prisma.workspace.update({
      where: { id: req.params.workspaceId },
      data: {
        ...(req.body.name && { name: clean(req.body.name) }),
        ...(req.body.description !== undefined && { description: clean(req.body.description) }),
        ...(inviteCode && { inviteCode }),
        ...( ['PERSONAL', 'TEAM', 'PUBLIC'].includes(String(req.body.visibility || '').toUpperCase()) && { visibility: String(req.body.visibility).toUpperCase() }),
      },
    })
  );
}

async function removeWorkspace(req, res) {
  const member = await requireWorkspaceRole(req.user.id, req.params.workspaceId, new Set(['OWNER']));
  await prisma.workspace.delete({ where: { id: member.workspaceId } });
  res.status(204).end();
}

// =================== PROJECTS ===================
async function listProjects(req, res) {
  await requireWorkspaceRole(req.user.id, req.params.workspaceId);
  page(
    res,
    await prisma.project.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: { _count: { select: { collections: true, apiKeys: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  );
}

async function createProject(req, res) {
  await requireWorkspaceRole(req.user.id, req.params.workspaceId, WRITE_ROLES);
  checkName(req.body.name);

  const project = await prisma.project.create({
    data: {
      workspaceId: req.params.workspaceId,
      name: clean(req.body.name),
      description: clean(req.body.description) || null,
      environments: {
        create: [
          { name: 'Producción', slug: 'production', isDefault: true },
          { name: 'Staging / Dev', slug: 'staging-dev' },
        ],
      },
    },
  });

  await logActivity(req.params.workspaceId, req.user.id, 'PROJECT_CREATED', 'project', project.id);
  page(res, project, 201);
}

async function getProject(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId);
  page(
    res,
    await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        collections: { include: { requests: true }, orderBy: { sortOrder: 'asc' } },
        environments: true,
        apiKeys: {
          where: { status: { not: 'REVOKED' }, revokedAt: null },
          select: {
            id: true,
            name: true,
            prefix: true,
            lastFourCharacters: true,
            scopes: true,
            status: true,
            createdAt: true,
            lastUsedAt: true,
            revokedAt: true,
          },
        },
      },
    })
  );
}

async function updateProject(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  page(
    res,
    await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(req.body.name && { name: clean(req.body.name) }),
        ...(req.body.description !== undefined && { description: clean(req.body.description) || null }),
        ...(req.body.status && { status: req.body.status }),
      },
    })
  );
}

async function removeProject(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, ADMIN_ROLES);
  await prisma.project.delete({ where: { id: project.id } });
  res.status(204).end();
}

// =================== COLLECTIONS ===================
async function listCollections(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  page(
    res,
    await prisma.collection.findMany({
      where: { projectId: req.params.projectId },
      include: { requests: true },
      orderBy: { sortOrder: 'asc' },
    })
  );
}

async function createCollection(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  checkName(req.body.name);

  const parentId = clean(req.body.parentId) || null;
  if (parentId) {
    const parent = await prisma.collection.findFirst({ where: { id: parentId, projectId: project.id } });
    if (!parent) throw fail('Parent collection not found', 404);
  }

  const collection = await prisma.collection.create({
    data: {
      projectId: project.id,
      parentId,
      name: clean(req.body.name),
      description: clean(req.body.description) || null,
      sortOrder: Number.isInteger(req.body.sortOrder) ? req.body.sortOrder : 0,
    },
  });

  await logActivity(project.workspaceId, req.user.id, 'COLLECTION_CREATED', 'collection', collection.id);
  page(res, collection, 201);
}

async function updateCollection(req, res) {
  const collection = await collectionAccess(req.user.id, req.params.collectionId, WRITE_ROLES);
  const parentId = req.body.parentId === undefined ? undefined : clean(req.body.parentId) || null;

  if (parentId) {
    if (parentId === collection.id) throw fail('A collection cannot be its own parent');
    const parent = await prisma.collection.findFirst({ where: { id: parentId, projectId: collection.projectId } });
    if (!parent) throw fail('Parent collection not found', 404);
  }

  page(
    res,
    await prisma.collection.update({
      where: { id: collection.id },
      data: {
        ...(req.body.name && { name: clean(req.body.name) }),
        ...(req.body.description !== undefined && { description: clean(req.body.description) || null }),
        ...(parentId !== undefined && { parentId }),
        ...(req.body.authorization && { authorization: req.body.authorization }),
        ...(typeof req.body.preRequestScript === 'string' && { preRequestScript: req.body.preRequestScript }),
        ...(typeof req.body.testScript === 'string' && { testScript: req.body.testScript }),
        ...(Number.isInteger(req.body.sortOrder) && { sortOrder: req.body.sortOrder }),
      },
    })
  );
}

async function removeCollection(req, res) {
  const collection = await collectionAccess(req.user.id, req.params.collectionId, WRITE_ROLES);
  await prisma.collection.delete({ where: { id: collection.id } });
  res.status(204).end();
}

// =================== REQUESTS ===================
function requestData(body) {
  checkName(body.name);
  const method = (body.method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
    throw fail('Invalid HTTP method');
  }
  if (!clean(body.path)?.startsWith('/')) throw fail('Path must begin with /');

  return {
    name: clean(body.name),
    method,
    path: clean(body.path),
    url: clean(body.url) || null,
    description: clean(body.description) || null,
    headers: Array.isArray(body.headers) ? body.headers : [],
    params: Array.isArray(body.params) ? body.params : [],
    body: typeof body.body === 'string' ? body.body : null,
    responseSample: typeof body.responseSample === 'string' ? body.responseSample : null,
    authorization: body.authorization && typeof body.authorization === 'object' ? body.authorization : {},
    preRequestScript: typeof body.preRequestScript === 'string' ? body.preRequestScript : null,
    testScript: typeof body.testScript === 'string' ? body.testScript : null,
  };
}

async function listRequests(req, res) {
  await collectionAccess(req.user.id, req.params.collectionId);
  page(
    res,
    await prisma.apiRequest.findMany({
      where: { collectionId: req.params.collectionId },
      orderBy: { updatedAt: 'desc' },
    })
  );
}

async function createRequest(req, res) {
  const collection = await collectionAccess(req.user.id, req.params.collectionId, WRITE_ROLES);
  const item = await prisma.apiRequest.create({
    data: {
      collectionId: collection.id,
      ...requestData(req.body),
    },
  });

  await logActivity(collection.project.workspaceId, req.user.id, 'REQUEST_CREATED', 'request', item.id);
  page(res, item, 201);
}

async function updateRequest(req, res) {
  const item = await prisma.apiRequest.findUnique({
    where: { id: req.params.requestId },
    include: { collection: { include: { project: true } } },
  });
  if (!item) throw fail('Request not found', 404);

  await requireWorkspaceRole(req.user.id, item.collection.project.workspaceId, WRITE_ROLES);
  page(
    res,
    await prisma.apiRequest.update({
      where: { id: item.id },
      data: requestData({ ...item, ...req.body }),
    })
  );
}

async function removeRequest(req, res) {
  const item = await prisma.apiRequest.findUnique({
    where: { id: req.params.requestId },
    include: { collection: { include: { project: true } } },
  });
  if (!item) throw fail('Request not found', 404);

  await requireWorkspaceRole(req.user.id, item.collection.project.workspaceId, WRITE_ROLES);
  await prisma.apiRequest.delete({ where: { id: item.id } });
  res.status(204).end();
}

async function executeSavedRequest(req, res) {
  const item = await prisma.apiRequest.findUnique({ where: { id: req.params.requestId }, include: { collection: { include: { project: true } } } });
  if (!item) throw fail('Request not found', 404);
  await requireWorkspaceRole(req.user.id, item.collection.project.workspaceId);
  const result = await executeRequest(item.id, { environmentId: req.body?.environmentId || null, apiKeyId: req.body?.apiKeyId || null });
  page(res, result);
}

// =================== ENVIRONMENTS ===================
async function listEnvironments(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  page(res, await environmentService.getEnvironments(req.params.projectId));
}

async function createEnvironment(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  const environment = await environmentService.createEnvironment(project.id, req.body);
  await logActivity(project.workspaceId, req.user.id, 'ENVIRONMENT_CREATED', 'environment', environment.id);
  page(res, environment, 201);
}

// =================== SECRETS ===================
async function listSecrets(req, res) {
  const env = await prisma.environment.findUnique({
    where: { id: req.params.environmentId },
    include: { project: true },
  });
  if (!env) throw fail('Environment not found', 404);

  await requireWorkspaceRole(req.user.id, env.project.workspaceId);
  page(res, await secretService.getSecrets(env.id));
}

async function createSecret(req, res) {
  const env = await prisma.environment.findUnique({
    where: { id: req.params.environmentId },
    include: { project: true },
  });
  if (!env) throw fail('Environment not found', 404);

  await requireWorkspaceRole(req.user.id, env.project.workspaceId, WRITE_ROLES);
  checkName(req.body.name);

  const secret = await secretService.createSecret(env.id, req.body.name, req.body.value);
  await logActivity(env.project.workspaceId, req.user.id, 'SECRET_CREATED', 'secret', secret.id);
  page(res, secret, 201);
}

async function removeSecret(req, res) {
  const secret = await prisma.secret.findUnique({
    where: { id: req.params.secretId },
    include: { environment: { include: { project: true } } },
  });
  if (!secret) throw fail('Secret not found', 404);

  await requireWorkspaceRole(req.user.id, secret.environment.project.workspaceId, WRITE_ROLES);
  await secretService.deleteSecret(secret.id);
  res.status(204).end();
}

// =================== API KEYS ===================
async function listApiKeys(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  page(res, await apiKeyService.getApiKeys(req.params.projectId));
}

async function createApiKey(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  const created = await apiKeyService.createApiKey({
    projectId: project.id,
    userId: req.user.id,
    name: req.body.name,
    key: req.body.key,
    prefix: req.body.prefix,
    scopes: req.body.scopes,
    expiresAt: req.body.expiresAt,
  });

  await logActivity(project.workspaceId, req.user.id, 'API_KEY_CREATED', 'api_key', created.id);
  page(res, created, 201);
}

async function revokeApiKey(req, res) {
  const key = await prisma.apiKey.findUnique({
    where: { id: req.params.apiKeyId },
    include: { project: true },
  });
  if (!key) throw fail('API key not found', 404);

  await requireWorkspaceRole(req.user.id, key.project.workspaceId, ADMIN_ROLES);
  await apiKeyService.revokeApiKey(key.id);
  res.status(204).end();
}

module.exports = {
  listPublicProjects,
  accessPublicProject,
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  removeWorkspace,
  listProjects,
  createProject,
  getProject,
  updateProject,
  removeProject,
  listCollections,
  createCollection,
  updateCollection,
  removeCollection,
  listRequests,
  createRequest,
  updateRequest,
  removeRequest,
  executeSavedRequest,
  listEnvironments,
  createEnvironment,
  listSecrets,
  createSecret,
  removeSecret,
  listApiKeys,
  createApiKey,
  revokeApiKey,
};
