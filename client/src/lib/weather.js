export function mapWeatherCodeToState(code) {
  if (code <= 1) return 'clear-day'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'cloudy'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

export function getWeatherIcon(code, isDay = true) {
  if (code <= 1) return isDay ? '☀️' : '🌙'
  if (code === 2) return isDay ? '⛅' : '☁️'
  if (code === 3) return '☁️'
  if (code >= 51 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 82) return '❄️'
  if (code >= 95) return '⛈️'
  return isDay ? '☀️' : '🌙'
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

export function formatSunTime(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return ''
  const timePart = isoStr.includes('T') ? isoStr.split('T')[1] : isoStr
  const [hStr, mStr] = timePart.substring(0, 5).split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return ''
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
