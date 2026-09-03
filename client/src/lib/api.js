export async function fetchWeather(query, isCoords = false) {
  const url = isCoords ? `/api/weather?${query}&daily=1&hourly=1` : `/api/weather?q=${encodeURIComponent(query)}&daily=1&hourly=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error('API error')
  return res.json()
}

export async function fetchChat(message, lang) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, lang }),
  })
  if (!res.ok) throw new Error('Chat API error')
  return res.json()
}

export async function fetchSubscriptions() {
  const res = await fetch('/api/subscribe')
  return res.json()
}

export async function addSubscription(name, lat, lon) {
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, lat, lon }),
  })
  return res.json()
}

export async function removeSubscription(id) {
  const res = await fetch(`/api/subscribe/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function checkAlerts() {
  const res = await fetch('/api/subscribe/check')
  return res.json()
}

export async function fetchClimate(lat, lon, days = 30) {
  const res = await fetch(`/api/climate?lat=${lat}&lon=${lon}&days=${days}`)
  return res.json()
}
