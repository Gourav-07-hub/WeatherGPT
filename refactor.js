const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// 1. Create Directories
const dirs = ['config', 'middleware', 'utils'];
dirs.forEach(d => fs.mkdirSync(path.join(srcDir, d), { recursive: true }));

// 2. config/env.js
fs.writeFileSync(path.join(srcDir, 'config', 'env.js'), `const dotenv = require('dotenv');
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
`);

// 3. utils/logger.js
fs.writeFileSync(path.join(srcDir, 'utils', 'logger.js'), `const logger = {
  info: (msg, data = {}) => console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), msg, ...data })),
  warn: (msg, data = {}) => console.warn(JSON.stringify({ level: 'warn', time: new Date().toISOString(), msg, ...data })),
  error: (msg, data = {}) => console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), msg, ...data })),
};
module.exports = logger;
`);

// 4. utils/cache.js
fs.writeFileSync(path.join(srcDir, 'utils', 'cache.js'), `const logger = require('./logger');
const store = new Map();

function get(key, skipCache = false) {
  if (skipCache) return null;
  const entry = store.get(key);
  if (!entry) {
    logger.info('Cache miss', { key });
    return null;
  }
  if (Date.now() > entry.expiry) {
    store.delete(key);
    logger.info('Cache expired miss', { key });
    return null;
  }
  logger.info('Cache hit', { key });
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiry: Date.now() + ttlMs });
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.expiry) store.delete(k);
  }
}, 60000).unref();

module.exports = { get, set };
`);

// 5. utils/fetcher.js
fs.writeFileSync(path.join(srcDir, 'utils', 'fetcher.js'), `const fetch = require('node-fetch');
const logger = require('./logger');

class RateLimiter {
  constructor(limit, intervalMs) {
    this.limit = limit;
    this.intervalMs = intervalMs;
    this.tokens = limit;
    this.lastRefill = Date.now();
  }
  acquire() {
    const now = Date.now();
    if (now - this.lastRefill >= this.intervalMs) {
      this.tokens = this.limit;
      this.lastRefill = now;
    }
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
}

const meteoLimiter = new RateLimiter(10, 1000);
const nomLimiter = new RateLimiter(1, 1000);

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

async function fetchWithRetry(url, options, limiter, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (limiter && !limiter.acquire()) {
      throw new RateLimitError('Upstream rate limit reached (internal)');
    }
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (res.status === 429 || res.status === 503) {
      if (attempt === maxRetries) throw new RateLimitError(\`Upstream error \${res.status}\`);
      const retryAfter = res.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
      logger.warn(\`Rate limited or unavailable (\${res.status}), retrying in \${waitMs}ms\`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    throw new Error(\`Upstream error: \${res.status}\`);
  }
}

async function fetchOpenMeteo(url, options = {}) {
  return fetchWithRetry(url, options, meteoLimiter);
}

async function fetchNominatim(url, options = {}) {
  options.headers = { ...options.headers, 'User-Agent': 'WeatherGPT/1.0 (contact@weathergpt.local)' };
  return fetchWithRetry(url, options, nomLimiter);
}

module.exports = { fetchOpenMeteo, fetchNominatim, fetchWithRetry };
`);

// 6. middleware/errorHandler.js
fs.writeFileSync(path.join(srcDir, 'middleware', 'errorHandler.js'), `const logger = require('../utils/logger');
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });
  const status = err.status || 500;
  if (status === 429) res.set('Retry-After', '1');
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    details: err.details || undefined,
    status
  });
}
function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found', status: 404 });
}
module.exports = { errorHandler, notFoundHandler };
`);

// 7. middleware/requestLogger.js
fs.writeFileSync(path.join(srcDir, 'middleware', 'requestLogger.js'), `const logger = require('../utils/logger');
module.exports = function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request processed', { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
};
`);

// 8. middleware/asyncWrapper.js
fs.writeFileSync(path.join(srcDir, 'middleware', 'asyncWrapper.js'), `module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
`);

