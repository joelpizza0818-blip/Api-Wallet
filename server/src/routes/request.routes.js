const express = require('express');
const controller = require('../controllers/request.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.route('/collection/:collectionId').get(controller.listRequests).post(controller.createRequest);
router.route('/:requestId').patch(controller.updateRequest).delete(controller.removeRequest);

module.exports = router;
