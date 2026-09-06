const fetch = require('node-fetch');
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

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

// Nominatim: 1 req/sec globally, no bursting — queue with 1000ms gap
let nominatimQueue = Promise.resolve();
let lastNominatimAt = 0;

const inflight = new Map();

function dedupKey(url, options = {}) {
  // POST requests carry a body that differs per caller; deduplicating by URL
  // alone would return one caller's response to another. Only deduplicate
  // requests that are safe to share (GET-style, no body).
  if (options.method && options.method !== 'GET') return null;
  if (options.body) return null;
  return url;
}

async function fetchWithRetry(url, options = {}, limiter, maxRetries = 3) {
  const key = dedupKey(url, options);
  if (key && inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (limiter && !limiter.acquire()) {
        throw new RateLimitError('Upstream rate limit reached (internal)');
      }
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || res.status === 503) {
        if (attempt === maxRetries) throw new RateLimitError(`Upstream error ${res.status}`);
        const retryAfter = res.headers.get('retry-after');
        const base = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt + 1) * 1000;
        const jitter = Math.floor(Math.random() * 1000);
        const waitMs = base + jitter;
        logger.warn(`Rate limited or unavailable (${res.status}), retrying in ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw new Error(`Upstream error: ${res.status}`);
    }
  })();

  if (key) {
    inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      inflight.delete(key);
    }
  }
  return promise;
}

async function fetchOpenMeteo(url, options = {}) {
  return fetchWithRetry(url, options, meteoLimiter);
}

async function fetchNominatim(url, options = {}) {
  const headers = { ...options.headers, 'User-Agent': 'WeatherGPT/1.0 (contact@weathergpt.local)' };
  const opts = { ...options, headers };

  const task = nominatimQueue.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, 1000 - (now - lastNominatimAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatimAt = Date.now();
    return fetchWithRetry(url, opts, null);
  });

  // Keep queue moving even if task fails
  nominatimQueue = task.catch(() => {});

  return task;
}

module.exports = { fetchOpenMeteo, fetchNominatim, fetchWithRetry };