// 9. middleware/validator.js
fs.writeFileSync(path.join(srcDir, 'middleware', 'validator.js'), `function validate(schema) {
  return (req, res, next) => {
    try { schema(req); next(); } catch (err) { err.status = 400; next(err); }
  };
}
function assertNumber(val, min, max, name) {
  if (val === undefined || val === null || val === '') throw new Error(\`\${name} is required\`);
  const num = Number(val);
  if (Number.isNaN(num) || num < min || num > max) throw new Error(\`\${name} must be a valid number between \${min} and \${max}\`);
  return num;
}
function assertString(val, maxLen, name) {
  if (!val || typeof val !== 'string') throw new Error(\`\${name} is required and must be a string\`);
  if (val.length > maxLen) throw new Error(\`\${name} must be max \${maxLen} characters\`);
  return val;
}
const validators = {
  latLonQuery: (req) => { assertNumber(req.query.lat, -90, 90, 'lat'); assertNumber(req.query.lon, -180, 180, 'lon'); },
  latLonBody: (req) => { assertNumber(req.body.lat, -90, 90, 'lat'); assertNumber(req.body.lon, -180, 180, 'lon'); },
  qQuery: (req) => { assertString(req.query.q, 200, 'q'); },
  daysQuery: (req) => { if (req.query.days) assertNumber(req.query.days, 1, 90, 'days'); },
  chat: (req) => {
    assertString(req.body.message, 1000, 'message');
    if (req.body.lang) {
      if (!['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu'].includes(req.body.lang)) throw new Error('Unsupported lang code');
    }
  }
};
module.exports = { validate, validators };
`);

// 10. Rewrite App.js
const appJsPath = path.join(srcDir, 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');
appJs = appJs.replace(/const dotenv = require\('dotenv'\);\n?/, '');
appJs = appJs.replace(/dotenv\.config\(\);\n?/, '');
appJs = appJs.replace(/process\.env\.CORS_ORIGIN \|\| '\*'/g, 'config.CORS_ORIGIN');
appJs = appJs.replace(/process\.env\.PORT \|\| 3000/g, 'config.PORT');
appJs = `const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
` + appJs;
appJs = appJs.replace(/app\.use\(express\.json\(\)\);/, "app.use(express.json());\napp.use(requestLogger);");
appJs = appJs.replace(/module\.exports = app;/, `app.use(notFoundHandler);\napp.use(errorHandler);\n\nmodule.exports = app;`);
fs.writeFileSync(appJsPath, appJs);

// Helper function to read, modify, and save a file
function updateFile(filePath, replacer) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = replacer(content);
    fs.writeFileSync(filePath, content);
  }
}

