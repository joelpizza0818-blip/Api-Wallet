const crypto = require('crypto');
const prisma = require('../config/database');
const { WRITE_ROLES, ADMIN_ROLES, requireWorkspaceRole, projectAccess } = require('../services/authorization.service');
const { sendWorkspaceInvitation } = require('../services/email.service');
const flowService = require('../services/flow.service');
const { createActivity } = require('../services/activity.service');
const datasetService = require('../services/dataset.service');
const { executeRequest } = require('../services/requestRunner.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const respond = (res, data, status = 200) => res.status(status).json({ success: true, data });

// =================== INVITATIONS ===================
async function listInvitations(req, res) {
  await requireWorkspaceRole(req.user.id, req.params.workspaceId, ADMIN_ROLES);
  respond(
    res,
    await prisma.workspaceInvitation.findMany({
      where: { workspaceId: req.params.workspaceId, acceptedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { name: true, email: true } },
      },
    })
  );
}

async function listMyInvitations(req, res) {
  respond(
    res,
    await prisma.workspaceInvitation.findMany({
      where: {
        email: req.user.email.toLowerCase(),
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        workspace: { select: { id: true, name: true, description: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  );
}

async function invite(req, res) {
  await requireWorkspaceRole(req.user.id, req.params.workspaceId, ADMIN_ROLES);
  const targetWorkspace = await prisma.workspace.findUnique({ where: { id: req.params.workspaceId }, select: { visibility: true } });
  if (targetWorkspace?.visibility === 'PERSONAL') throw fail('Este workspace es personal y no acepta invitaciones', 403);
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw fail('A valid email is required');
  if (!['ADMIN', 'DEVELOPER', 'QA', 'VIEWER'].includes(req.body.role)) throw fail('Invalid invitation role');

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const invitation = await prisma.workspaceInvitation.upsert({
    where: { workspaceId_email: { workspaceId: req.params.workspaceId, email } },
    update: {
      role: req.body.role,
      invitedById: req.user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      acceptedAt: null,
      acceptedById: null,
    },
    create: {
      workspaceId: req.params.workspaceId,
      email,
      role: req.body.role,
      invitedById: req.user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: req.params.workspaceId },
    select: { name: true },
  });

  const delivery = await sendWorkspaceInvitation({
    email,
    workspaceName: workspace.name,
    role: invitation.role,
    token: rawToken,
  });

  await createActivity({
    workspaceId: req.params.workspaceId,
    userId: req.user.id,
    type: 'MEMBER_INVITED',
    entityType: 'invitation',
    entityId: invitation.id,
    metadata: { email, role: invitation.role },
  }).catch(() => {});

  respond(
    res,
    {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      delivery: { delivered: delivery.delivered },
    },
    201
  );
}

async function updateMemberRole(req, res) {
  await requireWorkspaceRole(req.user.id, req.params.workspaceId, ADMIN_ROLES);
  if (!['ADMIN', 'DEVELOPER', 'QA', 'VIEWER'].includes(req.body.role)) throw fail('Invalid member role');
  respond(res, await prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.params.userId } }, data: { role: req.body.role } }));
}

async function cancelInvitation(req, res) {
  const item = await prisma.workspaceInvitation.findUnique({ where: { id: req.params.invitationId } });
  if (!item) throw fail('Invitation not found', 404);

  await requireWorkspaceRole(req.user.id, item.workspaceId, ADMIN_ROLES);
  await prisma.workspaceInvitation.delete({ where: { id: item.id } });
  res.status(204).end();
}

async function acceptInvitation(req, res) {
  const tokenHash = crypto.createHash('sha256').update(req.body.token || '').digest('hex');
  const invitation = await prisma.workspaceInvitation.findUnique({ where: { tokenHash } });
  return acceptInvitationRecord(req, res, invitation);
}

async function acceptInvitationById(req, res) {
  const invitation = await prisma.workspaceInvitation.findUnique({ where: { id: req.params.invitationId } });
  return acceptInvitationRecord(req, res, invitation);
}

async function acceptInvitationRecord(req, res, invitation) {
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    throw fail('Invitation is invalid or expired', 400);
  }
  if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
    throw fail('Invitation belongs to another email', 403);
  }

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: req.user.id,
        },
      },
      update: { role: invitation.role, status: 'ACTIVE' },
      create: { workspaceId: invitation.workspaceId, userId: req.user.id, role: invitation.role },
    }),
    prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedById: req.user.id },
    }),
  ]);

  respond(res, { workspaceId: invitation.workspaceId });
}

