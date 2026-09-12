const { publicUser, createToken, registerLocal, requestLoginVerification, verifyLoginToken, updateProfile: updateProfileService, changePassword: changePasswordService } = require('../services/auth.service');
const { recordAuthAudit } = require('../services/auth-audit.service');

function sessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function setSessionCookie(res, user) {
  const token = createToken(user);
  res.cookie('api_vault_token', token, sessionCookieOptions());
}
function sendSession(res, user, status = 200) {
  setSessionCookie(res, user);
  return res.status(status).json({ success: true, user: publicUser(user) });
}
async function register(req, res, next) { try { return sendSession(res, await registerLocal(req.body), 201); } catch (error) { return next(error); } }
async function login(req, res, next) {
  try {
    const result = await requestLoginVerification(req.body);
    await recordAuthAudit({ userId: result.user.id, email: result.user.email, event: 'LOGIN_VERIFICATION_SENT', req });
    return res.status(202).json({ success: true, verificationRequired: true, message: 'Revisa tu correo para confirmar el inicio de sesión.' });
  } catch (error) {
    await recordAuthAudit({ email: typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null, event: 'LOGIN_FAILED', req });
    return next(error);
  }
}
async function verifyLogin(req, res, next) {
  try {
    const user = await verifyLoginToken(req.query.token);
    await recordAuthAudit({ userId: user.id, email: user.email, event: 'LOGIN_VERIFIED', req });
    setSessionCookie(res, user);
    return res.redirect(`${(process.env.FRONTEND_URL || '').replace(/\/+$/, '')}/dashboard`);
  } catch (error) { return next(error); }
}
async function updateProfile(req, res, next) { try { return res.json({ success: true, user: publicUser(await updateProfileService(req.user.id, req.body)) }); } catch (error) { return next(error); } }
async function changePassword(req, res, next) { try { await changePasswordService(req.user.id, req.body); return res.status(204).end(); } catch (error) { return next(error); } }

function currentUser(req, res) {
  return res.json({ success: true, user: publicUser(req.user) });
}

function logout(_req, res) {
  res.clearCookie('api_vault_token', sessionCookieOptions());
  return res.status(204).end();
}

module.exports = { currentUser, logout, register, login, verifyLogin, updateProfile, changePassword, sessionCookieOptions };
