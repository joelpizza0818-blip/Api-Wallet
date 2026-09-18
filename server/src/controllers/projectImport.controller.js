const prisma = require('../config/database');
const { WRITE_ROLES, projectAccess, requireWorkspaceRole } = require('../services/authorization.service');
const { analyzeFiles, readGithubRepository, joinBaseUrl } = require('../services/project-import.service');
const { reviewImport } = require('../services/project-import-review.service');

async function importProject(req, res) {
  const { workspaceId } = req.params;
  await requireWorkspaceRole(req.user.id, workspaceId, WRITE_ROLES);

  let project = req.body.projectId
    ? await prisma.project.findFirst({ where: { id: req.body.projectId, workspaceId } })
    : await prisma.project.findFirst({ where: { workspaceId }, orderBy: { updatedAt: 'desc' } });

  if (!project) {
    project = await prisma.project.create({
      data: {
        workspaceId,
        name: 'Proyecto Principal',
        description: 'Proyecto creado automáticamente para importar APIs',
      },
    });
  }

  await projectAccess(req.user.id, project.id, WRITE_ROLES);

  const files = Array.isArray(req.body.files)
    ? req.body.files
    : req.body.githubUrl
      ? await readGithubRepository(req.body.githubUrl)
      : [];

  if (!files.length) {
    throw Object.assign(new Error('Selecciona una carpeta con código o indica la URL de un repositorio GitHub público.'), { statusCode: 400 });
  }

  const analysis = analyzeFiles(files);
  const aiReview = await reviewImport(files, analysis);

  if (!analysis.endpoints.length) {
    return res.status(200).json({
      success: true,
      data: {
        ...analysis,
        aiReview,
        collectionId: null,
        imported: 0,
        message: 'Se analizaron los archivos pero no se detectaron endpoints de rutas o clientes HTTP.',
      },
    });
  }

  // Group endpoints by their respective folder/module collection name
  const grouped = {};
  for (const ep of analysis.endpoints) {
    const colName = ep.folderName || 'General';
    if (!grouped[colName]) grouped[colName] = [];
    grouped[colName].push(ep);
  }

  let totalImported = 0;
  const createdCollections = [];

  for (const [colName, endpoints] of Object.entries(grouped)) {
    let collection = await prisma.collection.findFirst({
      where: { projectId: project.id, name: colName },
    });

    if (!collection) {
      collection = await prisma.collection.create({
        data: {
          projectId: project.id,
          name: colName,
          description: `Colección importada para el módulo/carpeta ${colName}`,
        },
      });
    }

    createdCollections.push({ id: collection.id, name: collection.name, count: endpoints.length });

    const existingRequests = await prisma.apiRequest.findMany({
      where: { collectionId: collection.id },
      select: { method: true, path: true },
    });
    const existingSet = new Set(existingRequests.map((r) => `${r.method}:${r.path}`));

    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      if (!existingSet.has(key)) {
        await prisma.apiRequest.create({
          data: {
            collectionId: collection.id,
            name: endpoint.name,
            method: endpoint.method,
            path: endpoint.path,
            url: endpoint.url,
            description: endpoint.description,
            headers: endpoint.headers || [],
            params: endpoint.params || [],
            body: endpoint.body || '',
          },
        });
        existingSet.add(key);
        totalImported++;
      }
    }
  }

  res.status(201).json({
    success: true,
    data: {
      ...analysis,
      aiReview,
      collections: createdCollections,
      imported: totalImported,
      totalEndpointsDetected: analysis.endpoints.length,
    },
  });
}


async function applyBaseUrl(req, res) {
  const { workspaceId } = req.params;
  await requireWorkspaceRole(req.user.id, workspaceId, WRITE_ROLES);

  const { collectionIds, baseUrl } = req.body;
  if (!Array.isArray(collectionIds) || !collectionIds.length) {
    throw Object.assign(new Error('collectionIds is required'), { statusCode: 400 });
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw Object.assign(new Error('baseUrl is required'), { statusCode: 400 });
  }

  // Normalise: strip trailing slash
  const base = baseUrl.trim().replace(/\/+$/, '');

  // Update every request in those collections
  const requests = await prisma.apiRequest.findMany({
    where: { collectionId: { in: collectionIds } },
    select: { id: true, url: true, path: true },
  });

  let updated = 0;
  for (const r of requests) {
    let currentUrl = (r.url || r.path || '').trim();
    let cleanSubPath = currentUrl;

    if (cleanSubPath.includes('{{baseUrl}}')) {
      cleanSubPath = cleanSubPath.replace(/\{\{baseUrl\}\}\/?/gi, '');
    } else if (/^https?:\/\//i.test(cleanSubPath)) {
      try {
        const u = new URL(cleanSubPath);
        cleanSubPath = u.pathname + u.search;
      } catch {
        cleanSubPath = cleanSubPath.replace(/^https?:\/\/[^/]+/i, '');
      }
    }

    if (!cleanSubPath.startsWith('/')) {
      cleanSubPath = '/' + cleanSubPath;
    }

    let newUrl = joinBaseUrl(base, cleanSubPath);
    newUrl = newUrl.replace(/([^:])\/{2,}/g, '$1/');

    await prisma.apiRequest.update({
      where: { id: r.id },
      data: { url: newUrl },
    });
    updated++;
  }

  res.status(200).json({ success: true, data: { updated } });
}

module.exports = { importProject, applyBaseUrl };

