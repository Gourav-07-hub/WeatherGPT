import { useState, useEffect } from 'react'
import { getWeatherIcon } from '../lib/weather'

export default function HourlyForecast({ hourly, isF }) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (hourly && hourly.time && hourly.time.length > 0) {
      setAnimate(false)
      const t = requestAnimationFrame(() => setAnimate(true))
      return () => cancelAnimationFrame(t)
    }
  }, [hourly])

  if (!hourly || !hourly.time || hourly.time.length === 0) return null

  const now = new Date()
  now.setMinutes(0, 0, 0)
  const isoNow = now.toISOString().slice(0, 16)
  let startIndex = hourly.time.findIndex((t) => t >= isoNow)
  if (startIndex === -1) startIndex = 0

  const slices = []
  for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
    const timeStr = hourly.time[i]
    const hour = parseInt(timeStr.substring(11, 13), 10)
    const isDay = (hourly.is_day && hourly.is_day[i] !== undefined)
      ? hourly.is_day[i] === 1
      : (hour >= 6 && hour < 19)

    slices.push({
      time: timeStr.substring(11, 16),
      icon: getWeatherIcon(hourly.weather_code[i], isDay),
      temp: Math.round(hourly.temperature_2m[i]),
    })
  }

  return (
    <>
      <div className='timeline-title'>next 24 hours</div>
      <div className={`hourly-scroll${animate ? ' animate' : ''}`} tabIndex='0'>
        {slices.map((h, i) => (
          <div className='tick' key={i}>
            <div className='time mono'>{h.time}</div>
            <div className='icon'>{h.icon}</div>
            <div className='temp mono'>{formatTemp(h.temp, isF)}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function formatTemp(celsius, isF) {
  const value = isF ? (celsius * 9) / 5 + 32 : celsius
  return `${Math.round(value)}°`
}
