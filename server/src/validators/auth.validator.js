const { z } = require('zod');

const registerSchema = z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email(), password: z.string().min(8).max(128) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });
const profileSchema = z.object({ name: z.string().trim().min(1).max(120).optional(), email: z.string().trim().email().optional() }).strict();
const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) });

module.exports = { registerSchema, loginSchema, profileSchema, passwordSchema };
