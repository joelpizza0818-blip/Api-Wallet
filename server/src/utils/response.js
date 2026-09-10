function success(res, data, status = 200) {
	return res.status(status).json({ success: true, data });
}

function created(res, data) {
	return success(res, data, 201);
}

function noContent(res) {
	return res.status(204).end();
}

module.exports = { success, created, noContent };
