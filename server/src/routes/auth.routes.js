const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const { currentUser, logout, register, login, updateProfile, changePassword } = require('../controllers/auth.controller');
const { createToken, findOrCreateGoogleUser, findOrCreateGithubUser } = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { authRateLimit } = require('../middleware/rate-limit.middleware');
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

function redirectWithSession(req, res) {
  const token = createToken(req.user);
  res.cookie('api_vault_token', token, oauthCookieOptions);
  return res.redirect(`${frontendUrl()}/auth/callback`);
}

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);

function hasGoogleConfiguration() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || '';
  return Boolean(
    clientId &&
    clientSecret &&
    callbackUrl &&
    !clientId.includes('your-google-client-id') &&
    !clientSecret.includes('your-google-client-secret')
  );
}

function hasGithubConfiguration() {
  const clientId = process.env.GITHUB_CLIENT_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || '';
  return Boolean(clientId && clientSecret && callbackUrl);
}

router.get('/google/status', (_req, res) => {
  res.json({ configured: hasGoogleConfiguration() });
});
router.get('/github/status', (_req, res) => {
  res.json({ configured: hasGithubConfiguration() });
});

function oauthFailureRedirect(provider) {
  if (provider === 'google' && hasGithubConfiguration()) return '/api/auth/github';
  return `${frontendUrl()}/register?error=${provider}_auth_failed`;
}

if (hasGoogleConfiguration()) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try { done(null, await findOrCreateGoogleUser(profile)); } catch (error) { done(error); }
  }));

  router.get('/google', passport.authenticate('google', { scope: ['openid', 'profile', 'email'], state: true, session: false }));
  router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: oauthFailureRedirect('google') }), redirectWithSession);
} else {
  router.get('/google', (_req, res) => res.status(503).json({ success: false, message: 'Google OAuth requires valid Google Cloud credentials.' }));
}

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
  router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: oauthFailureRedirect('github') }), redirectWithSession);
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
