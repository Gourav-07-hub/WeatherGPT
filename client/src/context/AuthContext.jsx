import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as authApi from '../api/auth'

const TOKEN_KEY = 'weathergpt_token'
const USER_KEY = 'weathergpt_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [initialLoading, setInitialLoading] = useState(true)

  const persist = useCallback((t, u) => {
    setToken(t)
    setUser(u)
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
  }, [])

  // Restore session against the backend on first load if a token exists
  useEffect(() => {
    let active = true
    const tokenVal = localStorage.getItem(TOKEN_KEY)
    if (!tokenVal) {
      setInitialLoading(false)
      return
    }
    authApi
      .me(tokenVal)
      .then((u) => {
        if (!active) return
        setToken(tokenVal)
        setUser(u)
        localStorage.setItem(USER_KEY, JSON.stringify(u))
      })
      .catch(() => {
        if (!active) return
        setToken(null)
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      })
      .finally(() => {
        if (active) setInitialLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(
    async (email, password) => {
      const { token: t, user: u } = await authApi.login(email, password)
      persist(t, u)
      return u
    },
    [persist]
  )

  const register = useCallback(
    async (name, email, password) => {
      const { token: t, user: u } = await authApi.register(name, email, password)
      persist(t, u)
      return u
    },
    [persist]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // best-effort; still clear local session
    }
    persist(null, null)
  }, [persist])

  const value = {
    token,
    user,
    isAuthenticated: !!token && !!user,
    initialLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}