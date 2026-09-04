const API = import.meta.env.VITE_API_URL || ''
const BASE = `${API}/api/auth`

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function register(name, email, password) {
  return post('/register', { name, email, password })
}

export async function login(email, password) {
  return post('/login', { email, password })
}

export async function logout() {
  return post('/logout', {})
}

export async function me(token) {
  const res = await fetch(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Not authenticated')
    err.status = res.status
    throw err
  }
  return data.user
}