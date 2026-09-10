const resource = require('./resource.controller');

module.exports = {
	listProjects: resource.listProjects,
	createProject: resource.createProject,
	getProject: resource.getProject,
	updateProject: resource.updateProject,
	removeProject: resource.removeProject,
	listCollections: resource.listCollections,
	createCollection: resource.createCollection,
	updateCollection: resource.updateCollection,
	removeCollection: resource.removeCollection,
};
