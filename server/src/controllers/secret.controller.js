const resource = require('./resource.controller');

module.exports = {
	listSecrets: resource.listSecrets,
	createSecret: resource.createSecret,
	removeSecret: resource.removeSecret,
};
