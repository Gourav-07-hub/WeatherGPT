const { fetchWithRetry } = require('../utils/fetcher');
const logger = require('../utils/logger');

const OPENWEATHERMAP_BASE = process.env.OPENWEATHERMAP_BASE || 'https://api.openweathermap.org';
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY || '';
const owmLimiter = { acquire: () => true };

async function getCurrentWeatherOWM(lat, lon) {
  if (!OPENWEATHERMAP_API_KEY) return null;
  const url = `${OPENWEATHERMAP_BASE}/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(OPENWEATHERMAP_API_KEY)}&units=metric`;
  let res;
  try {
    res = await fetchWithRetry(url, {}, owmLimiter);
  } catch (err) {
    if (err.status === 429) logger.warn('OWM rate-limited', { lat, lon });
    throw err;
  }
  if (!res.ok) {
    if (res.status === 401) return null; // invalid key, fallback silently
    throw new Error(`OpenWeatherMap error: ${res.status}`);
  }
  const data = await res.json();
  return {
    temperature_2m: data.main?.temp,
    apparent_temperature: data.main?.feels_like,
    relative_humidity_2m: data.main?.humidity,
    weather_code: mapOWMCode(data.weather?.[0]?.id),
    wind_speed_10m: (data.wind?.speed ?? 0) * 3.6,
    wind_direction_10m: data.wind?.deg,
    source: 'openweathermap',
  };
}

function mapOWMCode(owmId) {
  if (!owmId && owmId !== 0) return 0;
  if (owmId === 800) return 0;
  if (owmId >= 801 && owmId <= 804) return owmId - 800 + 2;
  if (owmId >= 200 && owmId < 300) return 95;
  if (owmId >= 300 && owmId < 400) return 51;
  if (owmId >= 500 && owmId < 600) return 61;
  if (owmId >= 600 && owmId < 700) return 71;
  if (owmId >= 700 && owmId < 800) return 45;
  if (owmId >= 800 && owmId < 900) return 0;
  return 0;
}

async function getHourlyForecastOWM(lat, lon) {
  if (!OPENWEATHERMAP_API_KEY) return null;
  const url = `${OPENWEATHERMAP_BASE}/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(OPENWEATHERMAP_API_KEY)}&units=metric&cnt=8`;
  let res;
  try {
    res = await fetchWithRetry(url, {}, owmLimiter);
  } catch (err) {
    if (err.status === 429) logger.warn('OWM forecast rate-limited', { lat, lon });
    throw err;
  }
  if (!res.ok) {
    if (res.status === 401) return null;
    throw new Error(`OpenWeatherMap forecast error: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.list) || data.list.length === 0) return null;
  return {
    time: data.list.map(item => {
      if (!item.dt_txt) return null;
      // Normalize "2026-09-04 12:00:00" to "2026-09-04T12:00" (ISO-ish) to match Open-Meteo format
      return item.dt_txt.replace(' ', 'T').slice(0, 16);
    }),
    temperature_2m: data.list.map(item => item.main?.temp),
    relative_humidity_2m: data.list.map(item => item.main?.humidity),
    weather_code: data.list.map(item => mapOWMCode(item.weather?.[0]?.id)),
    wind_speed_10m: data.list.map(item => (item.wind?.speed ?? 0) * 3.6),
    precipitation: data.list.map(item => (item.rain?.['3h'] ?? item.snow?.['3h'] ?? 0) / 3),
    source: 'openweathermap',
  };
}

module.exports = { getCurrentWeatherOWM, getHourlyForecastOWM };
