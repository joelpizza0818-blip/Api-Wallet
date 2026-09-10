class AppError extends Error {
	constructor(message, statusCode = 400, details = undefined) {
		super(message);
		this.name = 'AppError';
		this.statusCode = statusCode;
		this.details = details;
	}
}

const notFound = (message = 'Resource not found') => new AppError(message, 404);
const unauthorized = (message = 'Unauthorized') => new AppError(message, 401);
const forbidden = (message = 'Forbidden') => new AppError(message, 403);

module.exports = { AppError, notFound, unauthorized, forbidden };
