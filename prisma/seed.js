require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('../server/generated/prisma');
const bcrypt = require('../server/node_modules/bcryptjs');
const crypto = require('crypto');
const { encrypt } = require('../server/src/services/encryption.service');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const user = await prisma.user.upsert({ where: { email: 'alex@apiwallet.dev' }, update: {}, create: { name: 'Alex Dev', email: 'alex@apiwallet.dev', passwordHash } });
  const workspace = await prisma.workspace.upsert({ where: { slug: 'default-workspace' }, update: {}, create: { name: 'Default workspace', slug: 'default-workspace', description: 'Workspace principal de desarrollo y pruebas', ownerId: user.id, members: { create: { userId: user.id, role: 'OWNER' } } } });
  const project = await prisma.project.upsert({ where: { workspaceId_name: { workspaceId: workspace.id, name: 'Core API Gateway' } }, update: {}, create: { workspaceId: workspace.id, name: 'Core API Gateway', description: 'Servicios de autenticación y enrutamiento central' } });
  const environment = await prisma.environment.upsert({ where: { projectId_slug: { projectId: project.id, slug: 'production' } }, update: { baseUrl: 'https://api-vault.dev' }, create: { projectId: project.id, name: 'Producción', slug: 'production', baseUrl: 'https://api-vault.dev', isDefault: true } });
  const collection = await prisma.collection.upsert({ where: { projectId_name: { projectId: project.id, name: 'Auth' } }, update: {}, create: { projectId: project.id, name: 'Auth', description: 'Endpoints de autenticación y sesiones de usuario' } });
  const adminCollection = await prisma.collection.upsert({ where: { projectId_name: { projectId: project.id, name: 'Admin' } }, update: {}, create: { projectId: project.id, name: 'Admin', description: 'Operaciones administrativas' } });
  const paymentsCollection = await prisma.collection.upsert({ where: { projectId_name: { projectId: project.id, name: 'Payments' } }, update: {}, create: { projectId: project.id, name: 'Payments', description: 'Pagos y facturación' } });
  const login = await prisma.apiRequest.upsert({ where: { collectionId_name: { collectionId: collection.id, name: 'Login User' } }, update: {}, create: { collectionId: collection.id, name: 'Login User', method: 'POST', path: '/api/v1/auth/login', headers: [{ key: 'Content-Type', value: 'application/json' }], params: [], body: '{"email":"alex@apiwallet.dev","password":"ChangeMe123!"}', responseSample: '{"token":"..."}' } });
  const users = await prisma.apiRequest.upsert({ where: { collectionId_name: { collectionId: adminCollection.id, name: 'List Users' } }, update: {}, create: { collectionId: adminCollection.id, name: 'List Users', method: 'GET', path: '/api/v1/users', headers: [], params: [], responseSample: '[{"id":"usr_123","name":"Alex Dev"}]' } });
  const charge = await prisma.apiRequest.upsert({ where: { collectionId_name: { collectionId: paymentsCollection.id, name: 'Create Charge' } }, update: {}, create: { collectionId: paymentsCollection.id, name: 'Create Charge', method: 'POST', path: '/api/v1/charges', headers: [{ key: 'Content-Type', value: 'application/json' }], params: [], body: '{"amount":1999,"currency":"mxn"}', responseSample: '{"id":"ch_123","status":"succeeded"}' } });
  const staging = await prisma.environment.upsert({ where: { projectId_slug: { projectId: project.id, slug: 'staging-dev' } }, update: {}, create: { projectId: project.id, name: 'Staging / Dev', slug: 'staging-dev', baseUrl: 'https://staging.api-vault.dev' } });
  await prisma.secret.upsert({ where: { environmentId_name: { environmentId: staging.id, name: 'STRIPE_SECRET_KEY' } }, update: { encryptedValue: encrypt('sk_test_demo_only') }, create: { environmentId: staging.id, name: 'STRIPE_SECRET_KEY', encryptedValue: encrypt('sk_test_demo_only') } });
  const keySeed = async (name, prefix) => {
    const raw = `${prefix}_${crypto.createHash('sha256').update(name).digest('hex').slice(0, 48)}`;
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    return prisma.apiKey.upsert({
      where: { keyHash },
      update: { encryptedValue: encrypt(raw), encryptionKeyVersion: 1 },
      create: {
        projectId: project.id,
        name,
        prefix,
        keyHash,
        encryptedValue: encrypt(raw),
        encryptionKeyVersion: 1,
        lastFourCharacters: raw.slice(-4),
        scopes: ['read'],
        createdById: user.id,
      },
    });
  };
  await keySeed('Production integration', 'sk_live');
  await keySeed('Staging QA', 'sk_test');
  const flow = await prisma.flow.upsert({ where: { projectId_name: { projectId: project.id, name: 'Health check API' } }, update: {}, create: { projectId: project.id, name: 'Health check API', targetType: 'REQUEST', requestId: login.id, intervalMinutes: 15, notifyOnError: true } });
  await prisma.flow.upsert({ where: { projectId_name: { projectId: project.id, name: 'Payments collection monitor' } }, update: {}, create: { projectId: project.id, name: 'Payments collection monitor', targetType: 'COLLECTION', collectionId: paymentsCollection.id, intervalMinutes: 60, notifyOnError: true } });
  await prisma.requestExecution.create({ data: { requestId: login.id, flowId: flow.id, statusCode: 200, latencyMs: 142, responseBody: '{"ok":true}' } });
  await prisma.document.upsert({ where: { projectId_name: { projectId: project.id, name: 'Guía de integración' } }, update: {}, create: { projectId: project.id, name: 'Guía de integración', type: 'MARKDOWN', status: 'PUBLISHED', content: '# API Vault\n\nUsa el header `Authorization: Bearer <api-key>` para autenticar tus peticiones.' } });
  const mock = await prisma.mockServer.upsert({ where: { projectId_slug: { projectId: project.id, slug: 'payments-sandbox' } }, update: {}, create: { projectId: project.id, name: 'Payments Sandbox', slug: 'payments-sandbox' } });
  await prisma.mockRoute.upsert({ where: { mockServerId_method_path: { mockServerId: mock.id, method: 'POST', path: '/charges' } }, update: {}, create: { mockServerId: mock.id, requestId: charge.id, method: 'POST', path: '/charges', statusCode: 201, responseHeaders: [{ key: 'Content-Type', value: 'application/json' }], responseBody: '{"id":"ch_mock_123","status":"succeeded"}' } });
  console.log(`Seeded ${workspace.name}: ${project.name} / ${environment.name} with APIs, keys, environments, flows, docs and mocks`);
}
main().finally(() => prisma.$disconnect());
