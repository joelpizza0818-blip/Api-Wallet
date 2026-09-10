const express = require('express');
const controller = require('../controllers/environment.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.route('/project/:projectId').get(controller.listEnvironments).post(controller.createEnvironment);

module.exports = router;
