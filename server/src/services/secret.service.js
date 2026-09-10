const prisma = require('../config/database');
const { encrypt } = require('./encryption.service');

async function listByEnvironment(environmentId) { return prisma.secret.findMany({ where: { environmentId }, select: { id: true, name: true, encryptionKeyVersion: true, createdAt: true, updatedAt: true } }); }
async function upsert(environmentId, name, value) { return prisma.secret.upsert({ where: { environmentId_name: { environmentId, name } }, update: { encryptedValue: encrypt(value) }, create: { environmentId, name, encryptedValue: encrypt(value) } }); }
async function remove(id) { return prisma.secret.delete({ where: { id } }); }

module.exports = { listByEnvironment, upsert, remove };
