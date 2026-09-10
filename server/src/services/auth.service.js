const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function findOrCreateGoogleUser(profile) {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  if (!email) throw new Error('Google did not return an email address.');

  const name = profile.displayName || email.split('@')[0];
  const avatarUrl = profile.photos?.[0]?.value || null;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.id }, { email }] },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { googleId: profile.id, avatarUrl: avatarUrl || existing.avatarUrl, provider: 'GOOGLE' },
    });
  }

  return prisma.user.create({
    data: { email, name, googleId: profile.id, avatarUrl, provider: 'GOOGLE' },
  });
}

async function findOrCreateGithubUser(profile) {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  if (!email) throw new Error('GitHub did not return an email address.');

  const name = profile.displayName || profile.username || email.split('@')[0];
  const avatarUrl = profile.photos?.[0]?.value || null;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ githubId: String(profile.id) }, { email }] },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { githubId: String(profile.id), avatarUrl: avatarUrl || existing.avatarUrl, provider: 'GITHUB' },
    });
  }

  return prisma.user.create({
    data: { email, name, githubId: String(profile.id), avatarUrl, provider: 'GITHUB' },
  });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatarUrl, provider: user.provider };
}

async function registerLocal({ name, email, password }) {
  if (!name?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 8) {
    const error = new Error('Name, valid email, and an 8-character password are required.'); error.statusCode = 400; throw error;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) { const error = new Error('Email is already registered.'); error.statusCode = 409; throw error; }
  return prisma.user.create({ data: { name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) } });
}

async function loginLocal({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email?.trim().toLowerCase() } });
  if (!user?.passwordHash || !(await bcrypt.compare(password || '', user.passwordHash))) { const error = new Error('Invalid email or password.'); error.statusCode = 401; throw error; }
  if (user.status !== 'ACTIVE') { const error = new Error('Account is not active.'); error.statusCode = 403; throw error; }
  return user;
}

async function updateProfile(userId, { name, avatarUrl }) {
  if (!name?.trim()) { const error = new Error('Name is required.'); error.statusCode = 400; throw error; }
  return prisma.user.update({ where: { id: userId }, data: { name: name.trim(), ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }) } });
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (typeof newPassword !== 'string' || newPassword.length < 8) { const error = new Error('The new password must have at least 8 characters.'); error.statusCode = 400; throw error; }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword || '', user.passwordHash))) { const error = new Error('Current password is incorrect.'); error.statusCode = 400; throw error; }
  return prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
}

module.exports = { createToken, findOrCreateGoogleUser, findOrCreateGithubUser, publicUser, registerLocal, loginLocal, updateProfile, changePassword };
