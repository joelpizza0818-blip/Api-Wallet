const { publicUser, createToken, registerLocal, loginLocal, updateProfile: updateProfileService, changePassword: changePasswordService } = require('../services/auth.service');

function sendSession(res, user, status = 200) {
  const token = createToken(user);
  res.cookie('api_vault_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
  return res.status(status).json({ success: true, user: publicUser(user) });
}
async function register(req, res, next) { try { return sendSession(res, await registerLocal(req.body), 201); } catch (error) { return next(error); } }
async function login(req, res, next) { try { return sendSession(res, await loginLocal(req.body)); } catch (error) { return next(error); } }
async function updateProfile(req, res, next) { try { return res.json({ success: true, user: publicUser(await updateProfileService(req.user.id, req.body)) }); } catch (error) { return next(error); } }
async function changePassword(req, res, next) { try { await changePasswordService(req.user.id, req.body); return res.status(204).end(); } catch (error) { return next(error); } }

function currentUser(req, res) {
  return res.json({ success: true, user: publicUser(req.user) });
}

function logout(_req, res) {
  res.clearCookie('api_vault_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return res.status(204).end();
}

module.exports = { currentUser, logout, register, login, updateProfile, changePassword };
