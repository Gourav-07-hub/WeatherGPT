const API = import.meta.env.VITE_API_URL || ''
if (!API && typeof window !== 'undefined' && import.meta.env.PROD) {
  console.warn('VITE_API_URL not set — API calls will fallback to relative /api and fail on Vercel. Set it to your Render URL in Vercel → Production env.')
}

const inflight = new Map()

export async function fetchWeather(query, isCoords = false) {
  const url = isCoords
    ? `${API}/api/weather?${query}&daily=1&hourly=1`
    : `${API}/api/weather?q=${encodeURIComponent(query)}&daily=1&hourly=1`
  if (inflight.has(url)) return inflight.get(url)
  const promise = (async () => {
    const res = await fetch(url)
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`API error ${res.status}${txt ? ': ' + txt.slice(0,200) : ''}`)
    }
    return res.json()
  })()
  inflight.set(url, promise)
  try {
    return await promise
  } finally {
    inflight.delete(url)
  }
}

export async function fetchChat(message, lang, location, mode) {
  const body = { message, lang, location }
  if (mode) body.mode = mode
  const res = await fetch(`${API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Chat API error ${res.status}${txt ? ': ' + txt.slice(0,200) : ''}`)
  }
  const data = await res.json()
  // Server returns 200 with {reply: "Too many requests..."} for 429 — surface as distinct
  if (data.reply && data.reply.toLowerCase().includes('too many requests')) {
    const e = new Error('Chat API error 429: too many requests')
    e.status = 429
    throw e
  }
  return data
}

export async function fetchSubscriptions() {
  const res = await fetch(`${API}/api/subscribe`)
  return res.json()
}

export async function addSubscription(name, lat, lon) {
  const res = await fetch(`${API}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, lat, lon }),
  })
  return res.json()
}

export async function removeSubscription(id) {
  const res = await fetch(`${API}/api/subscribe/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function checkAlerts() {
  const res = await fetch(`${API}/api/subscribe/check`)
  return res.json()
}

export async function fetchClimate(lat, lon, days = 30) {
  const res = await fetch(`${API}/api/climate?lat=${lat}&lon=${lon}&days=${days}`)
  return res.json()
}