async function joinWorkspaceByCode(req, res) {
  const code = req.body.code?.trim();
  if (!code) throw fail('Workspace code is required');

  const workspace = await prisma.workspace.findUnique({ where: { inviteCode: code } });
  if (!workspace) throw fail('Workspace code is invalid', 404);
  if (workspace.visibility === 'PERSONAL') throw fail('Este workspace es personal y no acepta invitaciones', 403);

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: req.user.id,
      },
    },
    update: { status: 'ACTIVE' },
    create: { workspaceId: workspace.id, userId: req.user.id, role: 'DEVELOPER' },
  });

  respond(res, { workspaceId: workspace.id, workspaceName: workspace.name });
}

// =================== FLOWS ===================
async function listFlows(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  respond(
    res,
    await prisma.flow.findMany({
      where: { projectId: req.params.projectId },
      include: {
        collection: { select: { id: true, name: true } },
        request: { select: { id: true, name: true, method: true, path: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  );
}

async function createFlow(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  const flow = await flowService.createFlow(project.id, req.body);
  await createActivity({
    workspaceId: project.workspaceId,
    userId: req.user.id,
    type: 'FLOW_RUN',
    entityType: 'flow',
    entityId: flow.id,
    metadata: { name: flow.name },
  }).catch(() => {});
  respond(res, flow, 201);
}

async function updateFlow(req, res) {
  const flow = await prisma.flow.findUnique({
    where: { id: req.params.flowId },
    include: { project: true },
  });
  if (!flow) throw fail('Flow not found', 404);

  await requireWorkspaceRole(req.user.id, flow.project.workspaceId, WRITE_ROLES);
  respond(res, await flowService.updateFlow(flow.id, req.body));
}

async function removeFlow(req, res) {
  const flow = await prisma.flow.findUnique({
    where: { id: req.params.flowId },
    include: { project: true },
  });
  if (!flow) throw fail('Flow not found', 404);

  await requireWorkspaceRole(req.user.id, flow.project.workspaceId, WRITE_ROLES);
  await flowService.deleteFlow(flow.id);
  res.status(204).end();
}

async function runFlowNow(req, res) {
  const flow = await prisma.flow.findUnique({
    where: { id: req.params.flowId },
    include: { project: true },
  });
  if (!flow) throw fail('Flow not found', 404);

  await requireWorkspaceRole(req.user.id, flow.project.workspaceId, WRITE_ROLES);
  respond(res, await flowService.runFlow(flow.id));
}

async function listExecutions(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  respond(
    res,
    await prisma.requestExecution.findMany({
      where: { request: { collection: { projectId: req.params.projectId } } },
      include: {
        request: { select: { name: true, method: true, path: true } },
        flow: { select: { name: true } },
      },
      orderBy: { executedAt: 'desc' },
      take: 100,
    })
  );
}

// =================== DOCUMENTS ===================
async function listDocuments(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  respond(
    res,
    await prisma.document.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { updatedAt: 'desc' },
    })
  );
}

async function createDocument(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  if (!req.body.name?.trim() || typeof req.body.content !== 'string') {
    throw fail('Document name and content are required');
  }

  respond(
    res,
    await prisma.document.create({
      data: {
        projectId: project.id,
        name: req.body.name.trim(),
        content: req.body.content,
        type: req.body.type || 'MARKDOWN',
        status: req.body.status || 'DRAFT',
      },
    }),
    201
  );
}

async function updateDocument(req, res) {
  const item = await prisma.document.findUnique({
    where: { id: req.params.documentId },
    include: { project: true },
  });
  if (!item) throw fail('Document not found', 404);

  await requireWorkspaceRole(req.user.id, item.project.workspaceId, WRITE_ROLES);
  respond(
    res,
    await prisma.document.update({
      where: { id: item.id },
      data: {
        ...(req.body.name && { name: req.body.name.trim() }),
        ...(typeof req.body.content === 'string' && { content: req.body.content }),
        ...(req.body.status && { status: req.body.status }),
      },
    })
  );
}

async function deleteDocument(req, res) {
  const item = await prisma.document.findUnique({
    where: { id: req.params.documentId },
    include: { project: true },
  });
  if (!item) throw fail('Document not found', 404);

  await requireWorkspaceRole(req.user.id, item.project.workspaceId, WRITE_ROLES);
  await prisma.document.delete({ where: { id: item.id } });
  res.status(204).end();
}

// =================== MOCKS ===================
async function listMocks(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  respond(
    res,
    await prisma.mockServer.findMany({
      where: { projectId: req.params.projectId },
      include: { routes: true },
    })
  );
}

async function createMock(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  if (!req.body.name?.trim() || !req.body.slug?.trim()) {
    throw fail('Mock name and slug are required');
  }

  respond(
    res,
    await prisma.mockServer.create({
      data: {
        projectId: project.id,
        name: req.body.name.trim(),
        slug: req.body.slug.trim().toLowerCase(),
        port: Number.isInteger(req.body.port) ? req.body.port : null,
      },
    }),
    201
  );
}

async function addMockRoute(req, res) {
  const mock = await prisma.mockServer.findUnique({
    where: { id: req.params.mockId },
    include: { project: true },
  });
  if (!mock) throw fail('Mock server not found', 404);

  await requireWorkspaceRole(req.user.id, mock.project.workspaceId, WRITE_ROLES);
  const method = (req.body.method || 'GET').toUpperCase();
  const routePath = req.body.path?.trim();
  const statusCode = Number(req.body.statusCode || 200);
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method) || !routePath?.startsWith('/') || !Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    throw fail('Invalid mock route');
  }

  respond(
    res,
    await prisma.mockRoute.create({
      data: {
        mockServerId: mock.id,
        requestId: req.body.requestId || null,
        method,
        path: routePath === '/' ? '/' : `/${routePath.replace(/^\/+|\/+$/g, '')}`,
        statusCode,
        responseHeaders: Array.isArray(req.body.responseHeaders) ? req.body.responseHeaders : [],
        responseBody: req.body.responseBody || null,
      },
    }),
    201
  );
}

async function updateMock(req, res) {
  const item = await prisma.mockServer.findUnique({
    where: { id: req.params.mockId },
    include: { project: true },
  });
  if (!item) throw fail('Mock server not found', 404);

  await requireWorkspaceRole(req.user.id, item.project.workspaceId, WRITE_ROLES);
  respond(
    res,
    await prisma.mockServer.update({
      where: { id: item.id },
      data: {
        ...(req.body.name && { name: req.body.name.trim() }),
        ...(req.body.status && { status: req.body.status }),
      },
    })
  );
}

async function deleteMock(req, res) {
  const item = await prisma.mockServer.findUnique({
    where: { id: req.params.mockId },
    include: { project: true },
  });
  if (!item) throw fail('Mock server not found', 404);

  await requireWorkspaceRole(req.user.id, item.project.workspaceId, WRITE_ROLES);
  await prisma.mockServer.delete({ where: { id: item.id } });
  res.status(204).end();
}

async function deleteMockRoute(req, res) {
  const item = await prisma.mockRoute.findUnique({
    where: { id: req.params.mockRouteId },
    include: { mockServer: { include: { project: true } } },
  });
  if (!item) throw fail('Mock route not found', 404);

  await requireWorkspaceRole(req.user.id, item.mockServer.project.workspaceId, WRITE_ROLES);
  await prisma.mockRoute.delete({ where: { id: item.id } });
  res.status(204).end();
}


async function leaveWorkspace(req, res) {
  const { workspaceId } = req.params;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });
  if (!membership) throw fail('No eres miembro de este workspace', 404);
  if (membership.role === 'OWNER') {
    throw fail('El propietario no puede abandonar el workspace. Debes transferir la propiedad o eliminar el workspace.', 400);
  }
  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });
  respond(res, { message: 'Has abandonado el workspace correctamente' });
}

