const { fetchNominatim } = require('../utils/fetcher');
const cache = require('../utils/cache');
const config = require('../config/env');

const NOMINATIM_BASE =
  config.NOMINATIM_BASE;

async function geocode(query, debug=false) {
  const cacheKey = `geo|${query.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const res = await fetchNominatim(url.toString());
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const data = await res.json();
  if (!data.length) return null;
  const { lat, lon, display_name } = data[0];
  const result = { lat: parseFloat(lat), lon: parseFloat(lon), name: display_name };
  cache.set(cacheKey, result, 24 * 60 * 60 * 1000);
  return result;
}

async function reverseGeocode(lat, lon, debug = false) {
  const roundedLat = Number(lat).toFixed(3);
  const roundedLon = Number(lon).toFixed(3);
  const cacheKey = `geor|${roundedLat},${roundedLon}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '10');
  url.searchParams.set('addressdetails', '1');

  const res = await fetchNominatim(url.toString());
  if (!res.ok) throw new Error(`Reverse geocoding error: ${res.status}`);
  const data = await res.json();
  if (!data || !data.display_name) return null;
  const result = { lat: parseFloat(lat), lon: parseFloat(lon), name: data.display_name };
  // ~110m precision, generous TTL — user's location rarely changes within a session
  cache.set(cacheKey, result, 60 * 60 * 1000);
  return result;
}

module.exports = { geocode, reverseGeocode };
