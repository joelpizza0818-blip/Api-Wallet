const prisma = require('../config/database');

const WRITE_ROLES = new Set(['OWNER', 'ADMIN', 'DEVELOPER']);
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN']);

async function membership(userId, workspaceId) {
  return prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
}

async function requireWorkspaceRole(userId, workspaceId, roles = null) {
  const member = await membership(userId, workspaceId);
  if (!member || member.status !== 'ACTIVE' || (roles && !roles.has(member.role))) {
    const error = new Error('Forbidden'); error.statusCode = 403; throw error;
  }
  return member;
}

async function projectAccess(userId, projectId, roles = null) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) { const error = new Error('Project not found'); error.statusCode = 404; throw error; }
  await requireWorkspaceRole(userId, project.workspaceId, roles);
  return project;
}

async function collectionAccess(userId, collectionId, roles = null) {
  const collection = await prisma.collection.findUnique({ where: { id: collectionId }, include: { project: true } });
  if (!collection) { const error = new Error('Collection not found'); error.statusCode = 404; throw error; }
  await requireWorkspaceRole(userId, collection.project.workspaceId, roles);
  return collection;
}

module.exports = { WRITE_ROLES, ADMIN_ROLES, requireWorkspaceRole, projectAccess, collectionAccess };
