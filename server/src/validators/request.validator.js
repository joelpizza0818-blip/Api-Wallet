const { z } = require('zod');

const requestSchema = z.object({
	name: z.string().trim().min(1).max(160),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	path: z.string().trim().startsWith('/'),
	url: z.string().trim().optional().or(z.literal('')),
	description: z.string().trim().max(1000).optional().or(z.literal('')),
	headers: z.array(z.record(z.string(), z.unknown())).optional(),
	params: z.array(z.record(z.string(), z.unknown())).optional(),
	body: z.string().optional(),
}).passthrough();

module.exports = { requestSchema };
