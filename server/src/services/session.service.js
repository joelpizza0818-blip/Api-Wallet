const prisma = require('../config/database');
const { hash } = require('./encryption.service');

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

/**
 * Creates and stores a session token hash with an expiration time.
 */
async function createSession(userId, token, expiresInDays = 7) {
  if (!userId) throw fail('userId is required');
  if (!token) throw fail('token is required');

  const tokenHash = hash(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  return prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
}

/**
 * Validates a session token. Returns associated User if active and non-expired.
 */
async function validateSession(token) {
  if (!token) return null;

  const tokenHash = hash(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

/**
 * Revokes an active session token.
 */
async function revokeSession(token) {
  if (!token) return null;
  const tokenHash = hash(token);

  return prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revokes all sessions belonging to a user (e.g. on password change or logout everywhere).
 */
async function revokeAllUserSessions(userId) {
  if (!userId) throw fail('userId is required');

  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Cleans up expired sessions from the database.
 */
async function cleanupExpiredSessions() {
  return prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  });
}

module.exports = {
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  cleanupExpiredSessions,
};
