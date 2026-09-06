const { fetchOpenMeteo } = require('../utils/fetcher');
const cache = require('../utils/cache');
const config = require('../config/env');
const logger = require('../utils/logger');
const { getCurrentWeatherOWM, getHourlyForecastOWM } = require('./openWeatherMapService');
const { getCurrentWeatherWA, getDailyForecastWA } = require('./weatherApiService');

/**
 * Fetch current weather for given latitude/longitude
 * Provider priority: Open-Meteo -> WeatherAPI.com -> OpenWeatherMap
 * (Open-Meteo is free, no key, 28 metrics — matches Vader's correct data)
 */
async function getCurrentWeather(lat, lon, debug=false, preferOpenMeteo=false) {
  const cacheKey = (preferOpenMeteo ? 'cur|om|' : 'cur|') + `${lat}|${lon}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;

  // Always try Open-Meteo first — Vader-proven correct data; WeatherAPI/OWM are fallback only
  // (preferOpenMeteo flag kept for backward compat, but Open-Meteo is now primary in all cases)
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'dew_point_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'wind_speed_80m',
      'surface_pressure',
      'pressure_msl',
      'cloud_cover',
      'cloud_cover_low',
      'cloud_cover_mid',
      'cloud_cover_high',
      'visibility',
      'uv_index',
      'shortwave_radiation',
      'cape',
      'soil_moisture_0_to_1cm',
      'soil_moisture_3_to_9cm',
      'soil_temperature_0cm',
      'evapotranspiration',
      'precipitation',
      'rain',
      'showers',
    ].join(','),
    timezone: 'Asia/Kolkata',
    forecast_days: 7,
  });

  try {
    const res = await fetchOpenMeteo(`${config.OPEN_METEO_BASE}/v1/forecast?${params}`);
    if (res.ok) {
      const data = await res.json();
      cache.set(cacheKey, data.current, 10 * 60 * 1000);
      return data.current;
    }
  } catch (e) {
    logger.warn('Open-Meteo current failed, trying fallback', { lat, lon, error: e.message });
  }

  // Fallbacks only if Open-Meteo failed
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

  throw new Error(`All weather providers failed for ${lat},${lon}`);
}

/**
 * Fetch 7-day daily forecast
 * Provider priority: Open-Meteo -> WeatherAPI.com
 * (matches Vader's DAILY_VARS, Asia/Kolkata — correct data)
 */
async function getDailyForecast(lat, lon, days = 7, debug=false, preferOpenMeteo=false) {
  const cacheKey = (preferOpenMeteo ? 'day|om|' : 'day|') + `${lat}|${lon}|${days}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;

  // Open-Meteo first — correct, free, matches Vader
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
      ].join(','),
      timezone: 'Asia/Kolkata',
      forecast_days: String(days),
    });

    const res = await fetchOpenMeteo(`${config.OPEN_METEO_BASE}/v1/forecast?${params}`);
    if (res.ok) {
      const data = await res.json();
      cache.set(cacheKey, data.daily, 30 * 60 * 1000);
      return data.daily;
    }
  } catch (e) {
    logger.warn('Open-Meteo daily failed, trying fallback', { lat, lon, error: e.message });
  }

  const wa = await getDailyForecastWA(lat, lon, days);
  if (wa) {
    cache.set(cacheKey, wa, 30 * 60 * 1000);
    return wa;
  }

  throw new Error(`All daily providers failed for ${lat},${lon}`);
}

/**
 * Fetch hourly forecast (next 24h) for detailed alerts
 * Provider priority: Open-Meteo -> OpenWeatherMap
 */
async function getHourlyForecast(lat, lon, debug=false) {
  const cacheKey = `hr|${lat}|${lon}`;
  const cached = cache.get(cacheKey, debug);
  if (cached) return cached;

  // Try Open-Meteo first — Asia/Kolkata to match Vader
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'weather_code',
        'wind_speed_10m',
        'wind_gusts_10m',
        'precipitation',
      ].join(','),
      timezone: 'Asia/Kolkata',
      forecast_days: 2,
    });

    const res = await fetchOpenMeteo(`${config.OPEN_METEO_BASE}/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json();
    data.hourly.source = 'open-meteo';
    cache.set(cacheKey, data.hourly, 15 * 60 * 1000);
    logger.info('Hourly forecast served by open-meteo', { lat, lon });
    return data.hourly;
  } catch (err) {
    logger.warn('Open-Meteo hourly failed, trying OpenWeatherMap fallback', { lat, lon, error: err.message });
  }

  // Fallback to OpenWeatherMap
  try {
    const owm = await getHourlyForecastOWM(lat, lon);
    if (owm) {
      cache.set(cacheKey, owm, 15 * 60 * 1000);
      logger.info('Hourly forecast served by openweathermap', { lat, lon });
      return owm;
    }
  } catch (err) {
    logger.warn('OpenWeatherMap hourly also failed', { lat, lon, error: err.message });
  }

  throw new Error('All hourly forecast providers failed');
}

module.exports = {
  getCurrentWeather,
  getDailyForecast,
  getHourlyForecast,
};
