export function mapWeatherCodeToState(code) {
  if (code <= 1) return 'clear-day'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'cloudy'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

export function getWeatherIcon(code) {
  if (code <= 1) return '☀️'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code >= 51 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 82) return '❄️'
  if (code >= 95) return '⛈️'
  return '☁️'
}

export function describeWeather(code) {
  if (code <= 1) return 'Clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Cloudy'
  if (code >= 51 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 82) return 'Snow'
  if (code >= 95) return 'Storm'
  return 'Cloudy'
}

export function formatTemp(celsius, isF) {
  const value = isF ? (celsius * 9) / 5 + 32 : celsius
  return `${Math.round(value)}°`
}

export function formatDegree(celsius, isF) {
  const value = isF ? (celsius * 9) / 5 + 32 : celsius
  return Math.round(value)
}
