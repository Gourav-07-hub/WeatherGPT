const { getHourlyForecast } = require('./weatherService');

function detectAlerts(hourly) {
  if (!hourly || !hourly.time) return [];
  const alerts = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const code = hourly.weather_code[i];
    const precip = hourly.precipitation[i] || 0;
    const wind = hourly.wind_speed_10m[i] || 0;
    const time = hourly.time[i];

    if (code >= 95) alerts.push({ time, type: 'thunderstorm', severity: 'high', detail: `Thunderstorm at ${time}` });
    else if (code >= 80) alerts.push({ time, type: 'heavy_rain', severity: 'medium', detail: `Heavy rain showers at ${time}` });
    else if (precip > 10) alerts.push({ time, type: 'heavy_rain', severity: 'medium', detail: `Heavy rain expected at ${time}` });
    else if (wind > 50) alerts.push({ time, type: 'strong_wind', severity: 'medium', detail: `Strong winds at ${time}` });
  }
  return alerts;
}

async function checkAlertsForLocation(lat, lon) {
  try {
    const hourly = await getHourlyForecast(lat, lon);
    return detectAlerts(hourly);
  } catch (err) {
    console.error('alert check failed', err);
    return [];
  }
}

module.exports = { detectAlerts, checkAlertsForLocation };
