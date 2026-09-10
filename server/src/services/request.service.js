const prisma = require('../config/database');

async function listByCollection(collectionId) { return prisma.apiRequest.findMany({ where: { collectionId }, orderBy: { updatedAt: 'desc' } }); }
async function findById(id) { return prisma.apiRequest.findUnique({ where: { id } }); }
async function create(collectionId, data) { return prisma.apiRequest.create({ data: { collectionId, ...data } }); }
async function update(id, data) { return prisma.apiRequest.update({ where: { id }, data }); }
async function remove(id) { return prisma.apiRequest.delete({ where: { id } }); }

module.exports = { listByCollection, findById, create, update, remove };
