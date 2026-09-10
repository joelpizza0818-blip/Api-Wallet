const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const required = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];

function getEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  return process.env;
}

module.exports = { getEnv };
