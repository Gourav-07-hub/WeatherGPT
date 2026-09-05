const express = require('express');
const router = express.Router();
const { geocode } = require('../services/geocodeService');
const { detectIntent, extractLocation } = require('../services/intentService');
const { getCurrentWeather, getDailyForecast, getHourlyForecast } = require('../services/weatherService');
const { describe } = require('../utils/weatherCodes');
const { generateReply, targetLanguageFromCode } = require('../services/llmService');
const { buildVaderReply, isVaderBriefingQuery } = require('../services/vaderFormatter');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

function buildNLResponse(intent, locationName, weather) {
  if (intent === 'forecast') {
    const { daily } = weather;
    const lines = daily.time.map((date, i) => {
      const w = describe(daily.weather_code[i]);
      return `${date}: ${w.label}, ${daily.temperature_2m_min[i]}–${daily.temperature_2m_max[i]}°C`;
    });
    return `7-day forecast for ${locationName}:\n${lines.join('\n')}`;
  }
  if (intent === 'alerts') {
    const { hourly } = weather;
    const bad = hourly.time.filter((_, i) => {
      const code = hourly.weather_code[i];
      const precip = hourly.precipitation[i] || 0;
      return code >= 95 || precip > 10;
    });
    if (!bad.length) return `No extreme weather alerts in the next 24h for ${locationName}.`;
    return `Alert for ${locationName}: ${bad.length} hour(s) with thunderstorms or heavy rain in the next 24h.`;
  }
  const c = weather.current;
  const w = describe(c.weather_code);
  return `${locationName}: ${w.icon} ${w.label}, ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C), humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h.`;
}

router.post('/', validate(validators.chat), asyncWrapper(async (req, res) => {
  const { message, lang } = req.body;
  const intent = detectIntent(message);
  const locationQuery = extractLocation(message) || 'Bhopal';

  const location = await geocode(locationQuery, req.query.debug === 'true');
  if (!location) {
    return res.json({ reply: `I couldn't find a location matching "${locationQuery}". Please try with a city name.` });
  }

  const targetLang = targetLanguageFromCode(lang || req.headers['accept-language']);

  // ── Vader-style response — uses WeatherGPT's own data, richer formatting ──
  if (isVaderBriefingQuery(message)) {
    try {
      const [current, daily] = await Promise.all([
        getCurrentWeather(location.lat, location.lon, req.query.debug === 'true'),
        getDailyForecast(location.lat, location.lon, 7, req.query.debug === 'true'),
      ]);

      // Compute hazard flags Vader-style
      const hazardFlags = [];
      const precip = current.precipitation ?? 0;
      const wind = current.wind_speed_10m ?? 0;
      const gust = current.wind_gusts_10m ?? 0;
      const cape = current.cape ?? 0;
      const soil = current.soil_moisture_0_to_1cm ?? 0;
      const codeRaw = typeof current.weather_code === 'number' ? current.weather_code : 0;

      if (precip >= 10) hazardFlags.push('Heavy precipitation now');
      if (wind >= 50) hazardFlags.push('High wind speed');
      if (gust >= 70) hazardFlags.push('Dangerous wind gusts');
      if (cape >= 1000) hazardFlags.push('High convective energy (thunderstorm risk)');
      if (soil >= 0.4) hazardFlags.push('Saturated soil (flood/landslide risk)');
      if ([65, 82, 95, 96, 99].includes(codeRaw)) hazardFlags.push('Severe weather condition active');

      const today = daily?.[0];
      if (today) {
        const rainSum = today.precipitation_sum ?? 0;
        const maxWind = today.wind_speed_10m_max ?? 0;
        if (rainSum >= 50) hazardFlags.push('Heavy rainfall expected in forecast period');
        if (maxWind >= 60) hazardFlags.push('Strong winds forecast');
      }

      const weather = {
        success: true,
        current,
        daily,
        hourlyLast24: [],
        hazardFlags,
        metricCount: Object.keys(current || {}).length,
        sources: ['open-meteo.com'],
      };

      const vader = buildVaderReply(weather, location.name);

      const llmIntro = await generateReply({
        userMessage: message,
        intent: 'current',
        locationName: location.name,
        weather: { current: { temperature_2m: 'N/A', apparent_temperature: 'N/A', relative_humidity_2m: 'N/A', wind_speed_10m: 'N/A', weather_code: 'N/A' } },
        targetLanguage: targetLang,
      }).catch(() => null);

      return res.json({
        reply: llmIntro || vader.reply,
        replyMode: 'vader',
        intent: 'vader-briefing',
        location: location.name,
        lat: location.lat,
        lon: location.lon,
        briefing: vader.reply,
        summary: vader.reply,
        sections: { weather: vader.reply },
        riskLevel: vader.riskLevel,
        area: { name: location.name, latitude: location.lat, longitude: location.lon },
        stats: { weatherMetrics: weather.metricCount, hazardFlags: vader.hazardFlags },
        moreAvailable: false,
      });
    } catch (err) {
      console.error('Vader formatter failed, falling back to weather:', err.message);
    }
  }

  // ── Standard WeatherGPT path ───────────────────────────────────────────
  let weather;
  if (intent === 'forecast') {
    weather = { daily: await getDailyForecast(location.lat, location.lon, 7, req.query.debug === 'true') };
  } else if (intent === 'alerts') {
    weather = { hourly: await getHourlyForecast(location.lat, location.lon, req.query.debug === 'true') };
  } else {
    weather = { current: await getCurrentWeather(location.lat, location.lon, req.query.debug === 'true') };
  }

  let reply;
  let replyMode = 'rule';

  const llm = await generateReply({
    userMessage: message,
    intent,
    locationName: location.name,
    weather,
    targetLanguage: targetLang,
  }).catch(() => null);

  if (llm) {
    reply = llm;
    replyMode = 'llm';
  } else {
    reply = buildNLResponse(intent, location.name, weather);
  }

  res.json({ reply, intent, location: location.name, lat: location.lat, lon: location.lon, weather, replyMode });
}));

module.exports = router;
