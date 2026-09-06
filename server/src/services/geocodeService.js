const { fetchNominatim } = require('../utils/fetcher');
const cache = require('../utils/cache');
const config = require('../config/env');
const logger = require('../utils/logger');
const fetch = require('node-fetch');

const NOMINATIM_BASE = config.NOMINATIM_BASE;
const WEATHERAPI_KEY = process.env.WEATHERAPI_API_KEY || '';

async function geocode(query, debug = false) {
  if (!query || typeof query !== 'string') return null;
  const cleanQuery = query.replace(/[?.,!]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanQuery) return null;

  const cacheKey = `geo|${cleanQuery.toLowerCase()}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;

  // 1. Primary: Nominatim OpenStreetMap
  try {
    const url = new URL(`${NOMINATIM_BASE}/search`);
    url.searchParams.set('q', cleanQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetchNominatim(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const result = { lat: parseFloat(lat), lon: parseFloat(lon), name: display_name };
        cache.set(cacheKey, result, 24 * 60 * 60 * 1000);
        return result;
      }
    }
  } catch (err) {
    logger.warn('Nominatim geocode failed or rate-limited, falling back', { query: cleanQuery, error: err.message });
  }

  // 2. Secondary fallback: Open-Meteo Geocoding API (fast, free, no rate-limit bottleneck)
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=5&language=en&format=json`;
    const res = await fetch(omUrl, { timeout: 4000 });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const sorted = [...data.results].sort((a, b) => (b.population || 0) - (a.population || 0));
        const top = sorted[0];
        const parts = [top.name, top.admin1, top.country].filter(Boolean);
        const result = {
          lat: parseFloat(top.latitude),
          lon: parseFloat(top.longitude),
          name: parts.join(', '),
        };
        cache.set(cacheKey, result, 24 * 60 * 60 * 1000);
        return result;
      }
    }
  } catch (err) {
    logger.warn('Open-Meteo geocode fallback failed', { query: cleanQuery, error: err.message });
  }

  // 3. Tertiary fallback: WeatherAPI Search
  if (WEATHERAPI_KEY) {
    try {
      const waUrl = `https://api.weatherapi.com/v1/search.json?key=${encodeURIComponent(WEATHERAPI_KEY)}&q=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(waUrl, { timeout: 4000 });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const top = data[0];
          const parts = [top.name, top.region, top.country].filter(Boolean);
          const result = {
            lat: parseFloat(top.lat),
            lon: parseFloat(top.lon),
            name: parts.join(', '),
          };
          cache.set(cacheKey, result, 24 * 60 * 60 * 1000);
          return result;
        }
      }
    } catch (err) {
      logger.warn('WeatherAPI search fallback failed', { query: cleanQuery, error: err.message });
    }
  }

  return null;
}

async function reverseGeocode(lat, lon, debug = false) {
  const roundedLat = Number(lat).toFixed(3);
  const roundedLon = Number(lon).toFixed(3);
  const cacheKey = `geor|${roundedLat},${roundedLon}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;

  // 1. Primary: Nominatim reverse geocode
  try {
    const url = new URL(`${NOMINATIM_BASE}/reverse`);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');

    const res = await fetchNominatim(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const result = { lat: parseFloat(lat), lon: parseFloat(lon), name: data.display_name };
        cache.set(cacheKey, result, 60 * 60 * 1000);
        return result;
      }
    }
  } catch (err) {
    logger.warn('Nominatim reverse geocode failed, falling back', { lat, lon, error: err.message });
  }

  // 2. Fallback: WeatherAPI search with coords
  if (WEATHERAPI_KEY) {
    try {
      const waUrl = `https://api.weatherapi.com/v1/search.json?key=${encodeURIComponent(WEATHERAPI_KEY)}&q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
      const res = await fetch(waUrl, { timeout: 4000 });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const top = data[0];
          const parts = [top.name, top.region, top.country].filter(Boolean);
          const result = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            name: parts.join(', '),
          };
          cache.set(cacheKey, result, 60 * 60 * 1000);
          return result;
        }
      }
    } catch (err) {
      logger.warn('WeatherAPI reverse geocode fallback failed', { lat, lon, error: err.message });
    }
  }

  return { lat: parseFloat(lat), lon: parseFloat(lon), name: `${Number(lat).toFixed(2)}°, ${Number(lon).toFixed(2)}°` };
}

module.exports = { geocode, reverseGeocode };
