import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import './App.css'

type User = { id: number; name: string; email: string; initials?: string; tone?: string }
type Message = { id: number; sender_id: number; recipient_id: number; body: string; created_at: string; sender?: User }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')
const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY ?? 'chat-house-local-key'
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1'
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)
const SESSION_KEY = 'chat-house-token'
const colors = ['rose', 'blue', 'gold', 'mint', 'lilac']
const initialsFor = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const decorateUser = (user: User, index: number): User => ({ ...user, initials: initialsFor(user.name), tone: colors[index % colors.length] })
const api = (path: string, token: string, options: RequestInit = {}) => fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(SESSION_KEY) ?? '')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isRegistering, setIsRegistering] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUserId, setTypingUserId] = useState<number | null>(null)
  const [authError, setAuthError] = useState('')
  const typingTimer = useRef<number | undefined>(undefined)
  const activeUser = users.find((user) => user.id === activeId) ?? null
  const otherUsers = users.filter((user) => user.id !== currentUser?.id)
  const conversation = useMemo(() => messages, [messages])

  useEffect(() => {
    if (!token) return
    api('/user', token).then(async (response) => {
      if (!response.ok) throw new Error('expired')
      const user = decorateUser(await response.json(), 0)
      setCurrentUser(user)
      const peopleResponse = await api('/users', token)
      if (peopleResponse.ok) setUsers((await peopleResponse.json()).map((person: User, index: number) => decorateUser(person, index + 1)))
    }).catch(() => { localStorage.removeItem(SESSION_KEY); setToken('') })
  }, [token])

  useEffect(() => {
    if (!token || !currentUser) return
    const refreshPresence = async () => {
      await api('/heartbeat', token, { method: 'POST' })
      const response = await api('/users', token)
      if (response.ok) setUsers((await response.json()).map((person: User, index: number) => decorateUser(person, index + 1)))
    }
    void refreshPresence()
    const interval = window.setInterval(refreshPresence, 15000)
    return () => window.clearInterval(interval)
  }, [currentUser?.id, token])

  useEffect(() => {
    if (!activeId || !token) return
    api(`/users/${activeId}/messages`, token).then(async (response) => { if (response.ok) setMessages(await response.json()) })
    setTypingUserId(null)
    setDraft('')
  }, [activeId, token])

  useEffect(() => {
    if (!token || !currentUser) return
    ;(globalThis as typeof globalThis & { Pusher: typeof Pusher }).Pusher = Pusher
    const echo = new Echo({ broadcaster: 'reverb', key: REVERB_KEY, wsHost: REVERB_HOST, wsPort: REVERB_PORT, wssPort: REVERB_PORT, forceTLS: import.meta.env.PROD, enabledTransports: ['ws', 'wss'], authEndpoint: `${API_ORIGIN}/broadcasting/auth`, auth: { headers: { Authorization: `Bearer ${token}` } } })
    const channel = echo.private(`chat.${currentUser.id}`)
    channel.listen('.message.sent', (event: { message: Message }) => { if (event.message.sender_id === activeId || event.message.recipient_id === activeId) setMessages((current) => current.some((message) => message.id === event.message.id) ? current : [...current, event.message]) })
    channel.listen('.typing.updated', (event: { user: User; isTyping: boolean }) => setTypingUserId(event.isTyping ? event.user.id : null))
    return () => { echo.leave(`chat.${currentUser.id}`); echo.disconnect() }
  }, [currentUser, token, activeId])

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const path = isRegistering ? '/register' : '/login'
    const body = isRegistering ? { name: String(form.get('name')), email: String(form.get('email')), password: String(form.get('password')) } : { email: String(form.get('email')), password: String(form.get('password')) }
    const response = await api(path, '', { method: 'POST', body: JSON.stringify(body) })
    const data = await response.json()
    if (!response.ok) return setAuthError(data.message ?? Object.values(data.errors ?? {}).flat().join(' '))
    localStorage.setItem(SESSION_KEY, data.token); setToken(data.token); setAuthError('')
  }

  const selectUser = (userId: number) => { setActiveId(userId); setTypingUserId(null); setDraft('') }
  const updateDraft = (value: string) => {
    setDraft(value)
    if (!currentUser || !activeUser) return
    window.clearTimeout(typingTimer.current)
    void api(`/users/${activeUser.id}/typing`, token, { method: 'POST', body: JSON.stringify({ is_typing: value.trim().length > 0 }) })
    if (value.trim()) typingTimer.current = window.setTimeout(() => { void api(`/users/${activeUser.id}/typing`, token, { method: 'POST', body: JSON.stringify({ is_typing: false }) }) }, 900)
  }
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeUser || !draft.trim()) return
    window.clearTimeout(typingTimer.current)
    await api(`/users/${activeUser.id}/typing`, token, { method: 'POST', body: JSON.stringify({ is_typing: false }) })
    const response = await api(`/users/${activeUser.id}/messages`, token, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) })
    if (response.ok) { const message = await response.json() as Message; setMessages((current) => [...current, message]); setDraft('') }
  }

  if (!currentUser) return <main className="auth-page"><div className="auth-atmosphere" /><section className="auth-card"><div className="brand-mark">c<span>h</span></div><p className="eyebrow">Private conversations, beautifully simple</p><h1>{isRegistering ? 'Make space for better conversations.' : 'Your people, in one place.'}</h1><p className="auth-copy">Create an account or sign in from any browser. Your people and conversations are stored by Laravel.</p><form className="auth-form" onSubmit={authenticate}>{isRegistering && <label><span>Your name</span><input name="name" required placeholder="Maya Chen" /></label>}<label><span>Email address</span><input name="email" required type="email" placeholder="you@example.com" /></label><label><span>Password</span><input name="password" required type="password" placeholder="••••••••" /></label>{authError && <p className="auth-error">{authError}</p>}<button className="primary-button" type="submit">{isRegistering ? 'Create your account' : 'Sign in'} <span>↗</span></button></form><button className="switch-auth" type="button" onClick={() => { setIsRegistering((value) => !value); setAuthError('') }}>{isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}</button><div className="auth-footer"><span>Laravel API</span><span>•</span><span>Shared worldwide when deployed</span></div></section></main>

  return <main className="app-shell"><header className="topbar"><div className="brand-lockup"><div className="brand-mark small">c<span>h</span></div><span>chat house</span></div><div className="topbar-actions"><span className="connection-status"><span className="live-dot" /> Laravel live</span><button className="current-user" onClick={async () => { await api('/logout', token, { method: 'POST' }); localStorage.removeItem(SESSION_KEY); setToken(''); setCurrentUser(null) }}><div className="avatar avatar-self">{currentUser.initials}</div><span>{currentUser.name}</span><span className="chevron">⌄</span></button></div></header><div className="workspace"><aside className="people-panel"><div className="panel-heading"><div><p className="eyebrow">Your space</p><h2>Messages</h2></div><button className="compose-button" aria-label="New message">＋</button></div><div className="search-field"><span>⌕</span><input placeholder="Search people" /></div><div className="filter-row"><button className="filter active">People <b>{otherUsers.length}</b></button></div>{otherUsers.length ? <div className="people-list">{otherUsers.map((person) => <button className={`person-row ${person.id === activeId ? 'selected' : ''}`} key={person.id} onClick={() => selectUser(person.id)}><div className={`avatar avatar-${person.tone}`}>{person.initials}<span className="status online" /></div><div className="person-info"><div><strong>{person.name}</strong><time>Member</time></div><p>Open conversation</p></div></button>)}</div> : <div className="empty-people"><strong>No one else has joined yet.</strong><p>When another person registers, they will appear here from the Laravel database.</p></div>}<div className="panel-bottom"><p><span className="lock">⌑</span> Shared through Laravel</p></div></aside><section className="conversation">{activeUser ? <><header className="conversation-header"><div className={`avatar avatar-${activeUser.tone}`}>{activeUser.initials}<span className="status online" /></div><div><h2>{activeUser.name}</h2><p><span className="online-indicator" />Connected account</p></div><div className="conversation-actions"><button className="icon-button" aria-label="More options">•••</button></div></header><div className="message-area"><div className="date-divider"><span>Conversation</span></div>{conversation.map((message) => <div className={`message-line ${message.sender_id === currentUser.id ? 'me' : ''}`} key={message.id}><div className={`avatar avatar-${message.sender_id === currentUser.id ? 'self' : activeUser.tone}`}>{message.sender_id === currentUser.id ? currentUser.initials : activeUser.initials}</div><div className="message-content"><div className="message-meta"><strong>{message.sender_id === currentUser.id ? 'You' : activeUser.name}</strong><time>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><div className="bubble">{message.body}</div></div></div>)}{typingUserId === activeUser.id && <div className="typing"><span className="typing-dots"><i /><i /><i /></span><span>{activeUser.name.split(' ')[0]} is typing</span></div>}{!conversation.length && <div className="empty-conversation">Say hello to {activeUser.name.split(' ')[0]} to start the conversation.</div>}</div><form className="composer" onSubmit={sendMessage}><div className="composer-box"><textarea value={draft} onChange={(event) => updateDraft(event.target.value)} placeholder={`Message ${activeUser.name.split(' ')[0]}...`} rows={1} /><div className="composer-tools"><span>Connected through Laravel Reverb</span><button className="send-button" type="submit" aria-label="Send message">↗</button></div></div></form></> : <div className="empty-conversation welcome"><div className="brand-mark small">c<span>h</span></div><h2>No conversations yet</h2><p>When another person registers, they will appear in your people list.</p></div>}</section><aside className="details-panel">{activeUser ? <><div className="details-header"><p className="eyebrow">Conversation</p><button className="icon-button" aria-label="Close details">×</button></div><div className={`avatar large avatar-${activeUser.tone}`}>{activeUser.initials}<span className="status online" /></div><h2>{activeUser.name}</h2><p className="handle">{activeUser.email}</p><div className="details-section"><p className="eyebrow">About this account</p><p className="about-copy">A real Chat House member. Messages and typing events are delivered through Laravel.</p></div></> : <p className="eyebrow">No active conversation</p>}</aside></div></main>
}

export default App
