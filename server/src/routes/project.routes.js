const express = require('express');
const controller = require('../controllers/project.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.route('/workspace/:workspaceId').get(controller.listProjects).post(controller.createProject);
router.route('/:projectId').get(controller.getProject).patch(controller.updateProject).delete(controller.removeProject);
router.route('/:projectId/collections').get(controller.listCollections).post(controller.createCollection);
router.route('/collections/:collectionId').patch(controller.updateCollection).delete(controller.removeCollection);

module.exports = router;