async function removeMember(req, res) {
  const { workspaceId, userId } = req.params;
  if (userId === req.user.id) {
    return leaveWorkspace(req, res);
  }
  await requireWorkspaceRole(req.user.id, workspaceId, ADMIN_ROLES);
  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!target) throw fail('Miembro no encontrado', 404);
  if (target.role === 'OWNER') throw fail('No se puede expulsar al propietario', 400);
  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  respond(res, { message: 'Miembro eliminado correctamente' });
}

// =================== DATASETS ===================
async function listDatasets(req, res) {
  await projectAccess(req.user.id, req.params.projectId);
  respond(res, await datasetService.listDatasets(req.params.projectId));
}

async function createDataset(req, res) {
  const project = await projectAccess(req.user.id, req.params.projectId, WRITE_ROLES);
  respond(res, await datasetService.createDataset(project.id, req.body), 201);
}

async function updateDataset(req, res) {
  const dataset = await datasetService.getDataset(req.params.datasetId);
  await projectAccess(req.user.id, dataset.projectId, WRITE_ROLES);
  respond(res, await datasetService.updateDataset(dataset.id, req.body));
}

async function deleteDataset(req, res) {
  const dataset = await datasetService.getDataset(req.params.datasetId);
  await projectAccess(req.user.id, dataset.projectId, WRITE_ROLES);
  await datasetService.deleteDataset(dataset.id);
  res.status(204).end();
}

