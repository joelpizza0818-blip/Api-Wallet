const { z } = require('zod');

const workspaceSchema = z.object({ name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(140).optional(), description: z.string().trim().max(500).optional().default('') });
const workspaceUpdateSchema = workspaceSchema.partial();
const invitationSchema = z.object({ email: z.string().trim().email(), role: z.enum(['ADMIN', 'DEVELOPER', 'QA', 'VIEWER']).default('DEVELOPER') });

module.exports = { workspaceSchema, workspaceUpdateSchema, invitationSchema };
