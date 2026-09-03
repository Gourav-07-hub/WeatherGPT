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
  return (
    <div className='hero'>
      <div className='readout'>
        <div className='temp-big mono'>{formatDegree(c.temperature_2m, isF)}°</div>
        <div className='cond-text'>
          {getWeatherIcon(c.weather_code)} {describeWeather(c.weather_code)}
        </div>
        <div className='feels-like'>feels like {formatDegree(c.apparent_temperature, isF)}° · humidity {c.relative_humidity_2m}% · wind {c.wind_speed_10m} km/h</div>
      </div>
    </div>
  )
}