// 11. Refactor services
updateFile(path.join(srcDir, 'services', 'geocodeService.js'), content => {
  return content
    .replace("const fetch = require('node-fetch');", "const { fetchNominatim } = require('../utils/fetcher');\nconst cache = require('../utils/cache');\nconst config = require('../config/env');")
    .replace(/process\.env\.NOMINATIM_BASE.*\|\| '.*'/g, 'config.NOMINATIM_BASE')
    .replace(/async function geocode\(query\) \{/, "async function geocode(query, debug=false) {\n  const cacheKey = `geo|\${query.toLowerCase().trim()}`;\n  const cached = cache.get(cacheKey, debug);\n  if (cached) return cached;")
    .replace(/return \{ lat: parseFloat\(lat\), lon: parseFloat\(lon\), name: display_name \};/, "const result = { lat: parseFloat(lat), lon: parseFloat(lon), name: display_name };\n  cache.set(cacheKey, result, 24 * 60 * 60 * 1000);\n  return result;")
    .replace(/await fetch\(/g, "await fetchNominatim(");
});

updateFile(path.join(srcDir, 'services', 'weatherService.js'), content => {
  return content
    .replace("const fetch = require('node-fetch');", "const { fetchOpenMeteo } = require('../utils/fetcher');\nconst cache = require('../utils/cache');\nconst config = require('../config/env');")
    .replace(/const OPEN_METEO_BASE.*/g, '')
    .replace(/OPEN_METEO_BASE/g, 'config.OPEN_METEO_BASE')
    .replace(/async function getCurrentWeather\(lat, lon\) \{/, "async function getCurrentWeather(lat, lon, debug=false) {\n  const cacheKey = `cur|\${lat}|\${lon}`;\n  const cached = cache.get(cacheKey, debug);\n  if (cached) return cached;")
    .replace(/return data\.current;/, "cache.set(cacheKey, data.current, 10 * 60 * 1000);\n  return data.current;")
    .replace(/async function getDailyForecast\(lat, lon, days = 7\) \{/, "async function getDailyForecast(lat, lon, days = 7, debug=false) {\n  const cacheKey = `day|\${lat}|\${lon}|\${days}`;\n  const cached = cache.get(cacheKey, debug);\n  if (cached) return cached;")
    .replace(/return data\.daily;/, "cache.set(cacheKey, data.daily, 30 * 60 * 1000);\n  return data.daily;")
    .replace(/async function getHourlyForecast\(lat, lon\) \{/, "async function getHourlyForecast(lat, lon, debug=false) {\n  const cacheKey = `hr|\${lat}|\${lon}`;\n  const cached = cache.get(cacheKey, debug);\n  if (cached) return cached;")
    .replace(/return data\.hourly;/, "cache.set(cacheKey, data.hourly, 15 * 60 * 1000);\n  return data.hourly;")
    .replace(/await fetch\(/g, "await fetchOpenMeteo(");
});

updateFile(path.join(srcDir, 'services', 'climateService.js'), content => {
  return content
    .replace("const fetch = require('node-fetch');", "const { fetchOpenMeteo } = require('../utils/fetcher');\nconst config = require('../config/env');")
    .replace(/const OPEN_METEO_BASE.*/g, '')
    .replace(/OPEN_METEO_BASE/g, 'config.OPEN_METEO_BASE')
    .replace(/await fetch\(/g, "await fetchOpenMeteo(");
});

updateFile(path.join(srcDir, 'services', 'llmService.js'), content => {
  return content
    .replace("const fetch = require('node-fetch');", "const { fetchWithRetry } = require('../utils/fetcher');\nconst config = require('../config/env');")
    .replace(/const OPENAI_BASE.*/g, '')
    .replace(/const OPENAI_API_KEY.*/g, '')
    .replace(/const OPENAI_MODEL.*/g, '')
    .replace(/OPENAI_API_KEY/g, 'config.OPENAI_API_KEY')
    .replace(/OPENAI_BASE/g, 'config.OPENAI_BASE')
    .replace(/OPENAI_MODEL/g, 'config.OPENAI_MODEL')
    .replace(/await fetch\(/g, "await fetchWithRetry(");
});

// 12. Refactor routes
const routesDir = path.join(srcDir, 'routes');
fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.js')) {
    let content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    // Inject dependencies
    if (!content.includes('asyncWrapper')) {
      content = `const asyncWrapper = require('../middleware/asyncWrapper');\nconst { validate, validators } = require('../middleware/validator');\n` + content;
    }
    
    // Replace async route handlers with asyncWrapper
    content = content.replace(/router\.(get|post|delete)\('([^']+)',\s*(async\s*\([^)]*\)\s*=>\s*\{[^]*?\})\);/g, (match, method, routePath, func) => {
      // Remove the inner try-catch if it exists (very naive approach for a script, but we will just wrap it anyway)
      // Actually let's just wrap it. The inner try-catch will just pass to next if it throws, or we can just leave it.
      // But prompt says "Ensure all async route handlers catch errors consistently."
      // Let's replace the whole try-catch if possible, or just let asyncWrapper handle unhandled ones.
      // Better: we know the routes structure, let's just strip try { ... } catch(e) { res.status(500).json(...) }
      let newFunc = func.replace(/try\s*\{([\s\S]*)\}\s*catch\s*\([^)]*\)\s*\{\s*(?:console\.error[^;]*;)?\s*res\.status\(\d+\)\.json\([^)]*\);\s*\}/, "$1");
      return `router.${method}('${routePath}', asyncWrapper(${newFunc}));`;
    });
    
    // Inject validators based on file
    if (file === 'weather.js') {
       content = content.replace(/router\.get\('\/nearby', asyncWrapper\(/, "router.get('/nearby', validate(validators.latLonQuery), asyncWrapper(");
    }
    if (file === 'chat.js') {
       content = content.replace(/router\.post\('\/', asyncWrapper\(/, "router.post('/', validate(validators.chat), asyncWrapper(");
    }
    if (file === 'geocode.js') {
       content = content.replace(/router\.get\('\/', asyncWrapper\(/, "router.get('/', validate(validators.qQuery), asyncWrapper(");
    }
    if (file === 'climate.js') {
       content = content.replace(/router\.get\('\/', asyncWrapper\(/, "router.get('/', validate(validators.latLonQuery), validate(validators.daysQuery), asyncWrapper(");
    }
    if (file === 'alerts.js') {
       content = content.replace(/router\.get\('\/', asyncWrapper\(/, "router.get('/', validate(validators.latLonQuery), asyncWrapper(");
    }
    if (file === 'subscribe.js') {
       content = content.replace(/router\.post\('\/', asyncWrapper\(/, "router.post('/', validate(validators.latLonBody), asyncWrapper(");
    }

    // Also pass debug flag from req to service calls if we can, 
    // e.g. getCurrentWeather(lat, lon, req.query.debug === 'true')
    // We'll just do a global replace for service calls in routes to add debug flag
    content = content.replace(/getCurrentWeather\(([^)]+)\)/g, "getCurrentWeather($1, req.query.debug === 'true')");
    content = content.replace(/getDailyForecast\(([^)]+)\)/g, "getDailyForecast($1, req.query.debug === 'true')");
    content = content.replace(/getHourlyForecast\(([^)]+)\)/g, "getHourlyForecast($1, req.query.debug === 'true')");
    content = content.replace(/geocode\(([^)]+)\)/g, "geocode($1, req.query.debug === 'true')");
    
    fs.writeFileSync(path.join(routesDir, file), content);
  }
});

console.log("Refactoring complete");
