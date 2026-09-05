const { fetchWithRetry } = require('../utils/fetcher');
const config = require('../config/env');





function buildWeatherContext(intent, locationName, weather) {
  if (intent === 'forecast') {
    const lines = weather.daily.time.map((date, i) => {
      const precip = weather.daily.precipitation_sum[i];
      const precipText = precip != null ? `, rain ${precip}mm` : '';
      return `${date}: ${weather.daily.temperature_2m_min[i]}–${weather.daily.temperature_2m_max[i]}°C${precipText}`;
    });
    return `7-day forecast for ${locationName}:\n${lines.join('\n')}`;
  }
  if (intent === 'alerts') {
    const bad = weather.hourly.time.filter((_, i) => {
      const code = weather.hourly.weather_code[i];
      const precip = weather.hourly.precipitation[i] || 0;
      return code >= 95 || precip > 10;
    });
    if (!bad.length) return `No extreme weather alerts in the next 24h for ${locationName}.`;
    return `Alert for ${locationName}: ${bad.length} hour(s) with thunderstorms or heavy rain in the next 24h.`;
  }
  const c = weather.current;
  return `${locationName}: temp ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C), humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h.`;
}

async function generateReply({ userMessage, intent, locationName, weather, targetLanguage = 'en' }) {
  if (!config.OPENAI_API_KEY) return null; // caller should fallback

  const context = buildWeatherContext(intent, locationName, weather);
  const systemPrompt = targetLanguage === 'en'
    ? 'You are WeatherGPT, a concise weather assistant for India. Reply in 1-2 sentences max. Include the key numbers and any warnings.'
    : `You are WeatherGPT, a concise weather assistant for India. Reply in ${targetLanguage} in 1-2 sentences max. Use simple local terms. Include the key numbers and any warnings.`;

  const res = await fetchWithRetry(`${config.OPENAI_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User asked: "${userMessage}"\n\nWeather data:\n${context}\n\nReply to the user's question using this data.` },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LLM error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

const langNameMap = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', bn: 'Bengali',
  te: 'Telugu', mr: 'Marathi', gu: 'Gujarati',
};

function targetLanguageFromCode(code) {
  // Accept plain codes ('hi', 'en') as well as region-suffixed ('hi-IN')
  const match = String(code || '').match(/^[a-z]{2}\b/i);
  if (!match) return 'en';
  const l = match[0].toLowerCase();
  return langNameMap[l] ? l : 'en';
}

module.exports = {
  generateReply,
  targetLanguageFromCode,
  buildWeatherContext,
};