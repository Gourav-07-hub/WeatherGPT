import { useState, useEffect } from 'react'
import { getWeatherIcon } from '../lib/weather'

export default function DailyForecast({ daily, isF }) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (daily && daily.time && daily.time.length > 0) {
      setAnimate(false)
      const t = requestAnimationFrame(() => setAnimate(true))
      return () => cancelAnimationFrame(t)
    }
  }, [daily])

  if (!daily || !daily.time || daily.time.length === 0) return null

  const allMins = daily.temperature_2m_min
  const allMaxs = daily.temperature_2m_max
  const absMin = Math.min(...allMins)
  const absMax = Math.max(...allMaxs)
  const range = absMax - absMin || 1

  const days = []
  for (let i = 0; i < daily.time.length; i++) {
    const [y, m, d] = daily.time[i].split('-').map(Number)
    const date = new Date(y, (m || 1) - 1, d || 1)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const lo = daily.temperature_2m_min[i]
    const hi = daily.temperature_2m_max[i]
    const sparkStart = ((lo - absMin) / range) * 100
    const sparkW = ((hi - lo) / range) * 100
    days.push({ day: dayName, icon: getWeatherIcon(daily.weather_code[i]), lo, hi, sparkStart, sparkW })
  }

  return (
    <>
      <div className='timeline-title'>7-day outlook</div>
      <div className={`daily-scroll${animate ? ' animate' : ''}`} tabIndex='0'>
        {days.map((d, i) => (
          <div className='day-strip' key={i}>
            <div className='day-name'>{d.day}</div>
            <div className='icon'>{d.icon}</div>
            <div className='lo mono'>{formatTemp(d.lo, isF)}</div>
            <div className='sparkline'>
              <div className='spark-fill' style={{ left: `${d.sparkStart}%`, width: `${d.sparkW}%` }} />
            </div>
            <div className='hi mono'>{formatTemp(d.hi, isF)}</div>
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
