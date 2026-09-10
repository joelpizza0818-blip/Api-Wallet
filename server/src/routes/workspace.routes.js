const express = require('express');
const controller = require('../controllers/workspace.controller');
const themeController = require('../controllers/workspaceTheme.controller');
const themeValidator = require('../validators/workspaceTheme.validator');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.route('/').get(controller.listWorkspaces).post(controller.createWorkspace);
router.route('/:workspaceId').get(controller.getWorkspace).patch(controller.updateWorkspace).delete(controller.removeWorkspace);
router.get('/:workspaceId/theme', themeController.getTheme);
router.patch('/:workspaceId/theme', themeValidator.validate, themeController.updateTheme);

module.exports = router;
