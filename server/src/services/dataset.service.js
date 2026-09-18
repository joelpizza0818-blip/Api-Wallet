const prisma = require('../config/database');

const MAX_ROWS = 10000;
const MAX_COLUMNS = 100;
const MAX_CELL_LENGTH = 100000;
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

function normalizeRows(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_ROWS) throw fail(`Dataset rows must be an array with at most ${MAX_ROWS} rows`);
  const normalized = rows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw fail('Each dataset row must be an object');
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key), value === null || value === undefined ? '' : String(value).slice(0, MAX_CELL_LENGTH)]));
  });
  const columns = [...new Set(normalized.flatMap((row) => Object.keys(row)))].slice(0, MAX_COLUMNS);
  if (normalized.some((row) => Object.keys(row).length > MAX_COLUMNS)) throw fail(`Datasets support at most ${MAX_COLUMNS} columns`);
  return { rows: normalized, columns };
}

async function listDatasets(projectId) {
  return prisma.dataset.findMany({ where: { projectId }, orderBy: { updatedAt: 'desc' } });
}

async function getDataset(datasetId) {
  const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
  if (!dataset) throw fail('Dataset not found', 404);
  return dataset;
}

async function createDataset(projectId, data = {}) {
  if (!data.name?.trim()) throw fail('Dataset name is required');
  const parsed = normalizeRows(data.rows || []);
  return prisma.dataset.create({ data: { projectId, name: data.name.trim(), description: data.description?.trim() || null, ...parsed } });
}

async function updateDataset(datasetId, data = {}) {
  const existing = await getDataset(datasetId);
  const parsed = data.rows !== undefined ? normalizeRows(data.rows) : { rows: existing.rows, columns: existing.columns };
  return prisma.dataset.update({ where: { id: datasetId }, data: { ...(data.name?.trim() && { name: data.name.trim() }), ...(data.description !== undefined && { description: data.description?.trim() || null }), ...parsed } });
}

async function deleteDataset(datasetId) {
  return prisma.dataset.delete({ where: { id: datasetId } });
}

module.exports = { listDatasets, getDataset, createDataset, updateDataset, deleteDataset, normalizeRows };