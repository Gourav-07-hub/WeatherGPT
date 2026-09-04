import { useState, useEffect, useRef } from 'react'
import { fetchClimate } from '../lib/api'

function buildChartPath(daily) {
  if (!daily || !daily.time || daily.time.length < 2) return null

  const maxT = Math.max(...daily.temperature_2m_max)
  const minT = Math.min(...daily.temperature_2m_min)
  const range = maxT - minT || 1
  const w = 400
  const h = 200
  const step = w / (daily.time.length - 1)

  let maxPath = 'M'
  let minPath = 'M'
  daily.time.forEach((t, i) => {
    const x = i * step
    const yMax = h - ((daily.temperature_2m_max[i] - minT) / range) * h
    const yMin = h - ((daily.temperature_2m_min[i] - minT) / range) * h
    maxPath += x + ',' + yMax + ' L'
    minPath += x + ',' + yMin + ' L'
  })
  maxPath = maxPath.slice(0, -2)
  minPath = minPath.slice(0, -2)

  return { maxPath, minPath }
}

export default function ClimateDrawer({ open, onClose, currentLat, currentLon }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [animate, setAnimate] = useState(false)
  const prevOpen = useRef(false)

  useEffect(() => {
    if (open && currentLat != null && currentLon != null) {
      setError(false)
      setData(null)
      setAnimate(false)
      fetchClimate(currentLat, currentLon, 30)
        .then((d) => {
          setData(d)
          requestAnimationFrame(() => setAnimate(true))
        })
        .catch(() => setError(true))
    }
    if (!open && prevOpen.current) {
      setAnimate(false)
    }
    prevOpen.current = open
  }, [open, currentLat, currentLon])

  const paths = buildChartPath(data?.daily)

  return (
    <div className={`drawer glass${open ? ' open' : ''}`} id='drawer-chart'>
      <button className='drawer-close' onClick={onClose}>×</button>
      <h3>30-Day Climate</h3>
      <div className={`chart-container${animate ? ' animate' : ''}`}>
        {error && <p>Failed to load chart</p>}
        {paths && (
          <svg viewBox='0 0 400 200' preserveAspectRatio='none'>
            <path d={paths.maxPath} fill='none' stroke='var(--danger)' strokeWidth='2' style={{ '--path-length': 1200 }} />
            <path d={paths.minPath} fill='none' stroke='var(--accent)' strokeWidth='2' style={{ '--path-length': 1200 }} />
          </svg>
        )}
      </div>
    </div>
  )
}
