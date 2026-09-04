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
const nomLimiter = new RateLimiter(1, 1000);

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

const inflight = new Map();

async function fetchWithRetry(url, options, limiter, maxRetries = 3) {
  // Deduplicate concurrent requests for the same URL
  if (inflight.has(url)) {
    return inflight.get(url);
  }

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

  inflight.set(url, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(url);
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
