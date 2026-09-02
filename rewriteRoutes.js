const fs = require('fs');

const weatherJs = `const express = require('express');
const router = express.Router();
const { getCurrentWeather } = require('../services/weatherService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/nearby', validate(validators.latLonQuery), asyncWrapper(async (req, res) => {
  const { lat, lon } = req.query;
  const current = await getCurrentWeather(Number(lat), Number(lon), req.query.debug === 'true');
  res.json({ current, lat: Number(lat), lon: Number(lon) });
}));

module.exports = router;
`;

const geocodeJs = `const express = require('express');
const router = express.Router();
const { geocode } = require('../services/geocodeService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', validate(validators.qQuery), asyncWrapper(async (req, res) => {
  const result = await geocode(req.query.q, req.query.debug === 'true');
  if (!result) {
    return res.status(404).json({ error: 'Location not found' });
  }
  res.json(result);
}));

module.exports = router;
`;

const climateJs = `const express = require('express');
const router = express.Router();
const { getHistoricalDaily } = require('../services/climateService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', validate(validators.latLonQuery), validate(validators.daysQuery), asyncWrapper(async (req, res) => {
  const { lat, lon, days } = req.query;
  const pastDays = days ? Number(days) : 30;
  const daily = await getHistoricalDaily(Number(lat), Number(lon), pastDays);
  res.json({ lat: Number(lat), lon: Number(lon), pastDays, daily });
}));

module.exports = router;
`;

const alertsJs = `const express = require('express');
const router = express.Router();
const { checkAlertsForLocation } = require('../services/alertService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', validate(validators.latLonQuery), asyncWrapper(async (req, res) => {
  const { lat, lon } = req.query;
  const alerts = await checkAlertsForLocation(Number(lat), Number(lon));
  res.json({ alerts, count: alerts.length });
}));

module.exports = router;
`;

const subscribeJs = `const express = require('express');
const router = express.Router();
const { addSubscription, removeSubscription, listSubscriptions, checkAllSubscriptions } = require('../services/alertSubscriptionService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', (req, res) => {
  res.json({ subscriptions: listSubscriptions() });
});

router.post('/', validate(validators.latLonBody), (req, res) => {
  const { name, lat, lon } = req.body;
  const sub = addSubscription({ name, lat, lon });
  res.status(201).json({ subscription: sub });
});

router.delete('/:id', (req, res) => {
  const removed = removeSubscription(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json({ removed });
});

router.get('/check', asyncWrapper(async (req, res) => {
  const results = await checkAllSubscriptions();
  res.json({ checks: results });
}));

module.exports = router;
`;

const chatJs = `const express = require('express');
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
      return \`\${date}: \${w.label}, \${daily.temperature_2m_min[i]}–\${daily.temperature_2m_max[i]}°C\`;
    });
    return \`7-day forecast for \${locationName}:\\n\${lines.join('\\n')}\`;
  }
  if (intent === 'alerts') {
    const { hourly } = weather;
    const bad = hourly.time.filter((_, i) => {
      const code = hourly.weather_code[i];
      const precip = hourly.precipitation[i] || 0;
      return code >= 95 || precip > 10;
    });
    if (!bad.length) return \`No extreme weather alerts in the next 24h for \${locationName}.\`;
    return \`Alert for \${locationName}: \${bad.length} hour(s) with thunderstorms or heavy rain in the next 24h.\`;
  }
  const c = weather.current;
  const w = describe(c.weather_code);
  return \`\${locationName}: \${w.icon} \${w.label}, \${c.temperature_2m}°C (feels like \${c.apparent_temperature}°C), humidity \${c.relative_humidity_2m}%, wind \${c.wind_speed_10m} km/h.\`;
}

router.post('/', validate(validators.chat), asyncWrapper(async (req, res) => {
  const { message, lang } = req.body;
  const intent = detectIntent(message);
  const locationQuery = extractLocation(message);
  
  const location = await geocode(locationQuery, req.query.debug === 'true');
  if (!location) {
    return res.json({ reply: \`I couldn't find a location matching "\${message}". Please try with a city name.\` });
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
`;

const streamJs = `const express = require('express');
const router = express.Router();
const { subscriptions } = require('../services/alertSubscriptionService');
const asyncWrapper = require('../middleware/asyncWrapper');

router.get('/', asyncWrapper(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('data: {"status":"connected"}\\n\\n');

  const interval = setInterval(() => {
    const alerts = [];
    for (const sub of subscriptions) {
      if (sub.lastAlerts && sub.lastAlerts.length > 0) {
        alerts.push({ location: sub.name, alerts: sub.lastAlerts });
      }
    }
    if (alerts.length > 0) {
      res.write(\`data: \${JSON.stringify({ type: 'alerts', alerts })}\\n\\n\`);
    } else {
      res.write('data: {"status":"ping"}\\n\\n');
    }
  }, 10000);

  req.on('close', () => clearInterval(interval));
}));

module.exports = router;
`;

fs.writeFileSync('src/routes/weather.js', weatherJs);
fs.writeFileSync('src/routes/geocode.js', geocodeJs);
fs.writeFileSync('src/routes/climate.js', climateJs);
fs.writeFileSync('src/routes/alerts.js', alertsJs);
fs.writeFileSync('src/routes/subscribe.js', subscribeJs);
fs.writeFileSync('src/routes/chat.js', chatJs);
fs.writeFileSync('src/routes/stream.js', streamJs);

console.log('Routes rewritten');
