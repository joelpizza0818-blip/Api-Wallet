const prisma = require('../config/database');
const { WRITE_ROLES, projectAccess, requireWorkspaceRole } = require('../services/authorization.service');
const { analyzeFiles, readGithubRepository } = require('../services/project-import.service');

async function importProject(req, res) {
  const { workspaceId } = req.params;
  await requireWorkspaceRole(req.user.id, workspaceId, WRITE_ROLES);
  const project = req.body.projectId
    ? await prisma.project.findFirst({ where: { id: req.body.projectId, workspaceId } })
    : await prisma.project.findFirst({ where: { workspaceId }, orderBy: { updatedAt: 'desc' } });
  if (!project) throw Object.assign(new Error('El workspace no tiene un proyecto activo.'), { statusCode: 400 });
  await projectAccess(req.user.id, project.id, WRITE_ROLES);

  const files = Array.isArray(req.body.files) ? req.body.files : req.body.githubUrl ? await readGithubRepository(req.body.githubUrl) : [];
  if (!files.length) throw Object.assign(new Error('Selecciona una carpeta o indica un repositorio GitHub.'), { statusCode: 400 });
  const analysis = analyzeFiles(files);
  let collection = null;
  for (const endpoint of analysis.endpoints) {
    if (!collection) collection = await prisma.collection.create({ data: { projectId: project.id, name: 'Detectadas desde proyecto', description: 'Endpoints encontrados en el código y configuración del proyecto' } });
    await prisma.apiRequest.create({ data: { collectionId: collection.id, name: endpoint.name, method: endpoint.method, path: endpoint.path, url: endpoint.url, description: endpoint.description, headers: endpoint.headers, params: endpoint.params, body: endpoint.body } });
  }
  res.status(201).json({ success: true, data: { ...analysis, collectionId: collection?.id || null, imported: analysis.endpoints.length } });
}

module.exports = { importProject };
