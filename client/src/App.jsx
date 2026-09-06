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
  const [currentName, setCurrentName] = useState('')
  const [locationDenied, setLocationDenied] = useState(false)
  const [isF, setIsF] = useState(false)
  const [lang, setLang] = useState('en')
  const [input, setInput] = useState('')
  const [pendingSuggestion, setPendingSuggestion] = useState(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const chatInputRef = useRef(null)
  const hasInitializedRef = useRef(false)
  const currentNameRef = useRef('')
  const lastCoordsRef = useRef('')

  useEffect(() => {
    if (pendingSuggestion && chatInputRef.current) {
      const ref = chatInputRef
      const form = ref.current?.closest('form')
      if (form) form.requestSubmit()
      setPendingSuggestion(null)
    }
  }, [pendingSuggestion])

  // Keep ref in sync for dedupe checks without adding deps
  useEffect(() => { currentNameRef.current = currentName }, [currentName])

  const loadWeather = useCallback(async (query, isCoords = false) => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchWeather(query, isCoords)
      setWeather(data.current ? { current: data.current } : data)
      setHourly(data.hourly || null)
      setDaily(data.daily || null)
      if (data.lat != null) setCurrentLat(data.lat)
      if (data.lon != null) setCurrentLon(data.lon)
      if (data.lat != null && data.lon != null) {
        lastCoordsRef.current = `${Number(data.lat).toFixed(3)},${Number(data.lon).toFixed(3)}`
      }
      if (data.name && data.name !== 'Unknown' && data.name !== 'Unknown city') {
        setCurrentName(data.name)
        setLocationDenied(false)
      }
      return true
    } catch (err) {
      const isRateLimit = err.message && err.message.toLowerCase().includes('429');
      setError(isRateLimit ? 'rate-limit' : true)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const t = setTimeout(async () => {
      if (!navigator.geolocation) {
        setLocationDenied(true)
        setLoading(false)
        return
      }
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject)
        )
        await loadWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, true)
      } catch {
        setLocationDenied(true)
        setLoading(false)
      }
    }, 300)
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
      if (!name || name.trim().toLowerCase() === currentNameRef.current.trim().toLowerCase()) return
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
          {currentName && <div className='location-name'>{currentName}</div>}
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

        {(loading || weather) && <Hero weather={weather} isLoading={loading} isF={isF} />}

        <div className='content-below'>
          <div className='prompt-center'>
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
                  <button type='submit' id='send-btn' className={loading ? 'loading' : ''} disabled={loading}>
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
          </div>

          <div className='data-streams'>
            {error ? (
              <div>
                {error === 'rate-limit' ? 'Rate limit hit — please wait a second and try again.' : 'Network error — check your connection.'}{' '}
                <button className='chip' onClick={() => loadWeather(currentName)}>
                  Retry
                </button>
              </div>
            ) : locationDenied && !weather ? (
              <div className='location-prompt'>
                Search a city above (e.g. "what is the weather in Delhi?") or allow location
                access to see weather for where you are.
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
              currentLocation={currentName}
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
