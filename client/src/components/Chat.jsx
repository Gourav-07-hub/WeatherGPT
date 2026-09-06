import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchChat } from '../lib/api'
import { marked } from 'marked'

const RISK_COLORS = {
  Low: '#10b981',
  Moderate: '#f59e0b',
  High: '#f97316',
  Extreme: '#ef4444',
}

export default function Chat({ lang, input, setInput, onLocationChange, currentLocation }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const threadRef = useRef(null)
  const inputRef = useRef(input)
  const langRef = useRef(lang)
  const locationRef = useRef(currentLocation)
  const loadingRef = useRef(false)
  const seenRef = useRef(new Set())

  useEffect(() => { inputRef.current = input }, [input])
  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { locationRef.current = currentLocation }, [currentLocation])
  useEffect(() => { loadingRef.current = loading }, [loading])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = langRef.current === 'hi' ? 'hi-IN' : 'en-IN'
      window.speechSynthesis.speak(u)
    }
  }, [])

  const doChat = useCallback(
    async (text) => {
      try {
        const data = await fetchChat(text, langRef.current, locationRef.current)

        if (data.replyMode === 'vader') {
          // Vader briefing: render full markdown report with risk badge
          setMessages((m) => {
            const copy = [...m]
            copy[copy.length - 1] = {
              role: 'bot',
              text: data.reply || 'Here is your disaster intelligence briefing:',
              vaderBriefing: data.briefing,
              vaderSummary: data.summary,
              vaderSections: data.sections,
              riskLevel: data.riskLevel,
              replyMode: 'vader',
            }
            return copy
          })
          speak(data.reply || '')
          if (data.location) onLocationChange(data.location)
          return
        }

        // Standard weather reply
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = {
            role: 'bot',
            text: data.reply || "Can't reach the sky right now.",
          }
          return copy
        })
        speak(data.reply || '')
        if (data.location) onLocationChange(data.location)
      } catch {
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = {
            role: 'bot',
            text: "Can't reach the sky right now.",
            retryText: text,
          }
          return copy
        })
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [onLocationChange, speak]
  )

  useEffect(() => {
    const form = document.getElementById('chat-form')
    if (!form) return

    const handleSubmit = (e) => {
      e.preventDefault()
      if (loadingRef.current) return
      const text = inputRef.current.trim()
      if (!text) return
      loadingRef.current = true
      setLoading(true)
      setMessages((m) => [...m, { role: 'user', text }])
      setInput('')
      setMessages((m) => [...m, { role: 'bot', text: 'thinking...', loading: true }])
      doChat(text)
    }
    form.addEventListener('submit', handleSubmit)
    return () => form.removeEventListener('submit', handleSubmit)
  }, [doChat, setInput])

  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()

    const setListening = (val) => {
      document.body.classList.toggle('mic-listening', val)
    }

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setTimeout(() => {
        const form = document.getElementById('chat-form')
        if (form) form.requestSubmit()
      }, 0)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    const handleMic = () => {
      recognition.lang = langRef.current === 'hi' ? 'hi-IN' : 'en-IN'
      try {
        setListening(true)
        recognition.start()
      } catch {
        // already started
      }
    }
    const micBtn = document.getElementById('mic-btn')
    micBtn?.addEventListener('click', handleMic)
    return () => micBtn?.removeEventListener('click', handleMic)
  }, [setInput])

  const retry = (text) => {
    setInput(text)
    setMessages((m) => m.slice(0, m.length - 1))
    doChat(text)
  }

  const renderVaderBriefing = (msg) => {
    const riskColor = RISK_COLORS[msg.riskLevel] || '#6b7280'
    return (
      <div className="vader-briefing">
        {msg.text && <div className="vader-intro">{msg.text}</div>}
        {msg.riskLevel && (
          <div className="vader-risk-badge" style={{ borderColor: riskColor, color: riskColor }}>
            Risk Level: {msg.riskLevel}
          </div>
        )}
        {msg.vaderBriefing && (
          <div className="vader-report-body" dangerouslySetInnerHTML={{ __html: marked(msg.vaderBriefing) }} />
        )}
      </div>
    )
  }

  return (
    <div className='chat-thread' id='chat-thread' aria-live='polite' ref={threadRef}>
      {messages.map((m, i) => {
        const isNew = !seenRef.current.has(i)
        seenRef.current.add(i)
        return (
          <div
            key={i}
            className={`msg ${m.role === 'user' ? 'user' : 'bot glass'}${m.loading ? ' skeleton' : ''}${isNew ? ' msg-new' : ''}`}
          >
            {m.loading ? (
              <span className='typing-dots'>
                <span /><span /><span />
              </span>
            ) : m.replyMode === 'vader' ? (
              renderVaderBriefing(m)
            ) : (
              <>{m.text}</>
            )}
            {m.retryText && (
              <button
                onClick={() => retry(m.retryText)}
                className='chip'
                style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.8rem' }}
              >
                Retry
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
