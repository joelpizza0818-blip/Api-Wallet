const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const { currentUser, logout, register, login, updateProfile, changePassword } = require('../controllers/auth.controller');
const { createToken, findOrCreateGoogleUser, findOrCreateGithubUser } = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { authRateLimit } = require('../middleware/rate-limit.middleware');

const router = express.Router();
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
  return `${process.env.FRONTEND_URL}/register?error=${provider}_auth_failed`;
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
  router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: oauthFailureRedirect('google') }), (req, res) => {
    const token = createToken(req.user);
    res.cookie('api_vault_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  });
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
  router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: oauthFailureRedirect('github') }), (req, res) => {
    const token = createToken(req.user);
    res.cookie('api_vault_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  });
} else {
  router.get('/github', (_req, res) => res.status(503).json({ success: false, message: 'GitHub OAuth requires GitHub OAuth App credentials.' }));
}

router.get('/me', requireAuth, currentUser);
router.patch('/me', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);
router.post('/logout', logout);

module.exports = router;
