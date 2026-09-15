const express = require('express');
const passport = require('passport');
const GithubStrategy = require('passport-github2').Strategy;
const { currentUser, logout, register, login, verifyEmail, updateProfile, changePassword } = require('../controllers/auth.controller');
const { createToken, findOrCreateGithubUser } = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { authRateLimit, loginRateLimit } = require('../middleware/rate-limit.middleware');
const prisma = require('../config/database');

const router = express.Router();
const frontendUrl = () => (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const oauthCookieOptions = {
  httpOnly: true,
  // Vercel and Render are different sites. The session cookie must be
  // allowed on credentialed cross-site requests from the frontend.
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function redirectWithSession(req, res, destination = '/auth/callback') {
  const token = createToken(req.user);
  res.cookie('api_vault_token', token, oauthCookieOptions);
  return res.redirect(`${frontendUrl()}${destination}`);
}

router.post('/register', authRateLimit, register);
router.post('/login', loginRateLimit, login);
router.get('/verify-email', verifyEmail);

function hasGithubConfiguration() {
  const clientId = process.env.GITHUB_CLIENT_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || '';
  return Boolean(clientId && clientSecret && callbackUrl);
}

router.get('/github/status', (_req, res) => {
  res.json({ configured: hasGithubConfiguration() });
});

if (hasGithubConfiguration()) {
  passport.use(new GithubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    scope: ['user:email'],
  }, async (_accessToken, _refreshToken, profile, done) => {
    try { done(null, await findOrCreateGithubUser(profile)); } catch (error) { done(error); }
  }));

  router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
  router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: `${frontendUrl()}/register?error=github_auth_failed` }), (req, res) => redirectWithSession(req, res, '/'));
} else {
  router.get('/github', (_req, res) => res.status(503).json({ success: false, message: 'GitHub OAuth requires GitHub OAuth App credentials.' }));
}

router.get('/me', requireAuth, currentUser);
router.patch('/me', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);
router.get('/preferences', requireAuth, async (req, res, next) => {
  try {
    const preferences = await prisma.userPreference.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id } });
    res.json({ success: true, preferences });
  } catch (error) { next(error); }
});
router.patch('/preferences', requireAuth, async (req, res, next) => {
  try {
    const data = {};
    if (typeof req.body.primaryTheme === 'string') data.primaryTheme = req.body.primaryTheme.trim().slice(0, 40);
    if (typeof req.body.accentColor === 'string') data.accentColor = req.body.accentColor.trim().slice(0, 40);
    const preferences = await prisma.userPreference.upsert({ where: { userId: req.user.id }, update: data, create: { userId: req.user.id, ...data } });
    res.json({ success: true, preferences });
  } catch (error) { next(error); }
});
router.post('/logout', logout);

module.exports = router;
