import { useEffect } from 'react'
import { mapWeatherCodeToState } from '../lib/weather'

export default function SkyBackground({ weatherCode }) {
  useEffect(() => {
    let state = mapWeatherCodeToState(weatherCode)
    const h = new Date().getHours()
    if (state === 'clear-day' && (h >= 19 || h < 6)) state = 'clear-night'
    document.body.className = `state-${state}`
  }, [weatherCode])

  useEffect(() => {
    const container = document.getElementById('particles')
    if (!container) return
    container.innerHTML = ''
    const state = mapWeatherCodeToState(weatherCode)
    if (state === 'rain' || state === 'storm') {
      for (let i = 0; i < 50; i++) {
        const p = document.createElement('div')
        p.className = 'particle-rain'
        p.style.left = Math.random() * 100 + 'vw'
        p.style.animationDuration = 0.5 + Math.random() * 0.3 + 's'
        p.style.animationDelay = Math.random() * 2 + 's'
        container.appendChild(p)
      }
    } else if (state === 'snow') {
      for (let i = 0; i < 40; i++) {
        const p = document.createElement('div')
        p.className = 'particle-snow'
        p.style.left = Math.random() * 100 + 'vw'
        p.style.animationDuration = 2 + Math.random() * 2 + 's'
        p.style.animationDelay = Math.random() * 3 + 's'
        container.appendChild(p)
      }
    }
    return () => {
      container.innerHTML = ''
    }
  }, [weatherCode])

  return (
    <div id='sky-canvas'>
      <div id='celestial-body' />
      <div id='cloud-1' className='cloud-layer' />
      <div id='cloud-2' className='cloud-layer' />
      <div id='particles' />
    </div>
  )
}
