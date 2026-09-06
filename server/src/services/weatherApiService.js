const { fetchWithRetry } = require('../utils/fetcher');
const logger = require('../utils/logger');

const WEATHERAPI_BASE = process.env.WEATHERAPI_BASE || 'https://api.weatherapi.com/v1';
const WEATHERAPI_KEY = process.env.WEATHERAPI_API_KEY || '';
const waLimiter = { acquire: () => true };

async function getCurrentWeatherWA(lat, lon) {
  if (!WEATHERAPI_KEY) return null;
  const url = `${WEATHERAPI_BASE}/current.json?key=${encodeURIComponent(WEATHERAPI_KEY)}&q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
  let res;
  try {
    res = await fetchWithRetry(url, {}, waLimiter);
  } catch (err) {
    if (err.status === 429) logger.warn('WeatherAPI rate-limited', { lat, lon });
    throw err;
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return null;
    throw new Error(`WeatherAPI error: ${res.status}`);
  }
  const data = await res.json();
  const c = data.current || {};
  return {
    temperature_2m: c.temp_c,
    apparent_temperature: c.feelslike_c,
    relative_humidity_2m: c.humidity,
    weather_code: mapConditionToCode(c.condition?.text),
    wind_speed_10m: c.wind_kph ? c.wind_kph : undefined,
    wind_direction_10m: c.wind_degree,
    source: 'weatherapi',
  };
}

async function getDailyForecastWA(lat, lon, days = 7) {
  if (!WEATHERAPI_KEY) return null;
  const url = `${WEATHERAPI_BASE}/forecast.json?key=${encodeURIComponent(WEATHERAPI_KEY)}&q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}&days=${encodeURIComponent(String(days))}`;
  let res;
  try {
    res = await fetchWithRetry(url, {}, waLimiter);
  } catch (err) {
    if (err.status === 429) logger.warn('WeatherAPI forecast rate-limited', { lat, lon });
    throw err;
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return null;
    throw new Error(`WeatherAPI error: ${res.status}`);
  }
  const data = await res.json();
  const daysArr = data.forecast?.forecastday || [];
  return {
    time: daysArr.map(d => d.date),
    weather_code: daysArr.map(d => mapConditionToCode(d.day?.condition?.text)),
    temperature_2m_max: daysArr.map(d => d.day?.maxtemp_c),
    temperature_2m_min: daysArr.map(d => d.day?.mintemp_c),
    precipitation_sum: daysArr.map(d => d.day?.totalprecip_mm),
    wind_speed_10m_max: daysArr.map(d => d.day?.maxwind_kph ? d.day.maxwind_kph : undefined),
  };
}

function mapConditionToCode(text) {
  if (!text) return 0;
  const t = text.toLowerCase();
  if (t.includes('sunny') || t.includes('clear')) return 0;
  if (t.includes('partly cloudy')) return 2;
  if (t.includes('cloudy') || t.includes('overcast')) return 3;
  if (t.includes('mist') || t.includes('fog') || t.includes('haze')) return 45;
  if (t.includes('rain') || t.includes('drizzle')) return 61;
  if (t.includes('sleet') || t.includes('freezing rain')) return 71;
  if (t.includes('snow') || t.includes('blizzard')) return 73;
  if (t.includes('thunder') || t.includes('storm')) return 95;
  return 0;
}

module.exports = {
  getCurrentWeatherWA,
  getDailyForecastWA,
};
