const express = require('express');
const controller = require('../controllers/workspace.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.route('/').get(controller.listWorkspaces).post(controller.createWorkspace);
router.route('/:workspaceId').get(controller.getWorkspace).patch(controller.updateWorkspace).delete(controller.removeWorkspace);

module.exports = router;
