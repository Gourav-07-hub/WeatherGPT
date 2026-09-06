const express = require('express');
const router = express.Router();
const { geocode } = require('../services/geocodeService');
const { detectIntent, extractLocation } = require('../services/intentService');
const { getCurrentWeather, getDailyForecast, getHourlyForecast } = require('../services/weatherService');
const { describe } = require('../utils/weatherCodes');
const { generateReply, targetLanguageFromCode } = require('../services/llmService');
const { buildVaderReply } = require('../services/vaderFormatter');
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
  if (intent === 'sun') {
    const { daily } = weather;
    const sunrise = daily?.sunrise?.[0] ? daily.sunrise[0].substring(11, 16) : null;
    const sunset = daily?.sunset?.[0] ? daily.sunset[0].substring(11, 16) : null;
    if (sunrise && sunset) {
      return `For ${locationName}: 🌅 Sunrise is at ${sunrise}, and 🌇 sunset is at ${sunset}.`;
    }
    return `Sunrise and sunset times are currently not available for ${locationName}.`;
  }
  const c = weather.current;
  const w = describe(c.weather_code);
  return `${locationName}: ${w.icon} ${w.label}, ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C), humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h.`;
}

function normalizeDaily(daily) {
  if (!daily || !Array.isArray(daily.time)) return [];
  return daily.time.map((date, i) => ({
    date,
    weather_code: daily.weather_code?.[i],
    temperature_2m_min: daily.temperature_2m_min?.[i],
    temperature_2m_max: daily.temperature_2m_max?.[i],
    precipitation_sum: daily.precipitation_sum?.[i],
    precipitation_probability_max: daily.precipitation_probability_max?.[i],
    wind_speed_10m_max: daily.wind_speed_10m_max?.[i],
    wind_gusts_10m_max: daily.wind_gusts_10m_max?.[i],
  }));
}

function normalizeHourly(hourly) {
  if (!hourly || !Array.isArray(hourly.time)) return [];
  return hourly.time.map((time, i) => ({
    time,
    temperature_2m: hourly.temperature_2m?.[i],
    precipitation: hourly.precipitation?.[i],
    wind_speed_10m: hourly.wind_speed_10m?.[i],
    wind_gusts_10m: hourly.wind_gusts_10m?.[i],
    weather_code: hourly.weather_code?.[i],
  }));
}

function computeHazardFlags(current, daily) {
  const flags = [];
  const precip = current.precipitation ?? 0;
  const wind = current.wind_speed_10m ?? 0;
  const gust = current.wind_gusts_10m ?? 0;
  const cape = current.cape ?? 0;
  const soil = current.soil_moisture_0_to_1cm ?? 0;
  const codeRaw = typeof current.weather_code === 'number' ? current.weather_code : 0;

  // Thresholds tuned for Indian monsoon — avoid flagging every city
  if (precip >= 15) flags.push('Heavy precipitation now');
  if (wind >= 50) flags.push('High wind speed');
  if (gust >= 70) flags.push('Dangerous wind gusts');
  if (cape >= 1500) flags.push('High convective energy (thunderstorm risk)');
  if (soil >= 0.45) flags.push('Saturated soil (flood/landslide risk)');
  if ([95, 96, 99].includes(codeRaw)) flags.push('Severe thunderstorm active');
  else if ([65, 82].includes(codeRaw) && precip >= 5) flags.push('Heavy rain active');

  const today = Array.isArray(daily) && daily[0] ? daily[0] : null;
  if (today) {
    const rainSum = today.precipitation_sum ?? 0;
    const maxWind = today.wind_speed_10m_max ?? 0;
    if (rainSum >= 75) flags.push('Heavy rainfall expected in forecast period');
    if (maxWind >= 60) flags.push('Strong winds forecast');
  }
  return flags;
}

async function buildVaderBriefing(location, message, targetLang, debug) {
  try {
    const [current, dailyRaw, hourlyRaw] = await Promise.all([
      getCurrentWeather(location.lat, location.lon, debug, true),
      getDailyForecast(location.lat, location.lon, 7, debug, true),
      getHourlyForecast(location.lat, location.lon, debug),
    ]);

    const daily = normalizeDaily(dailyRaw);
    const hourlyLast24 = normalizeHourly(hourlyRaw).slice(0, 24);
    const hazardFlags = computeHazardFlags(current || {}, daily);

    const weather = {
      success: true,
      current,
      daily,
      hourlyLast24,
      hazardFlags,
      metricCount: Object.keys(current || {}).length,
      sources: ['open-meteo.com'],
    };

    const vader = buildVaderReply(weather, location.name);

    const llmIntro = await generateReply({
      userMessage: message,
      intent: 'vader',
      locationName: location.name,
      weather: { current: current || {} },
      targetLanguage: targetLang,
    }).catch(() => null);

    const hazardText = vader.hazardFlags.length
      ? `Active hazards: ${vader.hazardFlags.join('; ')}.`
      : 'No active weather hazards right now.';

    return {
      reply: llmIntro || `${location.name} - Risk: ${vader.riskLevel}. ${hazardText} More details in the briefing below.`,
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
    };
  } catch (err) {
    console.error('Vader briefing failed, falling back to weather:', err.message);
    return null;
  }
}

router.post('/', validate(validators.chat), asyncWrapper(async (req, res) => {
  const { message, lang, location: clientLocation, mode: rawMode } = req.body;
  const mode = typeof rawMode === 'string' ? rawMode.toLowerCase().trim() : '';
  const intent = detectIntent(message);
  const locationQuery = extractLocation(message) || (clientLocation && typeof clientLocation === 'string' && clientLocation.trim()) || '';

  if (!locationQuery) {
    return res.json({ reply: 'Tell me a city — like "weather in Delhi" or push the location button to use where you are.' });
  }

  let location;
  try {
    location = await geocode(locationQuery, req.query.debug === 'true');
  } catch (err) {
    if (err.status === 429) {
      return res.json({ reply: 'Too many requests — please wait a second and try again.' });
    }
    throw err;
  }
  if (!location) {
    return res.json({ reply: `I couldn't find a location matching "${locationQuery}". Please try with a city name.` });
  }

  const targetLang = targetLanguageFromCode(lang || req.headers['accept-language']);

  // ── Vader as a chat type — no UI change, reuses same input/thread ──
  // Triggers when: explicit mode=vader, intent=vader, or plain city/current query.
  // Existing types (forecast/alerts/climate) continue to use the standard path
  // unless mode=vader is forced.
  const wantsVader = mode === 'vader' || intent === 'vader' || (mode !== 'weather' && intent === 'current');
  if (wantsVader) {
    const briefing = await buildVaderBriefing(location, message, targetLang, req.query.debug === 'true');
    if (briefing) return res.json(briefing);
    // if briefing fails, fall through to standard path
  }

  // ── Standard WeatherGPT path (fallback when the briefing cannot be built) ─
  let weather;
  try {
    if (intent === 'forecast' || intent === 'sun') {
      weather = { daily: await getDailyForecast(location.lat, location.lon, 7, req.query.debug === 'true') };
    } else if (intent === 'alerts') {
      weather = { hourly: await getHourlyForecast(location.lat, location.lon, req.query.debug === 'true') };
    } else {
      weather = { current: await getCurrentWeather(location.lat, location.lon, req.query.debug === 'true') };
    }
  } catch (err) {
    if (err.status === 429) {
      return res.json({ reply: 'Too many requests — please wait a second and try again.' });
    }
    throw err;
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
