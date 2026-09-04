import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SkyBackground from '../components/SkyBackground'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your name')
          setLoading(false)
          return
        }
        await register(name.trim(), email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SkyBackground weatherCode={0} />
      <div className='auth-screen'>
        <div className='auth-card glass'>
          <button className='auth-back' onClick={() => navigate('/')} aria-label='Back to home'>
            ← Home
          </button>

          <div className='auth-brand'>
            <span className='auth-dot' />
            WeatherGPT
          </div>
          <p className='auth-tagline'>
            {mode === 'login' ? 'Sign in to chat with the sky.' : 'Create an account to chat with the sky.'}
          </p>

          <div className='auth-toggle'>
            <div className={`auth-toggle-pill ${mode === 'register' ? 'is-register' : ''}`} />
            <button
              type='button'
              className={`auth-toggle-opt${mode === 'login' ? ' active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              type='button'
              className={`auth-toggle-opt${mode === 'register' ? ' active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Create account
            </button>
          </div>

          <form className='auth-form' onSubmit={handleSubmit}>
            {mode === 'register' && (
              <input
                type='text'
                placeholder='Your name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete='name'
              />
            )}
            <input
              type='email'
              placeholder='you@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='email'
              required
            />
            <input
              type='password'
              placeholder='Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />

            {error && <div className='auth-error'>{error}</div>}

            <button type='submit' className={`auth-submit${loading ? ' loading' : ''}`} disabled={loading}>
              <span className='btn-text'>{mode === 'login' ? 'Log in' : 'Create account'}</span>
              <span className='loader' />
            </button>
          </form>

          <p className='auth-switch'>
            {mode === 'login' ? (
              <>
                Don’t have an account?{' '}
                <a href='#register' onClick={(e) => { e.preventDefault(); switchMode('register') }}>
                  Create one
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a href='#login' onClick={(e) => { e.preventDefault(); switchMode('login') }}>
                  Log in
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  )
}