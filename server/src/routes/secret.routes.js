const express = require('express');
const controller = require('../controllers/secret.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.route('/environment/:environmentId').get(controller.listSecrets).post(controller.createSecret);
router.delete('/:secretId', controller.removeSecret);

module.exports = router;
