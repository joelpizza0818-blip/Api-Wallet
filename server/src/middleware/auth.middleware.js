const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').filter(Boolean).map((entry) => {
    const separator = entry.indexOf('=');
    return [entry.slice(0, separator).trim(), decodeURIComponent(entry.slice(separator + 1))];
  }));
}

async function requireAuth(req, res, next) {
  try {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const token = bearer || parseCookies(req.headers.cookie).api_vault_token;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

module.exports = { requireAuth };
