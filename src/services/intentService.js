/**
 * Simple intent + entity extractor for WeatherGPT.
 * Designed to be replaced/augmented later with an LLM.
 */

function detectIntent(text) {
  const t = text.toLowerCase();

  // Alerts / extreme weather
  if (/\b(alerts?|warning|extreme|cyclone|storm|flood|heavy rain|heatwave|thunder|disaster)\b/.test(t)) {
    return 'alerts';
  }

  // Forecast / upcoming
  if (/\b(tomorrow|forecast|week|next \d| upcoming|future|next few days)\b/.test(t)) {
    return 'forecast';
  }

  // Current
  if (/\b(current|now|today|present)\b/.test(t)) {
    return 'current';
  }

  // Climate / history
  if (/\b(history|historical|climate|average|normal|trend|past|last year)\b/.test(t)) {
    return 'climate';
  }

  // Default: treat as current weather
  return 'current';
}

function extractLocation(text) {
  const t = text.toLowerCase().replace(/[?.,]/g, '').trim();

  // strip leading weather-intent phrases
  let s = t.replace(
    /^(what('s| is) the )?(weather|temperature|forecast|climate|rain|alerts?|warning|trend)s?\s*(in|at|for)?\s*/i,
    ''
  );

  // strip trailing time words
  s = s.replace(
    /\b(tomorrow|today|now|next\s+\w+|this\s+\w+|week|month|year|afternoon|morning|evening|night)\b.*$/i,
    ''
  ).trim();

  const parts = s.split(/\s+/);
  const preps = ['in', 'at', 'for', 'of', 'on'];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (preps.includes(parts[i]) && i < parts.length - 1) {
      return parts.slice(i + 1).join(' ');
    }
  }

  return s || parts.join(' ');
}

module.exports = { detectIntent, extractLocation };
