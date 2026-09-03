import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSubscriptions, addSubscription, removeSubscription, checkAlerts } from '../lib/api'

export default function AlertsDrawer({ open, onClose, currentLat, currentLon }) {
  const [subs, setSubs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [name, setName] = useState('')
  const intervalRef = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSubscriptions()
      setSubs(data.subscriptions || [])
      const checkData = await checkAlerts()
      setAlerts(checkData.checks || [])
    } catch {
      setSubs([])
      setAlerts([])
    }
  }, [])

  useEffect(() => {
    if (open) {
      refresh()
      intervalRef.current = setInterval(refresh, 60000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open, refresh])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || currentLat == null || currentLon == null) return
    await addSubscription(name.trim(), currentLat, currentLon)
    setName('')
    refresh()
  }

  const handleRemove = async (id) => {
    await removeSubscription(id)
    refresh()
  }

  if (!open) return null

  return (
    <div className='drawer glass open' id='drawer-alerts'>
      <button className='drawer-close' onClick={onClose}>×</button>
      <h3>Alert Subscriptions</h3>
      <form className='subscribe-form' onSubmit={handleSubmit}>
        <input
          type='text'
          placeholder='Name (e.g. Home)'
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type='submit'>Subscribe</button>
      </form>
      <div>
        {subs.map((s) => (
          <div className='alert-item' key={s.id}>
            <span>{s.name}</span>
            <button
              style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={() => handleRemove(s.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className='alert-list'>
        {alerts.filter((c) => c.alerts && c.alerts.length > 0).length > 0 ? (
          alerts
            .filter((c) => c.alerts && c.alerts.length > 0)
            .map((c, i) => (
              <div key={i} className='alert-danger'>
                <strong>{c.name}</strong>: {c.alerts.map((a) => a.detail).join(', ')}
              </div>
            ))
        ) : (
          <i>No active alerts.</i>
        )}
      </div>
    </div>
  )
}
