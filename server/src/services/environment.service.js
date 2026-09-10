const prisma = require('../config/database');

async function listByProject(projectId) { return prisma.environment.findMany({ where: { projectId }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }); }
async function findById(id) { return prisma.environment.findUnique({ where: { id }, include: { project: true } }); }
async function create(data) { return prisma.environment.create({ data }); }
async function update(id, data) { return prisma.environment.update({ where: { id }, data }); }
async function remove(id) { return prisma.environment.delete({ where: { id } }); }

module.exports = { listByProject, findById, create, update, remove };
