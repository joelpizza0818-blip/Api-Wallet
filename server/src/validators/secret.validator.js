const { z } = require('zod');

const secretSchema = z.object({ name: z.string().trim().min(1).max(120), value: z.string().min(1).max(10000) });

module.exports = { secretSchema };
