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

function stripTimeWords(s) {
  return s.replace(
    /\b(tomorrow|today|now|tonight|next\s+\w+|this\s+\w+|week|weekend|month|year|afternoon|morning|evening|night)\b.*$/i,
    ''
  ).trim();
}

function extractLocation(text) {
  const t = text.toLowerCase().replace(/[?.,]/g, '').trim();

  // 1) Direct preposition match: "<phrase> in/at/for <location>"
  const prepMatch = t.match(/\b(?:in|at|for)\s+([a-z][a-z0-9 ]{0,40})$/i);
  if (prepMatch) {
    const loc = stripTimeWords(prepMatch[1]).trim();
    if (loc && !/^(the|my|this|next)\b/i.test(loc)) {
      return loc;
    }
  }

  // 2) Strip leading weather-intent phrasing
  let s = t.replace(
    /^(what('s| is| are)? the )?(weather|temperature|forecast|climate|condition|rain|raining|alerts?|warning|warnings|show me|report|trend)s?\s*(in|at|for)?\s*/i,
    ''
  );

  // 3) Strip trailing time/filler words
  s = stripTimeWords(s);

  // 4) Remove remaining generic question wrappers -> no location
  if (/^(any|will|would|is|are|does|do|can|should|how|what|tell|give)\b.*$/i.test(s)) {
    return '';
  }

  // 5) Pure weather keywords left (no real location) -> default location
  const fillerWords = /^(weather|forecast|climate|trend|trends|alerts?|warning|warnings|rain|raining|temperature|report|condition)s?$/i;
  if (s && s.split(/\s+/).every((w) => fillerWords.test(w))) {
    return '';
  }

  return s || '';
}

module.exports = { detectIntent, extractLocation };
