import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useScrollReveal from '../hooks/useScrollReveal'

const FEATURES = [
  { icon: '⚡', title: 'Real-time Weather', desc: 'Live conditions, hourly and 7-day forecasts powered by Open-Meteo.' },
  { icon: '🗣️', title: 'Natural Language', desc: 'Ask anything in plain English or Hindi — "Will it rain near me tomorrow?"' },
  { icon: '🌍', title: 'Multilingual', desc: 'Support for Indian languages so forecasts reach everyone, everywhere.' },
  { icon: '🎙️', title: 'Voice Enabled', desc: 'Speak your query — designed for rural accessibility and hands-free use.' },
  { icon: '⚠️', title: 'Extreme Alerts', desc: 'Early warnings for storms, floods, and cyclones with subscription alerts.' },
  { icon: '📊', title: 'Climate Trends', desc: '30-day historical analysis and trend charts for researchers and planners.' },
]

const USE_CASES = [
  { title: 'Farmers', desc: 'Crop-weather advisories and monsoon tracking in their language.' },
  { title: 'Disaster Managers', desc: 'Real-time warnings and decision support for rapid response.' },
  { title: 'Aviation', desc: 'On-demand weather briefing for flight planning and safety.' },
  { title: 'Researchers', desc: 'Climate analytics, trend data, and historical weather patterns.' },
  { title: 'Smart Cities', desc: 'Urban weather monitoring and infrastructure planning.' },
  { title: 'Marine', desc: 'Coastal forecasts, wave conditions, and ocean weather data.' },
]

function useMagnetic() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) * 0.15
      const dy = (e.clientY - cy) * 0.15
      el.style.transform = `translate(${dx}px, ${dy}px)`
    }

    const handleLeave = () => {
      el.style.transform = 'translate(0, 0)'
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return ref
}

function useTypewriter(text, speed = 35, delay = 1200) {
  const ref = useRef(null)
  const triggered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true
          observer.disconnect()

          if (prefersReduced) {
            el.textContent = text
            return
          }

          el.textContent = ''
          const cursor = document.createElement('span')
          cursor.className = 'land-terminal-cursor'
          el.appendChild(cursor)

          let i = 0
          const timer = setInterval(() => {
            if (i < text.length) {
              el.insertBefore(document.createTextNode(text[i]), cursor)
              i++
            } else {
              clearInterval(timer)
              setTimeout(() => cursor.remove(), 1500)
            }
          }, speed)

          return () => clearInterval(timer)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [text, speed, delay])

  return ref
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const featuresTitleRef = useScrollReveal()
  const featuresGridRef = useScrollReveal({ threshold: 0.05 })
  const casesTitleRef = useScrollReveal()
  const casesGridRef = useScrollReveal({ threshold: 0.05 })
  const ctaRef = useScrollReveal()
  const divider1Ref = useScrollReveal()
  const divider2Ref = useScrollReveal()
  const magneticRef = useMagnetic()
  const terminalUserRef = useTypewriter('Will it rain near me tomorrow?', 40, 1000)
  const terminalBotRef = useTypewriter(
    'Yes, light rain likely from 2pm–8pm where you are. Temperature: 28°C. Carry an umbrella.',
    25,
    2800
  )

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true })
  }, [isAuthenticated, navigate])

  if (isAuthenticated) return null

  return (
    <div className='landing'>
      {/* Nav */}
      <nav className='land-nav'>
        <div className='land-nav-inner'>
          <div className='land-brand'>
            <span className='land-brand-dot' />
            WeatherGPT
          </div>
          <div className='land-nav-links'>
            <a href='#features'>Features</a>
            <a href='#use-cases'>Use Cases</a>
          </div>
          <div className='land-nav-actions'>
            <Link to='/auth' className='land-btn land-btn-ghost'>Log in</Link>
            <Link to='/auth' className='land-btn land-btn-primary magnetic' ref={magneticRef}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className='land-hero'>
        <div className='land-hero-badge'>AI-Powered Weather Intelligence</div>
        <h1 className='land-hero-title'>
          Weather answers<br />in plain language.
        </h1>
        <p className='land-hero-sub'>
          Ask WeatherGPT anything about weather, forecasts, alerts, and climate trends.
          Get instant, accurate answers in English or Hindi — voice or text.
        </p>
        <div className='land-hero-actions'>
          <Link to='/auth' className='land-btn land-btn-primary land-btn-lg'>Start Chatting</Link>
          <a href='#features' className='land-btn land-btn-ghost land-btn-lg'>Learn More</a>
        </div>
        <div className='land-hero-terminal'>
          <div className='land-terminal-bar'>
            <span className='land-terminal-dot' />
            <span className='land-terminal-dot' />
            <span className='land-terminal-dot' />
          </div>
          <div className='land-terminal-body'>
            <div className='land-terminal-line'>
              <span className='land-terminal-prompt'>you</span>
              <span ref={terminalUserRef}></span>
            </div>
            <div className='land-terminal-line land-terminal-bot'>
              <span className='land-terminal-prompt'>gpt</span>
              <span ref={terminalBotRef}></span>
            </div>
          </div>
        </div>
      </section>

      <div className='land-divider reveal' ref={divider1Ref} />

      {/* Features */}
      <section className='land-section' id='features'>
        <div className='land-section-inner'>
          <div ref={featuresTitleRef} className='reveal'>
            <h2 className='land-section-title'>What WeatherGPT does</h2>
            <p className='land-section-sub'>
              Combining meteorological data, NWP models, and LLM reasoning
              into a single conversational interface.
            </p>
          </div>
          <div
            ref={featuresGridRef}
            className='land-features-grid stagger-children reveal'
          >
            {FEATURES.map((f, i) => (
              <div className='land-feature' key={i}>
                <div className='land-feature-icon'>{f.icon}</div>
                <h3 className='land-feature-title'>{f.title}</h3>
                <p className='land-feature-desc'>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className='land-divider reveal' ref={divider2Ref} />

      {/* Use Cases */}
      <section className='land-section land-section-alt' id='use-cases'>
        <div className='land-section-inner'>
          <div ref={casesTitleRef} className='reveal'>
            <h2 className='land-section-title'>Built for everyone</h2>
            <p className='land-section-sub'>
              From farmers in rural India to researchers at meteorological agencies.
            </p>
          </div>
          <div
            ref={casesGridRef}
            className='land-usecases-grid stagger-children reveal'
          >
            {USE_CASES.map((u, i) => (
              <div className='land-usecase' key={i}>
                <h3 className='land-usecase-title'>{u.title}</h3>
                <p className='land-usecase-desc'>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className='land-cta'>
          <div className='land-section-inner reveal' ref={ctaRef}>
          <h2 className='land-cta-title'>Ready to talk to the sky?</h2>
          <p className='land-cta-sub'>
            Get weather intelligence in seconds. No dashboards, no bulletins — just answers.
          </p>
          <Link to='/auth' className='land-btn land-btn-primary land-btn-lg'>Get Started Free</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className='land-footer'>
        <div className='land-footer-inner'>
          <div className='land-footer-brand'>
            <span className='land-brand-dot' />
            WeatherGPT
          </div>
          <p className='land-footer-text'>
            Conversational AI for weather forecasting, alerts, and climate information.
          </p>
          <div className='land-footer-links'>
            <a href='#features'>Features</a>
            <a href='#use-cases'>Use Cases</a>
            <Link to='/auth'>Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
