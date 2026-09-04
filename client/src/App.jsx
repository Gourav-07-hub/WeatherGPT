import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SkyBackground from './components/SkyBackground'
import Hero from './components/Hero'
import HourlyForecast from './components/HourlyForecast'
import DailyForecast from './components/DailyForecast'
import Chat from './components/Chat'
import AlertsDrawer from './components/AlertsDrawer'
import ClimateDrawer from './components/ClimateDrawer'
import { useAuth } from './context/AuthContext'
import { fetchWeather } from './lib/api'

const SUGGESTIONS = ['will it rain today?', 'show me climate trends', 'any extreme alerts?']

export default function App() {
  const { isAuthenticated, user, initialLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [weather, setWeather] = useState(null)
  const [hourly, setHourly] = useState(null)
  const [daily, setDaily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [currentLat, setCurrentLat] = useState(null)
  const [currentLon, setCurrentLon] = useState(null)
  const [currentName, setCurrentName] = useState('Bhopal')
  const [isF, setIsF] = useState(false)
  const [lang, setLang] = useState('en')
  const [input, setInput] = useState('')
  const [pendingSuggestion, setPendingSuggestion] = useState(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const chatInputRef = useRef(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (pendingSuggestion && chatInputRef.current) {
      const ref = chatInputRef
      const form = ref.current?.closest('form')
      if (form) form.requestSubmit()
      setPendingSuggestion(null)
    }
  }, [pendingSuggestion])

  const loadWeather = useCallback(async (query, isCoords = false) => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchWeather(query, isCoords)
      setWeather(data.current ? { current: data.current } : data)
      setHourly(data.hourly || null)
      setDaily(data.daily || null)
      setCurrentLat(data.lat != null ? data.lat : currentLat)
      setCurrentLon(data.lon != null ? data.lon : currentLon)
      if (data.name) setCurrentName(data.name)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [currentLat, currentLon])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    const attempt = async () => {
      if (navigator.geolocation) {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await loadWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, true)
                resolve()
              } catch (err) {
                reject(err)
              }
            },
            async () => {
              try {
                await loadWeather('Bhopal')
                resolve()
              } catch (err) {
                reject(err)
              }
            }
          )
        })
      } else {
        await loadWeather('Bhopal')
      }
    }

    const run = async () => {
      let attemptCount = 0
      const maxAttempts = 2
      while (attemptCount < maxAttempts) {
        try {
          await attempt()
          return
        } catch {
          attemptCount++
          if (attemptCount < maxAttempts) {
            await new Promise(r => setTimeout(r, 1500))
          }
        }
      }
    }

    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [loadWeather])

  useEffect(() => {
    if (window.visualViewport) {
      const handler = () => {
        document.body.style.height = window.visualViewport.height + 'px'
      }
      window.visualViewport.addEventListener('resize', handler)
      document.body.style.height = window.visualViewport.height + 'px'
      return () => window.visualViewport.removeEventListener('resize', handler)
    }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('wgpt_onboarded')) {
      setShowOnboarding(true)
      const t = setTimeout(() => setShowOnboarding(false), 8000)
      localStorage.setItem('wgpt_onboarded', '1')
      return () => clearTimeout(t)
    }
  }, [])

  const handleLocationChange = useCallback(
    (name) => {
      loadWeather(name)
    },
    [loadWeather]
  )

  const handleSuggestion = (suggestion) => {
    setInput(suggestion)
    setPendingSuggestion(suggestion)
    setShowOnboarding(false)
  }

  return (
    <>
      <SkyBackground weatherCode={weather?.current?.weather_code ?? 0} />
      <div className='app-container'>
        <header className='top-bar glass'>
          <Link to='/' className='brand'>WeatherGPT</Link>
          <div className='location-name'>{currentName}</div>
          <div className='controls'>
            <div className='utils'>
              <div className='utils-bar'>
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value='en'>EN</option>
                  <option value='hi'>HI</option>
                </select>
                <button type='button' onClick={() => setAlertsOpen(true)}>🔔 Alerts</button>
                <button type='button' onClick={() => setChartOpen(true)}>📈 Climate</button>
              </div>
            </div>
            <div className={`unit-toggle${isF ? ' is-f' : ''}`} onClick={() => setIsF((v) => !v)}>
              <div className='pill' />
              <span className={!isF ? 'active' : ''}>°C</span>
              <span className={isF ? 'active' : ''}>°F</span>
            </div>
            {!initialLoading &&
              (isAuthenticated ? (
                <div className='nav-auth'>
                  <span className='nav-auth-name'>{user?.name}</span>
                  <button
                    className='nav-auth-btn'
                    onClick={() => {
                      logout()
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link to='/auth' className='nav-auth-btn'>
                  Sign in
                </Link>
              ))}
          </div>
        </header>

        <Hero weather={weather} isLoading={loading} isF={isF} />

        <div className='content-below'>
          {isAuthenticated ? (
            <div className='prompt-bar glass'>
              <form id='chat-form'>
                <input
                  ref={chatInputRef}
                  type='text'
                  id='chat-input'
                  placeholder='ask WeatherGPT anything…'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoComplete='off'
                />
                <button type='button' id='mic-btn' className='mic-btn'>🎤</button>
                <button type='submit' id='send-btn' className={loading ? 'loading' : ''}>
                  <span className='btn-text'>Get forecast</span>
                  <span className='loader' />
                </button>
              </form>
              {showOnboarding && <div className='onboarding-hint'>Try asking "will it rain today?"</div>}
            </div>
          ) : (
            <div className='prompt-bar glass auth-prompt'>
              <span className='auth-prompt-text'>🔒 Sign in to ask WeatherGPT anything</span>
              <button type='button' className='auth-submit' onClick={() => navigate('/auth')}>
                <span className='btn-text'>Sign in</span>
              </button>
            </div>
          )}

          {isAuthenticated && (
            <div className='chips-container'>
              {SUGGESTIONS.map((s, i) => (
                <button type='button' className='chip' key={i} onClick={() => handleSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className='data-streams'>
            {error ? (
              <div>
                Error connecting.{' '}
                <button className='chip' onClick={() => loadWeather(currentName)}>
                  Retry
                </button>
              </div>
            ) : (
              <>
                <HourlyForecast hourly={hourly} isF={isF} />
                <DailyForecast daily={daily} isF={isF} />
              </>
            )}
          </div>

          {isAuthenticated && (
            <Chat
              lang={lang}
              input={input}
              setInput={setInput}
              onLocationChange={handleLocationChange}
            />
          )}
        </div>
      </div>

      {(alertsOpen || chartOpen) && (
        <div className={`drawer-backdrop${alertsOpen || chartOpen ? ' open' : ''}`} onClick={() => { setAlertsOpen(false); setChartOpen(false) }} />
      )}

      <AlertsDrawer
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        currentLat={currentLat}
        currentLon={currentLon}
      />
      <ClimateDrawer
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        currentLat={currentLat}
        currentLon={currentLon}
      />
    </>
  )
}
