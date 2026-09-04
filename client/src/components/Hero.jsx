import { formatDegree, getWeatherIcon, describeWeather } from '../lib/weather'

export default function Hero({ weather, isLoading, isF }) {
  if (isLoading || !weather) {
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
  const key = `${c.temperature_2m}-${c.weather_code}`

  return (
      <div className='hero'>
        <div className='readout'>
          <div className='temp-big mono hero-crossfade' key={`temp-${key}`}>
            {formatDegree(c.temperature_2m, isF)}°
          </div>
          <div className='cond-text hero-crossfade' key={`cond-${key}`} style={{ animationDelay: '0.05s' }}>
            {getWeatherIcon(c.weather_code)} {describeWeather(c.weather_code)}
          </div>
          <div className='feels-like hero-crossfade' key={`meta-${key}`} style={{ animationDelay: '0.1s' }}>
            feels like {formatDegree(c.apparent_temperature, isF)}° · humidity {c.relative_humidity_2m}% · wind {c.wind_speed_10m} km/h
          </div>
        </div>
      </div>
  )
}
