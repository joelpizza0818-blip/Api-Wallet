const prisma = require('../config/database');

const WRITE_ROLES = new Set(['OWNER', 'ADMIN', 'DEVELOPER']);
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN']);
const ALL_ROLES = new Set(['OWNER', 'ADMIN', 'DEVELOPER', 'QA', 'VIEWER']);

/**
 * Retrieves the active membership record of a user in a workspace.
 */
async function getWorkspaceMembership(userId, workspaceId) {
  if (!userId || !workspaceId) return null;
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });
}

/**
 * Checks if a user has active membership in a workspace.
 */
async function hasWorkspaceAccess(userId, workspaceId) {
  const member = await getWorkspaceMembership(userId, workspaceId);
  return Boolean(member && member.status === 'ACTIVE');
}

/**
 * Checks if a user has a specific role (or one of the required roles) in a workspace.
 */
async function hasWorkspaceRole(userId, workspaceId, requiredRoles = null) {
  const member = await getWorkspaceMembership(userId, workspaceId);
  if (!member || member.status !== 'ACTIVE') return false;
  if (!requiredRoles) return true;

  if (requiredRoles instanceof Set) {
    return requiredRoles.has(member.role);
  }
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(member.role);
  }
  return member.role === requiredRoles;
}

/**
 * Throws a 403 Forbidden error if user does not have active workspace access.
 */
async function requireWorkspaceAccess(userId, workspaceId) {
  const member = await getWorkspaceMembership(userId, workspaceId);
  if (!member || member.status !== 'ACTIVE') {
    const error = new Error('Access denied: not a member of this workspace');
    error.statusCode = 403;
    throw error;
  }
  return member;
}

/**
 * Throws a 403 Forbidden error if user does not have the required role in the workspace.
 */
async function requireWorkspaceRole(userId, workspaceId, requiredRoles = null) {
  const member = await requireWorkspaceAccess(userId, workspaceId);
  if (!requiredRoles) return member;

  const isAllowed = requiredRoles instanceof Set
    ? requiredRoles.has(member.role)
    : Array.isArray(requiredRoles)
    ? requiredRoles.includes(member.role)
    : member.role === requiredRoles;

  if (!isAllowed) {
    const error = new Error('Access denied: insufficient permissions in this workspace');
    error.statusCode = 403;
    throw error;
  }

  return member;
}

/**
 * Validates access to a project and verifies that the user belongs to its workspace.
 */
async function projectAccess(userId, projectId, requiredRoles = null) {
  if (!projectId) {
    const error = new Error('Project ID is required');
    error.statusCode = 400;
    throw error;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  await requireWorkspaceRole(userId, project.workspaceId, requiredRoles);
  return project;
}

/**
 * Validates access to a collection and verifies that the user belongs to its workspace.
 */
async function collectionAccess(userId, collectionId, requiredRoles = null) {
  if (!collectionId) {
    const error = new Error('Collection ID is required');
    error.statusCode = 400;
    throw error;
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { project: true },
  });

  if (!collection) {
    const error = new Error('Collection not found');
    error.statusCode = 404;
    throw error;
  }

  await requireWorkspaceRole(userId, collection.project.workspaceId, requiredRoles);
  return collection;
}

const ROLE_DESCRIPTIONS = {
  OWNER: 'Full control, can manage members and settings',
  ADMIN: 'Can edit workspace settings and theme',
  DEVELOPER: 'Can create/update projects, requests, and collections',
  QA: 'Can run tests and view reports',
  VIEWER: 'Read-only access',
};

module.exports = {
  WRITE_ROLES,
  ADMIN_ROLES,
  ALL_ROLES,
  ROLE_DESCRIPTIONS,
  getWorkspaceMembership,
  hasWorkspaceAccess,
  hasWorkspaceRole,
  requireWorkspaceAccess,
  requireWorkspaceRole,
  projectAccess,
  collectionAccess,
  // Backwards compatibility alias
  membership: getWorkspaceMembership,
};
