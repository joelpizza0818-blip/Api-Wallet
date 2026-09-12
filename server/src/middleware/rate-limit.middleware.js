const rateLimit = require('express-rate-limit');

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many authentication attempts' } });
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts' } });
const apiRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests' } });

module.exports = { authRateLimit, loginRateLimit, apiRateLimit };
