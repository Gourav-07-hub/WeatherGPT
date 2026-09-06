import { formatDegree, getWeatherIcon, describeWeather, formatSunTime } from '../lib/weather'

export default function Hero({ weather, daily, isLoading, isF }) {
  if (!weather) {
    return (
      <div className='hero'>
        <div className='readout'>
          <div className='temp-big mono skeleton'>--°</div>
          <div className='cond-text skeleton'>loading sky</div>
          <div className='feels-like skeleton'>...</div>
        </div>
      </div>
    )
  }

  const c = weather.current
  const isDay = c.is_day !== undefined
    ? c.is_day === 1
    : (c.time ? (parseInt(c.time.substring(11, 13), 10) >= 6 && parseInt(c.time.substring(11, 13), 10) < 19) : (new Date().getHours() >= 6 && new Date().getHours() < 19))
  const key = `${c.temperature_2m}-${c.weather_code}-${isDay ? 'd' : 'n'}`
  const sunrise = daily?.sunrise?.[0]
  const sunset = daily?.sunset?.[0]

  return (
      <div className={`hero${isLoading ? ' is-refreshing' : ''}`}>
        <div className='readout'>
          <div className='temp-big mono hero-crossfade' key={`temp-${key}`}>
            {formatDegree(c.temperature_2m, isF)}°
          </div>
          <div className='cond-text hero-crossfade' key={`cond-${key}`} style={{ animationDelay: '0.05s' }}>
            {getWeatherIcon(c.weather_code, isDay)} {describeWeather(c.weather_code)}
          </div>
          <div className='feels-like hero-crossfade' key={`meta-${key}`} style={{ animationDelay: '0.1s' }}>
            feels like {formatDegree(c.apparent_temperature, isF)}° · humidity {c.relative_humidity_2m}% · wind {c.wind_speed_10m} km/h
          </div>
          {sunrise && sunset && (
            <div className='sun-times hero-crossfade' key={`sun-${key}`} style={{ animationDelay: '0.15s' }}>
              🌅 Sunrise {formatSunTime(sunrise)} · 🌇 Sunset {formatSunTime(sunset)}
            </div>
          )}
        </div>
      </div>
  )
}
