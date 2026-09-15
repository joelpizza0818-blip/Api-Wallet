const resource = require('./resource.controller');

module.exports = {
	listRequests: resource.listRequests,
	createRequest: resource.createRequest,
	updateRequest: resource.updateRequest,
	removeRequest: resource.removeRequest,
	executeSavedRequest: resource.executeSavedRequest,
};
