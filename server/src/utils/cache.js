const logger = require('./logger');
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
