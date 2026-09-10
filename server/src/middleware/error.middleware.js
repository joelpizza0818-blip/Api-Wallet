function errorHandler(error, _req, res, _next) {
	const status = error.statusCode || (error.code === 'P2002' ? 409 : 500);
	const message = error.code === 'P2002' ? 'Ya existe un recurso con ese nombre. Se generará un nombre alternativo al reintentar.' : error.message;
	if (status >= 500) console.error(error);
	return res.status(status).json({
		success: false,
		message: status >= 500 ? 'Internal server error' : message,
		...(error.details ? { details: error.details } : {}),
	});
}

module.exports = { errorHandler };
