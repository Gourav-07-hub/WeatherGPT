const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
['.env.development', '.env.local', '.env'].forEach(file => {
  const fp = path.join(rootDir, file);
  if (fs.existsSync(fp)) dotenv.config({ path: fp });
});

const crypto = require('crypto');

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'dev-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[CONFIG WARNING] JWT_SECRET was not set in production. Generated a secure temporary secret for this instance. Set JWT_SECRET in your Render dashboard to keep auth sessions persistent across deploys.');
    jwtSecret = crypto.randomBytes(32).toString('hex');
  } else {
    jwtSecret = 'dev-secret-change-me';
  }
}

const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_BASE: process.env.OPENAI_BASE || 'https://api.openai.com',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPEN_METEO_BASE: process.env.OPEN_METEO_BASE || 'https://api.open-metEO.com'.toLowerCase(),
  NOMINATIM_BASE: process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};

if (Number.isNaN(config.PORT)) {
  console.error(`[CONFIG ERROR] Invalid PORT environment variable: "${process.env.PORT}". Falling back to 3000.`);
  config.PORT = 3000;
}

module.exports = config;
