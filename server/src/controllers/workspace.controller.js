const resource = require('./resource.controller');

module.exports = {
	listWorkspaces: resource.listWorkspaces,
	createWorkspace: resource.createWorkspace,
	getWorkspace: resource.getWorkspace,
	updateWorkspace: resource.updateWorkspace,
	removeWorkspace: resource.removeWorkspace,
};
