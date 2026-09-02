const { fetchOpenMeteo } = require('../utils/fetcher');
const cache = require('../utils/cache');
const config = require('../config/env');
const { getCurrentWeatherOWM } = require('./openWeatherMapService');
const { getCurrentWeatherWA, getDailyForecastWA } = require('./weatherApiService');

/**
 * Fetch current weather for given latitude/longitude
 * Provider priority: WeatherAPI.com -> OpenWeatherMap -> Open-Meteo
 */
async function getCurrentWeather(lat, lon, debug=false) {
  const cacheKey = `cur|${lat}|${lon}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;

  const wa = await getCurrentWeatherWA(lat, lon);
  if (wa) {
    cache.set(cacheKey, wa, 10 * 60 * 1000);
    return wa;
  }

  const owm = await getCurrentWeatherOWM(lat, lon);
  if (owm) {
    cache.set(cacheKey, owm, 10 * 60 * 1000);
    return owm;
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    timezone: 'auto',
    forecast_days: 1,
  });

  const res = await fetchOpenMeteo(`${config.OPEN_METEO_BASE}/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, data.current, 10 * 60 * 1000);
  return data.current;
}

/**
 * Fetch 7-day daily forecast
 * Provider priority: WeatherAPI.com -> Open-Meteo
 */
async function getDailyForecast(lat, lon, days = 7, debug=false) {
  const cacheKey = `day|${lat}|${lon}|${days}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;

  const wa = await getDailyForecastWA(lat, lon, days);
  if (wa) {
    cache.set(cacheKey, wa, 30 * 60 * 1000);
    return wa;
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'wind_speed_10m_max',
    ].join(','),
    timezone: 'auto',
    forecast_days: String(days),
  });

  const res = await fetchOpenMeteo(`${config.OPEN_METEO_BASE}/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, data.daily, 30 * 60 * 1000);
  return data.daily;
}

/**
 * Fetch hourly forecast (next 24h) for detailed alerts
 */
async function getHourlyForecast(lat, lon, debug=false) {
  const cacheKey = `hr|${lat}|${lon}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'precipitation',
    ].join(','),
    timezone: 'auto',
    forecast_days: 2,
  });

  const res = await fetchOpenMeteo(`${config.OPEN_METEO_BASE}/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, data.hourly, 15 * 60 * 1000);
  return data.hourly;
}

module.exports = {
  getCurrentWeather,
  getDailyForecast,
  getHourlyForecast,
};
