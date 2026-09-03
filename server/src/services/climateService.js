const { fetchOpenMeteo } = require('../utils/fetcher');
const config = require('../config/env');



/**
 * Fetch historical daily data for the past N days
 */
async function getHistoricalDaily(lat, lon, pastDays = 30) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
    ].join(','),
    timezone: 'auto',
    past_days: String(pastDays),
    forecast_days: '0',
  });

  const res = await fetchOpenMeteo(`${config.OPEN_METEO_BASE}/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  return data.daily;
}

module.exports = { getHistoricalDaily };
