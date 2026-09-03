import { useState, useRef, useEffect } from 'react'
import { fetchChat } from '../lib/api'

export default function Chat({ lang, input, setInput, onLocationChange }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const threadRef = useRef(null)
  const inputRef = useRef(input)
  const langRef = useRef(lang)

  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const form = document.getElementById('chat-form')
    if (!form) return

    const handleSubmit = (e) => {
      e.preventDefault()
      if (loading) return
      const text = inputRef.current.trim()
      if (!text) return
      setMessages((m) => [...m, { role: 'user', text }])
      setInput('')
      setLoading(true)
      setMessages((m) => [...m, { role: 'bot', text: 'thinking...', loading: true }])
      doChat(text)
    }
    form.addEventListener('submit', handleSubmit)
    return () => form.removeEventListener('submit', handleSubmit)
  }, [loading])

  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    const handleClick = () => {
      recognition.lang = langRef.current === 'hi' ? 'hi-IN' : 'en-IN'
      recognition.start()
    }
    recognition.onresult = (e) => {
      setInput(e.results[0][0].transcript)
      const form = document.getElementById('chat-form')
      form?.dispatchEvent(new Event('submit', { cancelable: true }))
    }
    const micBtn = document.getElementById('mic-btn')
    micBtn?.addEventListener('click', handleClick)
    return () => micBtn?.removeEventListener('click', handleClick)
  }, [])

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = langRef.current === 'hi' ? 'hi-IN' : 'en-IN'
      window.speechSynthesis.speak(u)
    }
  }

  const doChat = async (text) => {
    try {
      const data = await fetchChat(text, langRef.current)
      setMessages((m) => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'bot', text: data.reply || "Can't reach the sky right now." }
        return copy
      })
      speak(data.reply || '')
      if (data.location) {
        onLocationChange(data.location)
      }
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
      setLoading(false)
    }
  }

  const retry = (text) => {
    setInput(text)
    setMessages((m) => m.slice(0, m.length - 1))
    doChat(text)
  }

  return (
    <div className='chat-thread' id='chat-thread' aria-live='polite' ref={threadRef}>
      {messages.map((m, i) => (
        <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'bot glass'}${m.loading ? ' skeleton' : ''}`}>
          {m.text}
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
      ))}
    </div>
  )
}
