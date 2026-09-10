const resource = require('./resource.controller');

module.exports = {
	listEnvironments: resource.listEnvironments,
	createEnvironment: resource.createEnvironment,
};
