const dns = require('dns').promises;
const net = require('net');
const prisma = require('../config/database');

function isPrivateIp(address) {
  if (net.isIP(address) === 4) return /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(address);
  return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:');
}
function isDevelopmentLoopback(url) {
  if (process.env.NODE_ENV === 'production') return false;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1';
}
async function safeUrl(baseUrl, path) {
  const url = new URL(path, baseUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) destinations are allowed');
  const records = await dns.lookup(url.hostname, { all: true });
  const isLoopback = isDevelopmentLoopback(url);
  if (!records.length || (!isLoopback && records.some((record) => isPrivateIp(record.address)))) throw new Error('Private network destinations are blocked');
  return url;
}
async function executeRequest(request, baseUrl, flowId = null) {
  const started = Date.now(); let statusCode; let responseBody; let errorMessage;
  try {
    const url = await safeUrl(baseUrl, request.path);
    const headers = Object.fromEntries((request.headers || []).filter((item) => item.key).map((item) => [item.key, item.value || '']));
    const response = await fetch(url, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body || undefined, signal: AbortSignal.timeout(15000), redirect: 'error' });
    statusCode = response.status; responseBody = (await response.text()).slice(0, 10000);
  } catch (error) { errorMessage = error.message; }
  const latencyMs = Date.now() - started;
  await prisma.requestExecution.create({ data: { requestId: request.id, flowId, statusCode, latencyMs, responseBody, errorMessage } });
  await prisma.apiRequest.update({ where: { id: request.id }, data: { lastStatusCode: statusCode || null } });
  return { statusCode, latencyMs, responseBody, errorMessage };
}
async function runFlow(flowId) {
  const flow = await prisma.flow.findUnique({ where: { id: flowId }, include: { project: { include: { environments: { where: { isDefault: true }, take: 1 } } }, collection: { include: { requests: true } }, request: true } });
  if (!flow || flow.status !== 'ACTIVE') return null;
  const baseUrl = flow.project.environments[0]?.baseUrl;
  if (!baseUrl) throw new Error('The default environment needs a base URL');
  const requests = flow.targetType === 'REQUEST' ? [flow.request] : flow.collection?.requests || [];
  const results = await Promise.all(requests.filter(Boolean).map((request) => executeRequest(request, baseUrl, flow.id)));
  const last = results.at(-1) || {}; const now = new Date();
  await prisma.flow.update({ where: { id: flow.id }, data: { lastRunAt: now, lastStatusCode: last.statusCode || null, lastLatencyMs: last.latencyMs || null, runsCount: { increment: results.length } } });
  return results;
}
async function runDueFlows() {
  const flows = await prisma.flow.findMany({ where: { status: 'ACTIVE' }, select: { id: true, intervalMinutes: true, lastRunAt: true } });
  const now = Date.now();
  await Promise.all(flows.filter((flow) => !flow.lastRunAt || now - flow.lastRunAt.getTime() >= flow.intervalMinutes * 60000).map(async (flow) => { try { await runFlow(flow.id); } catch (error) { console.error(`Flow ${flow.id} failed: ${error.message}`); } }));
}
function startScheduler() { const timer = setInterval(() => void runDueFlows(), 15000); timer.unref(); void runDueFlows(); return () => clearInterval(timer); }
module.exports = { runFlow, startScheduler };
