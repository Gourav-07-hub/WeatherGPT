const express = require('express');
const router = express.Router();
const { geocode } = require('../services/geocodeService');
const { detectIntent, extractLocation } = require('../services/intentService');
const { getCurrentWeather, getDailyForecast, getHourlyForecast } = require('../services/weatherService');
const { describe } = require('../utils/weatherCodes');
const { generateReply, targetLanguageFromCode, buildWeatherContext } = require('../services/llmService');
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
  const locationQuery = extractLocation(message);
  
  const location = await geocode(locationQuery, req.query.debug === 'true');
  if (!location) {
    return res.json({ reply: `I couldn't find a location matching "${message}". Please try with a city name.` });
  }

  let weather;
  if (intent === 'forecast') {
    weather = { daily: await getDailyForecast(location.lat, location.lon, req.query.debug === 'true') };
  } else if (intent === 'alerts') {
    weather = { hourly: await getHourlyForecast(location.lat, location.lon, req.query.debug === 'true') };
  } else {
    weather = { current: await getCurrentWeather(location.lat, location.lon, req.query.debug === 'true') };
  }

  const targetLang = targetLanguageFromCode(lang || req.headers['accept-language']);
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
