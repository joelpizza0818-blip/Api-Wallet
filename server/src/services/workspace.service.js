const prisma = require('../config/database');

async function listForUser(userId) {
	return prisma.workspace.findMany({ where: { members: { some: { userId, status: 'ACTIVE' } } }, orderBy: { updatedAt: 'desc' } });
}

async function findById(id) { return prisma.workspace.findUnique({ where: { id }, include: { projects: true, members: true } }); }
async function create(data) { return prisma.workspace.create({ data }); }
async function update(id, data) { return prisma.workspace.update({ where: { id }, data }); }
async function remove(id) { return prisma.workspace.delete({ where: { id } }); }

module.exports = { listForUser, findById, create, update, remove };
