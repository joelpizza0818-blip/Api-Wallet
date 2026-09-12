const logger = require('../utils/logger');

function errorHandler(error, req, res, _next) {
	const status = error.statusCode || (error.code === 'P2002' ? 409 : 500);
	const message = error.code === 'P2002' ? 'Ya existe un recurso con ese nombre. Se generará un nombre alternativo al reintentar.' : error.message;
	logger.error('request.failed', { requestId: req.requestId, status, method: req.method, path: req.path, error: error.message });
	return res.status(status).json({
		success: false,
		message: status >= 500 ? 'Internal server error' : message,
		...(error.details ? { details: error.details } : {}),
		requestId: req.requestId,
	});
}

module.exports = { errorHandler };
