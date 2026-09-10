const { z } = require('zod');

const projectSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(500).optional().default('') });
const collectionSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(500).optional().default(''), parentId: z.string().trim().nullable().optional(), sortOrder: z.number().int().optional() });

module.exports = { projectSchema, collectionSchema };
