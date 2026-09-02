const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
['.env.development', '.env.local', '.env'].forEach(file => {
  const fp = path.join(rootDir, file);
  if (fs.existsSync(fp)) dotenv.config({ path: fp });
});

const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_BASE: process.env.OPENAI_BASE || 'https://api.openai.com',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPEN_METEO_BASE: process.env.OPEN_METEO_BASE || 'https://api.open-meteo.com',
  NOMINATIM_BASE: process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org'
};

if (Number.isNaN(config.PORT)) throw new Error('PORT must be a number');
module.exports = config;
