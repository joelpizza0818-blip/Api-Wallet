const { requireWorkspaceRole, ADMIN_ROLES } = require('../services/authorization.service');
const themeService = require('../services/workspaceTheme.service');

async function getTheme(req, res) {
  const { workspaceId } = req.params;
  await requireWorkspaceRole(req.user.id, workspaceId); // any member can view
  const theme = await themeService.getTheme(workspaceId);
  if (!theme) return res.status(404).json({ error: 'Theme not found' });
  res.json(theme);
}

async function updateTheme(req, res) {
  const { workspaceId } = req.params;
  await requireWorkspaceRole(req.user.id, workspaceId, ADMIN_ROLES);
  const data = req.body; // validated elsewhere
  const updated = await themeService.updateTheme(workspaceId, data);
  res.json(updated);
}

module.exports = { getTheme, updateTheme };
