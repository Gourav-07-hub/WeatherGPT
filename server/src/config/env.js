const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
['.env.development', '.env.local', '.env'].forEach(file => {
  const fp = path.join(rootDir, file);
  if (fs.existsSync(fp)) dotenv.config({ path: fp });
});

const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : '*'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_BASE: process.env.OPENAI_BASE || 'https://api.openai.com',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPEN_METEO_BASE: process.env.OPEN_METEO_BASE || 'https://api.open-meteo.com',
  NOMINATIM_BASE: process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};

if (Number.isNaN(config.PORT)) throw new Error('PORT must be a number');
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.warn('CORS_ORIGIN not set in production — API will reject browser requests. Set it to your Vercel URL in Render dashboard.');
}
if (process.env.NODE_ENV === 'production' && config.JWT_SECRET === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production — refusing to start with insecure default');
}
module.exports = config;
