function write(level, message, metadata = undefined) {
	const entry = { timestamp: new Date().toISOString(), level, message, ...(metadata ? { metadata } : {}) };
	const output = JSON.stringify(entry);
	if (level === 'error') console.error(output);
	else if (level === 'warn') console.warn(output);
	else console.log(output);
}

module.exports = {
	info: (message, metadata) => write('info', message, metadata),
	warn: (message, metadata) => write('warn', message, metadata),
	error: (message, metadata) => write('error', message, metadata),
};
