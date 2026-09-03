const fetch = require('node-fetch');

const OPENWEATHERMAP_BASE = process.env.OPENWEATHERMAP_BASE || 'https://api.openweathermap.org';
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY || '';

async function getCurrentWeatherOWM(lat, lon) {
  if (!OPENWEATHERMAP_API_KEY) return null;
  const url = `${OPENWEATHERMAP_BASE}/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(OPENWEATHERMAP_API_KEY)}&units=metric`;
  const res = await fetch(url);
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
    wind_speed_10m: data.wind?.speed,
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

module.exports = { getCurrentWeatherOWM };
