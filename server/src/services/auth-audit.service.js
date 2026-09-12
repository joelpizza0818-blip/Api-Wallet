const prisma = require('../config/database');

async function recordAuthAudit({ userId = null, email = null, event, req }) {
  try {
    await prisma.authAuditEvent.create({
      data: { userId, email, event, ipAddress: req?.ip || null, userAgent: req?.get('user-agent') || null },
    });
  } catch (error) {
    console.error(`[Auth Audit Error]: ${error.message}`);
  }
}

module.exports = { recordAuthAudit };