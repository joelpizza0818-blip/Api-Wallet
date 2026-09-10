const crypto = require('crypto');

function key() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) { const error = new Error('ENCRYPTION_KEY is not configured'); error.statusCode = 503; throw error; }
  return crypto.createHash('sha256').update(secret).digest();
}
function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
function decrypt(payload) {
  const [iv, tag, value] = payload.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(value), decipher.final()]).toString('utf8');
}
module.exports = { encrypt, decrypt };
