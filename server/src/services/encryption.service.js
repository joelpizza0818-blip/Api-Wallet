const crypto = require('crypto');

/**
 * Returns a 32-byte Buffer derived from ENCRYPTION_KEY or a specific versioned key.
 */
function getKey(version = 1) {
  const envKey = process.env[`ENCRYPTION_KEY_V${version}`] || process.env.ENCRYPTION_KEY;
  if (!envKey) {
    const error = new Error('ENCRYPTION_KEY is not configured in environment variables');
    error.statusCode = 503;
    throw error;
  }
  // Derive uniform 256-bit key using sha256
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * Output format: `v{version}:{iv_base64url}:{tag_base64url}:{ciphertext_base64url}`
 */
function encrypt(value, version = 1) {
  if (value === null || value === undefined) return null;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(version), iv);
  const ciphertext = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v${version}:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

/**
 * Decrypts payload encrypted with AES-256-GCM.
 * Supports versioned format (`v1:iv:tag:cipher`) and legacy format (`iv.tag.cipher`).
 */
function decrypt(payload, overrideVersion = null) {
  if (!payload || typeof payload !== 'string') return null;

  let version = overrideVersion || 1;
  let ivB64;
  let tagB64;
  let cipherB64;

  if (payload.includes(':')) {
    const parts = payload.split(':');
    if (parts.length === 4 && parts[0].startsWith('v')) {
      version = parseInt(parts[0].slice(1), 10) || 1;
      ivB64 = parts[1];
      tagB64 = parts[2];
      cipherB64 = parts[3];
    } else {
      throw new Error('Invalid encrypted payload format');
    }
  } else if (payload.includes('.')) {
    // Legacy format
    const parts = payload.split('.');
    if (parts.length === 3) {
      ivB64 = parts[0];
      tagB64 = parts[1];
      cipherB64 = parts[2];
    } else {
      throw new Error('Invalid legacy encrypted payload format');
    }
  } else {
    throw new Error('Unrecognized encrypted payload format');
  }

  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const ciphertext = Buffer.from(cipherB64, 'base64url');

  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(version), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Creates an irreversible deterministic SHA-256 hash for database lookups and index verification.
 */
function hash(value) {
  if (value === null || value === undefined) return '';
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Timing-safe comparison of a plaintext candidate against a known hash.
 */
function compareHash(candidate, storedHash) {
  if (!candidate || !storedHash) return false;
  const candidateHash = hash(candidate);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  compareHash,
};
