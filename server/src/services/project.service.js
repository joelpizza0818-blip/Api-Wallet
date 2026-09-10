const prisma = require('../config/database');

async function listByWorkspace(workspaceId) { return prisma.project.findMany({ where: { workspaceId }, include: { _count: { select: { collections: true, apiKeys: true } } }, orderBy: { updatedAt: 'desc' } }); }
async function findById(id) { return prisma.project.findUnique({ where: { id }, include: { collections: { include: { requests: true }, orderBy: { sortOrder: 'asc' } }, environments: true } }); }
async function create(data) { return prisma.project.create({ data }); }
async function update(id, data) { return prisma.project.update({ where: { id }, data }); }
async function remove(id) { return prisma.project.delete({ where: { id } }); }

module.exports = { listByWorkspace, findById, create, update, remove };
