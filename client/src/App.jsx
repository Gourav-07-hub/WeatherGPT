import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
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
const CITY_SUGGESTIONS = ['Delhi', 'Mumbai', 'Bengaluru', 'London', 'New York', 'Tokyo']

export default function App() {
  const { isAuthenticated, user, initialLoading, logout } = useAuth()
  const [weather, setWeather] = useState(null)
  const [hourly, setHourly] = useState(null)
  const [daily, setDaily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentLat, setCurrentLat] = useState(null)
  const [currentLon, setCurrentLon] = useState(null)
  const [currentName, setCurrentName] = useState('')
  const [locationDenied, setLocationDenied] = useState(false)
  const [isF, setIsF] = useState(false)
  const [lang, setLang] = useState('en')
  const [input, setInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingSuggestion, setPendingSuggestion] = useState(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  const chatInputRef = useRef(null)
  const hasInitializedRef = useRef(false)
  const userInteractedRef = useRef(false)
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
    if (!query) return false
    setLoading(true)
    setError(null)
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
        if (!isCoords) {
          try { localStorage.setItem('wgpt_last_city', data.name) } catch {}
        }
      }
      return true
    } catch (err) {
      const isRateLimit = (err.status === 429) || (err.message && err.message.toLowerCase().includes('429'))
      if (isRateLimit) {
        setError('Rate limit hit — please wait a moment and try again.')
      } else if (err.status === 404 || (err.message && err.message.toLowerCase().includes('not found'))) {
        setError(err.message || `Location "${query}" not found. Please try another city name.`)
      } else {
        setError(err.message || 'Unable to fetch weather. Please check your connection and try again.')
      }
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const savedCity = localStorage.getItem('wgpt_last_city') || 'Delhi'

    if (!navigator.geolocation) {
      setLocationDenied(true)
      loadWeather(savedCity)
      return
    }

    let resolved = false
    const geoTimer = setTimeout(() => {
      if (!resolved && !userInteractedRef.current) {
        resolved = true
        setLocationDenied(true)
        loadWeather(savedCity)
      }
    }, 2500)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(geoTimer)
        if (userInteractedRef.current) return
        resolved = true
        loadWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, true)
      },
      () => {
        clearTimeout(geoTimer)
        if (userInteractedRef.current) return
        resolved = true
        setLocationDenied(true)
        loadWeather(savedCity)
      },
      { timeout: 3000, maximumAge: 60000 }
    )

    return () => clearTimeout(geoTimer)
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

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    const q = searchQuery.trim()
    if (!q || loading) return
    userInteractedRef.current = true
    const success = await loadWeather(q)
    if (success) {
      setSearchQuery('')
    }
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

        {(loading || weather) && <Hero weather={weather} daily={daily} isLoading={loading} isF={isF} />}

        <div className='content-below'>
          <div className='prompt-center'>
            {isAuthenticated ? (
              <div className='prompt-bar glass'>
                <form id='chat-form'>
                  <input
                    ref={chatInputRef}
                    type='text'
                    id='chat-input'
                    placeholder='ask WeatherGPT anything or search a city…'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoComplete='off'
                  />
                  <button type='button' id='mic-btn' className='mic-btn'>🎤</button>
                  <button type='submit' id='send-btn' className={chatLoading ? 'loading' : ''} disabled={chatLoading}>
                    <span className='btn-text'>Get forecast</span>
                    <span className='loader' />
                  </button>
                </form>
                {showOnboarding && <div className='onboarding-hint'>Try asking "will it rain today?" or type a city name</div>}
              </div>
            ) : (
              <div className='prompt-bar glass'>
                <form onSubmit={handleSearch}>
                  <input
                    type='text'
                    name='city'
                    placeholder='Search city (e.g. Delhi, London, Mumbai)...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label='Search city'
                    autoComplete='off'
                  />
                  <button type='submit' className={loading ? 'loading' : ''} disabled={loading || !searchQuery.trim()}>
                    <span className='btn-text'>Search</span>
                    <span className='loader' />
                  </button>
                </form>
              </div>
            )}

            {isAuthenticated ? (
              <div className='chips-container'>
                {SUGGESTIONS.map((s, i) => (
                  <button type='button' className='chip' key={i} onClick={() => handleSuggestion(s)}>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <div className='chips-container'>
                {CITY_SUGGESTIONS.map((city, i) => (
                  <button
                    type='button'
                    className='chip'
                    key={i}
                    onClick={() => {
                      userInteractedRef.current = true
                      loadWeather(city)
                    }}
                  >
                    📍 {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='data-streams'>
            {error && (
              <div className='search-error glass'>
                <span className='error-text'>⚠️ {error}</span>
                <button
                  type='button'
                  className='chip error-retry'
                  onClick={() => {
                    setError(null)
                    loadWeather(currentName || 'Delhi')
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!weather && !loading ? (
              <div className='location-prompt'>
                Search a city above (e.g. "Delhi", "London", "Tokyo") or allow location access to see your local weather.
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
              onLoadingChange={setChatLoading}
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
