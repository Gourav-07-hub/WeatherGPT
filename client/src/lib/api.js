const API = import.meta.env.VITE_API_URL || ''

const inflight = new Map()

export async function fetchWeather(query, isCoords = false) {
  const url = isCoords
    ? `${API}/api/weather?${query}&daily=1&hourly=1`
    : `${API}/api/weather?q=${encodeURIComponent(query)}&daily=1&hourly=1`
  if (inflight.has(url)) return inflight.get(url)
  const promise = (async () => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('API error')
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
  if (!res.ok) throw new Error('Chat API error')
  return res.json()
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
