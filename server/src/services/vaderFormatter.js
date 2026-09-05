/**
 * Vader-style response formatter — ported from Vader's TypeScript build logic.
 * Produces rich markdown briefing output from WeatherGPT's weather data.
 */

function n(v, unit = '') {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return `${v}${unit}`;
  return `${v.toFixed(1)}${unit}`;
}

function windDir(deg) {
  if (deg === null || deg === undefined) return '';
  const d = Number(deg);
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return `${dirs[Math.round(d / 45) % 8]}`;
}

function windDirFull(deg) {
  if (deg === null || deg === undefined) return 'N/A';
  const d = Number(deg);
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return `${d}° (${dirs[Math.round(d / 45) % 8]})`;
}

const WMO_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function codeLabel(v) {
  if (v === null || v === undefined) return 'Unknown';
  if (typeof v === 'number') return WMO_LABELS[v] || `Code ${v}`;
  return String(v);
}

function weatherSummary(weather) {
  const c = weather.current || {};
  const temp = c.temperature_2m;
  const feels = c.apparent_temperature;
  const condition = codeLabel(c.weather_code);
  const humidity = c.relative_humidity_2m;
  const wind = c.wind_speed_10m;

  const parts = [];
  parts.push(`${condition} at **${n(temp, '°C')}**`);
  if (feels !== null && temp !== null && Math.abs(Number(feels) - Number(temp)) > 3) {
    parts.push(`(feels like ${n(feels, '°C')})`);
  }
  if (humidity !== null) parts.push(`humidity ${n(humidity, '%')}`);
  if (wind !== null) parts.push(`wind ${n(wind, ' km/h')}`);

  return parts.join(' · ');
}

function weatherNarrative(weather, areaName) {
  const c = weather.current || {};
  const lines = [];

  lines.push(`### Weather intelligence narrative — ${areaName}`);
  lines.push('');

  lines.push(
    `**Current conditions:** ${codeLabel(c.weather_code)} with air temperature **${n(c.temperature_2m, '°C')}** (feels like **${n(c.apparent_temperature, '°C')}**). Relative humidity is **${n(c.relative_humidity_2m, '%')}**, dew point **${n(c.dew_point_2m, '°C')}**.`
  );

  lines.push(
    `**Precipitation now:** ${n(c.precipitation, ' mm')} total (rain ${n(c.rain, ' mm')}, showers ${n(c.showers, ' mm')}). Visibility **${n(c.visibility, ' m')}**.`
  );

  lines.push(
    `**Wind:** ${n(c.wind_speed_10m, ' km/h')} at 10 m, direction ${windDirFull(c.wind_direction_10m)}, gusts up to **${n(c.wind_gusts_10m, ' km/h')}**. Upper-level wind (80 m): **${n(c.wind_speed_80m, ' km/h')}**.`
  );

  lines.push(
    `**Atmospheric pressure:** surface **${n(c.surface_pressure, ' hPa')}**, MSL **${n(c.pressure_msl, ' hPa')}**. UV index **${n(c.uv_index)}**, shortwave radiation **${n(c.shortwave_radiation, ' W/m²')}**.`
  );

  lines.push(
    `**Cloud cover:** total **${n(c.cloud_cover, '%')}** (low ${n(c.cloud_cover_low, '%')}, mid ${n(c.cloud_cover_mid, '%')}, high ${n(c.cloud_cover_high, '%')}).`
  );

  lines.push(
    `**Flood/landslide indicators:** CAPE **${n(c.cape, ' J/kg')}** (thunderstorm fuel), soil moisture surface **${n(c.soil_moisture_0_to_1cm, ' m³/m³')}**, subsurface (3-9 cm) **${n(c.soil_moisture_3_to_9cm, ' m³/m³')}**, soil temp **${n(c.soil_temperature_0cm, '°C')}**, evapotranspiration **${n(c.evapotranspiration, ' mm')}**.`
  );

  // 7-day table
  lines.push('');
  lines.push('**7-day outlook:**');
  lines.push('| Date | Condition | Temp (°C) | Rain (mm) | Rain % | Max wind | Gusts |');
  lines.push('|------|-----------|-------------|-----------|--------|----------|-------|');
  if (weather.daily && weather.daily.length) {
    for (const day of weather.daily.slice(0, 7)) {
      lines.push(
        `| ${day.date || ''} | ${codeLabel(day.weather_code)} | ${n(day.temperature_2m_min)}–${n(day.temperature_2m_max)} | ${n(day.precipitation_sum)} | ${n(day.precipitation_probability_max, '%')} | ${n(day.wind_speed_10m_max)} | ${n(day.wind_gusts_10m_max)} |`
      );
    }
  }

  // Next 24h (every 3h)
  lines.push('');
  lines.push('**Next 24 hours (every 3h):**');
  lines.push('| Time | Temp | Rain (mm) | Wind | Gusts | Condition |');
  lines.push('|------|------|-----------|------|-------|-----------|');
  if (weather.hourlyLast24 && weather.hourlyLast24.length) {
    const hourly3h = weather.hourlyLast24.filter((_, i) => i % 3 === 0).slice(0, 8);
    for (const h of hourly3h) {
      const time = String(h.time || '').replace('T', ' ');
      lines.push(
        `| ${time} | ${n(h.temperature_2m, '°C')} | ${n(h.precipitation)} | ${n(h.wind_speed_10m)} | ${n(h.wind_gusts_10m)} | ${codeLabel(h.weather_code)} |`
      );
    }
  }

  return lines.join('\n');
}

function buildVaderReply(weather, areaName) {
  const hazardFlags = weather.hazardFlags || [];

  const lines = [];

  // Risk level
  let riskLevel = 'Low';
  if (hazardFlags.length >= 3) riskLevel = 'Extreme';
  else if (hazardFlags.length === 2) riskLevel = 'High';
  else if (hazardFlags.length === 1) riskLevel = 'Moderate';

  lines.push(`🚨 **Vader Intelligence Report**`);
  lines.push('');
  lines.push(`📍 **${areaName}**`);
  lines.push(`Risk Level: **${riskLevel}**`);
  lines.push('');

  if (weather.success) {
    // Summary line
    lines.push(`🌤 **Weather:** ${weatherSummary(weather)}`);
    lines.push('');

    if (hazardFlags.length > 0) {
      lines.push(`⚠️ **Hazard flags:** ${hazardFlags.join('; ')}`);
      lines.push('');
    }

    // Full weather narrative
    lines.push(weatherNarrative(weather, areaName));
    lines.push('');

    lines.push('_Data from Open-Meteo, marine-api.open-meteo.com._');
  } else {
    lines.push('Weather data currently unavailable for this area.');
  }

  return {
    reply: lines.join('\n'),
    riskLevel,
    hazardFlags,
  };
}

/**
 * Check if a message looks like a Vader-style briefing/disaster-intelligence request.
 */
function isVaderBriefingQuery(text) {
  const t = text.toLowerCase();
  return /\b(briefing|brief|disaster|situation|intelligence|roads?|traffic|navic|geospatial|ground report|live report|full report|alert|warning|cyclone|flood|landslide|evacuat|rescue|disaster news|access|satellite|bhuvan|incois|imd|ndma)\b/.test(
    t
  );
}

module.exports = {
  buildVaderReply,
  isVaderBriefingQuery,
  codeLabel,
  windDir,
};
