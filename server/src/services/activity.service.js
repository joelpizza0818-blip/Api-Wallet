const prisma = require('../config/database');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

/**
 * Creates an activity log entry for a workspace.
 */
async function createActivity({ workspaceId, userId = null, type, entityType, entityId, metadata = {} }) {
  if (!workspaceId) throw fail('workspaceId is required for activity tracking');
  if (!type) throw fail('Activity type is required');
  if (!entityType || !entityId) throw fail('entityType and entityId are required');

  return prisma.activity.create({
    data: {
      workspaceId,
      userId,
      type,
      entityType,
      entityId,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    },
  });
}

/**
 * Returns recent activities for a workspace.
 */
async function getWorkspaceActivity(workspaceId, options = {}) {
  if (!workspaceId) throw fail('workspaceId is required');

  const take = Math.min(Number(options.take) || 50, 100);
  const skip = Number(options.skip) || 0;

  return prisma.activity.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });
}

module.exports = {
  createActivity,
  getWorkspaceActivity,
};