async function runDataset(req, res) {
  const dataset = await datasetService.getDataset(req.params.datasetId);
  await projectAccess(req.user.id, dataset.projectId, WRITE_ROLES);
  if (!req.body?.requestId) throw fail('requestId is required');

  const request = await prisma.apiRequest.findUnique({
    where: { id: req.body.requestId },
    include: { collection: true },
  });
  if (!request || request.collection.projectId !== dataset.projectId) throw fail('Request does not belong to the dataset project', 404);

  const rows = Array.isArray(dataset.rows) ? dataset.rows : [];
  const requestedLimit = Number(req.body.limit);
  const runLimit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 1000) : Math.min(rows.length, 1000);
  const results = [];
  for (let index = 0; index < runLimit; index += 1) {
    const result = await executeRequest(request.id, {
      environmentId: req.body.environmentId || null,
      apiKeyId: req.body.apiKeyId || null,
      variables: rows[index],
    });
    results.push({ row: index + 1, ...result });
  }
  respond(res, { datasetId: dataset.id, requestId: request.id, total: results.length, available: rows.length, truncated: runLimit < rows.length, results });
}

module.exports = {
  leaveWorkspace,
  removeMember,
  listInvitations,
  listMyInvitations,
  updateMemberRole,
  invite,
  cancelInvitation,
  acceptInvitation,
  acceptInvitationById,
  joinWorkspaceByCode,
  listFlows,
  createFlow,
  updateFlow,
  removeFlow,
  runFlowNow,
  listExecutions,
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  listMocks,
  createMock,
  addMockRoute,
  updateMock,
  deleteMock,
  deleteMockRoute,
  listDatasets,
  createDataset,
  updateDataset,
  deleteDataset,
  runDataset,
};
