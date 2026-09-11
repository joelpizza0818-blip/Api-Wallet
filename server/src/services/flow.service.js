const prisma = require('../config/database');
const { executeRequest } = require('./requestRunner.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

/**
 * Validates that Flow target constraints are strictly fulfilled.
 * COLLECTION -> collectionId provided, requestId null, collection belongs to projectId.
 * REQUEST -> requestId provided, collectionId null, request belongs to projectId.
 */
async function validateFlowTarget(targetType, collectionId, requestId, projectId) {
  if (!['COLLECTION', 'REQUEST'].includes(targetType)) {
    throw fail('Invalid flow targetType. Must be COLLECTION or REQUEST');
  }

  if (targetType === 'COLLECTION') {
    if (!collectionId) throw fail('collectionId is required for COLLECTION flow target');
    if (requestId) throw fail('requestId must be null for COLLECTION flow target');

    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, projectId },
    });
    if (!collection) throw fail('Target collection does not belong to this project', 404);
    return { collectionId, requestId: null };
  }

  if (targetType === 'REQUEST') {
    if (!requestId) throw fail('requestId is required for REQUEST flow target');
    if (collectionId) throw fail('collectionId must be null for REQUEST flow target');

    const request = await prisma.apiRequest.findFirst({
      where: {
        id: requestId,
        collection: { projectId },
      },
    });
    if (!request) throw fail('Target request does not belong to this project', 404);
    return { collectionId: null, requestId };
  }
}

/**
 * Creates a new flow with verified target integrity.
 */
async function createFlow(projectId, data = {}) {
  if (!projectId) throw fail('projectId is required');
  if (!data.name || !data.name.trim()) throw fail('Flow name is required');
  if (!Number.isInteger(data.intervalMinutes) || data.intervalMinutes < 1) {
    throw fail('intervalMinutes must be a positive integer');
  }

  const validatedTarget = await validateFlowTarget(
    data.targetType,
    data.collectionId || null,
    data.requestId || null,
    projectId
  );

  const requestedName = data.name.trim();
  let name = requestedName;
  let suffix = 2;
  while (await prisma.flow.findFirst({ where: { projectId, name }, select: { id: true } })) {
    name = `${requestedName} (${suffix++})`;
  }

  return prisma.flow.create({
    data: {
      projectId,
      name,
      targetType: data.targetType,
      collectionId: validatedTarget.collectionId,
      requestId: validatedTarget.requestId,
      intervalMinutes: data.intervalMinutes,
      notifyOnError: data.notifyOnError !== false,
      status: 'ACTIVE',
    },
    include: {
      collection: { select: { id: true, name: true } },
      request: { select: { id: true, name: true, method: true, path: true } },
    },
  });
}

/**
 * Updates an existing flow.
 */
async function updateFlow(flowId, data = {}) {
  if (!flowId) throw fail('flowId is required');

  const flow = await prisma.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw fail('Flow not found', 404);

  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.intervalMinutes && Number.isInteger(data.intervalMinutes) && data.intervalMinutes > 0) {
    updateData.intervalMinutes = data.intervalMinutes;
  }
  if (data.status && ['ACTIVE', 'PAUSED'].includes(data.status)) {
    updateData.status = data.status;
  }
  if (typeof data.notifyOnError === 'boolean') {
    updateData.notifyOnError = data.notifyOnError;
  }

  if (data.targetType || data.collectionId !== undefined || data.requestId !== undefined) {
    const targetType = data.targetType || flow.targetType;
    const collectionId = data.collectionId !== undefined ? data.collectionId : flow.collectionId;
    const requestId = data.requestId !== undefined ? data.requestId : flow.requestId;

    const validated = await validateFlowTarget(targetType, collectionId, requestId, flow.projectId);
    updateData.targetType = targetType;
    updateData.collectionId = validated.collectionId;
    updateData.requestId = validated.requestId;
  }

  return prisma.flow.update({
    where: { id: flowId },
    data: updateData,
    include: {
      collection: { select: { id: true, name: true } },
      request: { select: { id: true, name: true, method: true, path: true } },
    },
  });
}

/**
 * Pauses a flow.
 */
async function pauseFlow(flowId) {
  return updateFlow(flowId, { status: 'PAUSED' });
}

/**
 * Resumes a flow.
 */
async function resumeFlow(flowId) {
  return updateFlow(flowId, { status: 'ACTIVE' });
}

/**
 * Deletes a flow by ID.
 */
async function deleteFlow(flowId) {
  if (!flowId) throw fail('flowId is required');
  return prisma.flow.delete({ where: { id: flowId } });
}

/**
 * Executes a flow and its target requests immediately.
 */
async function runFlow(flowId) {
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: {
      project: {
        include: {
          environments: { where: { isDefault: true }, take: 1 },
        },
      },
      collection: {
        include: { requests: true },
      },
      request: true,
    },
  });

  if (!flow || flow.status !== 'ACTIVE') return null;

  const defaultEnv = flow.project.environments[0] || null;
  const requests = flow.targetType === 'REQUEST'
    ? [flow.request]
    : flow.collection?.requests || [];

  const results = [];
  for (const req of requests.filter(Boolean)) {
    const result = await executeRequest(req.id, {
      environmentId: defaultEnv?.id || null,
      flowId: flow.id,
    });
    results.push(result);
  }

  const lastResult = results.at(-1) || {};
  const now = new Date();

  await prisma.flow.update({
    where: { id: flow.id },
    data: {
      lastRunAt: now,
      lastStatusCode: lastResult.statusCode || null,
      lastLatencyMs: lastResult.latencyMs || null,
      runsCount: { increment: results.length },
    },
  });

  return results;
}

/**
 * Runs due scheduled flows periodically.
 */
async function runDueFlows() {
  const flows = await prisma.flow.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, intervalMinutes: true, lastRunAt: true },
  });

  const now = Date.now();
  await Promise.all(
    flows
      .filter((flow) => !flow.lastRunAt || now - flow.lastRunAt.getTime() >= flow.intervalMinutes * 60000)
      .map(async (flow) => {
        try {
          await runFlow(flow.id);
        } catch (err) {
          console.error(`Flow ${flow.id} execution failed: ${err.message}`);
        }
      })
  );
}

function startScheduler() {
  const timer = setInterval(() => void runDueFlows(), 15000);
  timer.unref();
  void runDueFlows();
  return () => clearInterval(timer);
}

module.exports = {
  createFlow,
  updateFlow,
  deleteFlow,
  pauseFlow,
  resumeFlow,
  validateFlowTarget,
  runFlow,
  startScheduler,
};
