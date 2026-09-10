function validate(schema, source = 'body') {
	return (req, _res, next) => {
		const result = schema.safeParse(req[source]);
		if (!result.success) {
			const error = new Error('Validation failed');
			error.statusCode = 422;
			error.details = result.error.issues;
			return next(error);
		}
		req[source] = result.data;
		return next();
	};
}

module.exports = { validate };
