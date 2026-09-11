const express = require('express');
const authRoutes = require('./auth.routes');
const resourceRoutes = require('./resource.routes');
const extendedRoutes = require('./extended.routes');
const workspaceRoutes = require('./workspace.routes');
const projectRoutes = require('./project.routes');
const requestRoutes = require('./request.routes');
const environmentRoutes = require('./environment.routes');
const secretRoutes = require('./secret.routes');
const aiRoutes = require('./ai.routes');

const router = express.Router();
router.use('/auth', authRoutes);
router.use('/', resourceRoutes);
router.use('/', extendedRoutes);
router.use('/v1/workspaces', workspaceRoutes);
router.use('/v1/projects', projectRoutes);
router.use('/v1/requests', requestRoutes);
router.use('/v1/environments', environmentRoutes);
router.use('/v1/secrets', secretRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
