import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import './App.css'
import './theme.css'
import './profile.css'
import './layout.css'

type User = { id: number; name: string; email: string; bio?: string | null; headline?: string | null; gender?: string | null; phone?: string | null; date_of_birth?: string | null; education?: string | null; work_experience?: string | null; created_at?: string; initials?: string; tone?: string }
type Message = { id: number; sender_id: number; recipient_id: number; body: string; created_at: string; sender?: User; attachment_url?: string | null; attachment_name?: string | null; attachment_mime?: string | null; attachment_size?: number | null }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')
const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY ?? 'chat-house-local-key'
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1'
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)
const SESSION_KEY = 'chat-house-token'
const colors = ['rose', 'blue', 'gold', 'mint', 'lilac']
const initialsFor = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const profileSlug = (user: User) => `${user.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${user.id}`
const formatFileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
const decorateUser = (user: User, index: number): User => ({ ...user, initials: initialsFor(user.name), tone: colors[index % colors.length] })
const displayMessage = (message: Message): Message => message.body ? message : { ...message, body: message.attachment_name ? `Attached file: ${message.attachment_name}${message.attachment_url ? ` — ${message.attachment_url}` : ''}` : 'Attachment' }
const api = (path: string, token: string, options: RequestInit = {}) => fetch(`${API_URL}${path}`, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })

function Dashboard({ user, token, onClose, onSaved }: { user: User; token: string; onClose: () => void; onSaved: (user: User) => void }) {
  const [profile, setProfile] = useState({ name: user.name, headline: user.headline ?? '', bio: user.bio ?? '', gender: user.gender ?? '', phone: user.phone ?? '', date_of_birth: user.date_of_birth ?? '', education: user.education ?? '', work_experience: user.work_experience ?? '' }); const [status, setStatus] = useState('')
  const update = (key: keyof typeof profile, value: string) => setProfile((current) => ({ ...current, [key]: value }))
  const saveProfile = async (event: FormEvent) => { event.preventDefault(); const response = await api('/profile', token, { method: 'PATCH', body: JSON.stringify(profile) }); const data = await response.json(); if (response.ok) { onSaved(decorateUser(data, 0)); setStatus('Profile saved') } else setStatus(data.message ?? 'Unable to save profile') }
  return <main className="dashboard-page"><section className="dashboard-card"><button className="text-button" type="button" onClick={onClose}>← Back to chat</button><div className="profile-cover" /><div className="profile-hero"><div className="avatar avatar-self profile-avatar">{user.initials}</div><div><p className="eyebrow">Your professional profile</p><h1>{profile.name}</h1><p>{user.email}</p></div></div><form className="profile-form" onSubmit={saveProfile}><label><span>Display name</span><input value={profile.name} onChange={(event) => update('name', event.target.value)} required maxLength={80} /></label><label><span>Headline</span><input value={profile.headline} onChange={(event) => update('headline', event.target.value)} placeholder="Product designer · Builder · Mentor" maxLength={160} /></label><div className="profile-grid"><label><span>Gender</span><input value={profile.gender} onChange={(event) => update('gender', event.target.value)} placeholder="Optional" /></label><label><span>Phone number</span><input value={profile.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Optional" /></label><label><span>Date of birth</span><input type="date" value={profile.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} /></label></div><label><span>About you</span><textarea value={profile.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Tell people what you care about and what you are building." maxLength={500} rows={4} /></label><label><span>Education</span><textarea value={profile.education} onChange={(event) => update('education', event.target.value)} placeholder="School, degree, certifications" rows={3} /></label><label><span>Work experience</span><textarea value={profile.work_experience} onChange={(event) => update('work_experience', event.target.value)} placeholder="Role, company, dates, and what you worked on" rows={4} /></label>{status && <p className="auth-status">{status}</p>}<button className="primary-button" type="submit">Save profile <span>↗</span></button></form></section></main>
}

function PublicProfile({ user, onClose, onStartConversation }: { user: User; onClose: () => void; onStartConversation: () => void }) {
  const [copied, setCopied] = useState(false)
  const profileUrl = `${window.location.origin}/profile/${profileSlug(user)}`
  const copyLink = async () => { await navigator.clipboard?.writeText(profileUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  return <main className="dashboard-page"><section className="dashboard-card public-profile"><div className="profile-topbar"><button className="text-button" type="button" onClick={onClose}>← Back to conversation</button><span className="profile-kicker">Profile</span></div><div className="profile-cover" /><div className="profile-hero"><div className={`avatar avatar-${user.tone ?? 'rose'} profile-avatar`}>{user.initials}</div><div><p className="eyebrow">Chat House member</p><h1>{user.name}</h1><p>{user.headline || user.email}</p></div></div><div className="profile-actions"><button className="primary-button" type="button" onClick={onStartConversation}>＋ Start conversation</button><button className="secondary-button" type="button" onClick={copyLink}>{copied ? 'Link copied' : '↗ Copy profile link'}</button></div><div className="profile-about"><p className="eyebrow">About</p><p>{user.bio || 'This member has not added a bio yet.'}</p></div><div className="profile-section"><p className="eyebrow">Experience</p><p>{user.work_experience || 'No work experience added yet.'}</p></div><div className="profile-section"><p className="eyebrow">Education</p><p>{user.education || 'No education details added yet.'}</p></div><div className="profile-facts"><div><span>Member since</span><strong>{user.created_at ? new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : 'Recently'}</strong></div><div><span>Contact</span><strong>{user.phone || user.email}</strong></div><div><span>Profile link</span><strong>{profileUrl.replace(/^https?:\/\//, '')}</strong></div></div></section></main>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [message, setMessage] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('chat-house-theme') === 'dark' ? 'dark' : 'light')
  const [lockedUntil, setLockedUntil] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const lockoutSeconds = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('chat-house-theme', theme) }, [theme])
  useEffect(() => { if (!lockedUntil) return; const timer = window.setInterval(() => setLockedUntil((value) => value > Date.now() ? value : 0), 1000); return () => window.clearInterval(timer) }, [lockedUntil])

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true); setMessage('')
    const form = new FormData(event.currentTarget)
    const path = isRegistering ? '/register' : '/login'
    const body = isRegistering ? { name: String(form.get('name')), email: String(form.get('email')), password: String(form.get('password')) } : { email: String(form.get('email')), password: String(form.get('password')) }
    const response = await api(path, '', { method: 'POST', body: JSON.stringify(body) }); const data = await response.json(); setSubmitting(false)
    if (response.status === 429) { setLockedUntil(Date.now() + 5 * 60 * 1000); setMessage('Too many attempts. Your sign-in is paused for 5 minutes.'); return }
    if (!response.ok) { setMessage(data.message ?? 'Please check your details and try again.'); return }
    if (data.verification_required) { setVerificationEmail(data.email); setMessage('We sent a verification code to your email.'); return }
    onAuthenticated(data.token)
  }

  const verifyLogin = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true)
    const response = await api('/verify-login', '', { method: 'POST', body: JSON.stringify({ email: verificationEmail, code: verificationCode }) }); const data = await response.json(); setSubmitting(false)
    if (!response.ok) { setMessage(data.message ?? 'That code is not valid.'); return }
    onAuthenticated(data.token)
  }

  const sendReset = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true)
    const response = await api('/forgot-password', '', { method: 'POST', body: JSON.stringify({ email: forgotEmail }) }); const data = await response.json(); setSubmitting(false)
    setMessage(data.message ?? 'If the account exists, a reset link has been sent.')
  }

  return <main className={`auth-page ${theme}`}><button className="theme-toggle" type="button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? '◐ Dark' : '☼ Light'}</button><div className="auth-atmosphere" /><section className="auth-card"><div className="brand-mark">c<span>h</span></div><p className="eyebrow">Private conversations, beautifully simple</p><h1>{forgotOpen ? 'Reset your password.' : verificationEmail ? 'One last security step.' : isRegistering ? 'Make space for better conversations.' : 'Your people, in one place.'}</h1><p className="auth-copy">{forgotOpen ? 'Enter your email and we will send a secure reset link.' : verificationEmail ? `Enter the code we sent to ${verificationEmail}.` : 'Create an account or sign in from any browser. Your people and conversations are stored by Laravel.'}</p>{forgotOpen ? <form className="auth-form" onSubmit={sendReset}><label><span>Email address</span><input value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required type="email" placeholder="you@example.com" /></label>{message && <p className="auth-status">{message}</p>}<button className="primary-button" disabled={submitting} type="submit">{submitting ? 'Sending link...' : 'Send reset link'} <span>↗</span></button><button className="text-button" type="button" onClick={() => { setForgotOpen(false); setMessage('') }}>Back to sign in</button></form> : verificationEmail ? <form className="auth-form" onSubmit={verifyLogin}><label><span>Verification code</span><input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" /></label>{message && <p className="auth-status">{message}</p>}<button className="primary-button" disabled={submitting} type="submit">{submitting ? 'Verifying...' : 'Verify and continue'} <span>↗</span></button><button className="text-button" type="button" onClick={() => setVerificationEmail('')}>Use another account</button></form> : <form className="auth-form" onSubmit={submitAuth}>{isRegistering && <label><span>Your name</span><input name="name" required placeholder="Maya Chen" /></label>}<label><span>Email address</span><input name="email" required type="email" placeholder="you@example.com" /></label><label><span>Password</span><input name="password" required type="password" placeholder="••••••••" /></label>{message && <p className={`auth-status ${lockoutSeconds ? 'locked' : ''}`}>{message}{lockoutSeconds ? ` Try again in ${Math.floor(lockoutSeconds / 60)}:${String(lockoutSeconds % 60).padStart(2, '0')}.` : ''}</p>}<button className="primary-button" disabled={submitting || lockoutSeconds > 0} type="submit">{submitting ? 'Checking...' : isRegistering ? 'Create your account' : 'Sign in'} <span>↗</span></button><button className="forgot-password" type="button" onClick={() => { setForgotOpen(true); setMessage('') }}>Forgot password?</button></form>} {!verificationEmail && !forgotOpen && <button className="switch-auth" type="button" onClick={() => { setIsRegistering((value) => !value); setMessage('') }}>{isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>}<div className="auth-footer"><span>Laravel API</span><span>•</span><span>Secure account access</span></div></section></main>
}

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [unread, setUnread] = useState<Record<number, number>>({})
  const [notification, setNotification] = useState<{ name: string; text: string } | null>(null)
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
    const match = window.location.pathname.match(/^\/profile\/.+-(\d+)$/)
    if (!match || !token) return
    api(`/users/${match[1]}/profile`, token).then(async (response) => { if (!response.ok) return; const profile = decorateUser(await response.json(), 0); if (currentUser?.id === profile.id) setShowDashboard(true); else setProfileUser(profile) })
  }, [token, currentUser?.id])

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
    if (!currentUser) return
    const composeButton = document.querySelector('.compose-button')
    const handleCompose = () => { if (otherUsers[0]) setActiveId(otherUsers[0].id) }
    composeButton?.addEventListener('click', handleCompose)
    return () => composeButton?.removeEventListener('click', handleCompose)
  }, [currentUser?.id, otherUsers.length])

  useEffect(() => {
    if (!currentUser) return
    const handleProfileClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.current-user')) return
      event.preventDefault(); event.stopImmediatePropagation(); if (currentUser) window.history.pushState({}, '', `/profile/${profileSlug(currentUser)}`); setShowDashboard(true)
    }
    document.addEventListener('click', handleProfileClick, true)
    return () => document.removeEventListener('click', handleProfileClick, true)
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser) return
    const tools = document.querySelector('.composer-tools')
    if (!tools || tools.querySelector('.attach-control')) return
    const input = document.createElement('input'); input.type = 'file'; input.className = 'file-input'; input.accept = 'image/*,.pdf,.doc,.docx,.txt,.zip'; input.hidden = true
    const label = document.createElement('label'); label.className = 'attach-control'; label.textContent = '＋ Attach'; label.htmlFor = 'chat-attachment'; input.id = 'chat-attachment'
    const emojiButton = document.createElement('button'); emojiButton.type = 'button'; emojiButton.className = 'emoji-control'; emojiButton.textContent = '☺ Emoji'
    const picker = document.createElement('div'); picker.className = 'emoji-picker'; picker.hidden = true
    ;['😀', '😂', '😍', '👍', '🎉', '❤️', '🔥', '✨'].forEach((emoji) => { const option = document.createElement('button'); option.type = 'button'; option.textContent = emoji; option.onclick = () => { setDraft((current) => `${current}${emoji}`); picker.hidden = true }; picker.append(option) })
    emojiButton.onclick = () => { picker.hidden = !picker.hidden }
    input.onchange = () => { const file = input.files?.[0] ?? null; if (file && file.size > 100 * 1024 * 1024) { window.alert('Files must be smaller than 100 MB.'); input.value = ''; return } setSelectedFile(file) }
    tools.prepend(input, label, emojiButton, picker)
    return () => { input.remove(); label.remove(); emojiButton.remove(); picker.remove() }
  }, [currentUser?.id, activeId, showDashboard, profileUser])

  useEffect(() => {
    if (!activeUser) return
    const heading = document.querySelector('.conversation-header h2')
    const openProfile = () => { window.history.pushState({}, '', `/profile/${profileSlug(activeUser)}`); setProfileUser(activeUser) }
    heading?.addEventListener('click', openProfile)
    return () => heading?.removeEventListener('click', openProfile)
  }, [activeUser?.id])

  useEffect(() => {
    const tools = document.querySelector('.composer-tools')
    if (!tools) return
    let status = tools.querySelector<HTMLElement>('.attachment-status')
    if (!status) { status = document.createElement('span'); status.className = 'attachment-status'; tools.prepend(status) }
    status.textContent = selectedFile ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}` : ''
    status.hidden = !selectedFile
  }, [selectedFile])

  useEffect(() => {
    if (!activeId || !token) return
    api(`/users/${activeId}/messages`, token).then(async (response) => { if (response.ok) setMessages((await response.json()).map(displayMessage)) })
    setTypingUserId(null)
    setDraft('')
  }, [activeId, token])

  useEffect(() => {
    const bubbles = document.querySelectorAll<HTMLElement>('.message-area .bubble')
    conversation.forEach((message, index) => {
      if (!message.attachment_url || !bubbles[index]) return
      const bubble = bubbles[index]
      bubble.textContent = ''
      const link = document.createElement('a')
      link.className = 'attachment-link'; link.href = message.attachment_url; link.download = message.attachment_name ?? 'download'; link.target = '_blank'; link.rel = 'noopener noreferrer'
      if (message.attachment_mime?.startsWith('image/')) {
        const image = document.createElement('img'); image.className = 'attachment-preview'; image.src = message.attachment_url; image.alt = message.attachment_name ?? 'Attached image'; link.append(image)
      }
      const label = document.createElement('span'); label.className = 'attachment-label'; label.textContent = message.attachment_name ?? 'Download attachment'; link.append(label)
      bubble.append(link)
    })
  }, [conversation])

  useEffect(() => {
    if (!token || !currentUser) return
    ;(globalThis as typeof globalThis & { Pusher: typeof Pusher }).Pusher = Pusher
    const echo = new Echo({ broadcaster: 'reverb', key: REVERB_KEY, wsHost: REVERB_HOST, wsPort: REVERB_PORT, wssPort: REVERB_PORT, forceTLS: import.meta.env.PROD, enabledTransports: ['ws', 'wss'], authEndpoint: `${API_ORIGIN}/broadcasting/auth`, auth: { headers: { Authorization: `Bearer ${token}` } } })
    const channel = echo.private(`chat.${currentUser.id}`)
    const presence = echo.channel('chat-presence')
    presence.listen('.user.presence', (event: { user: User; online: boolean }) => {
      if (event.user.id === currentUser.id) return
      setUsers((current) => event.online ? [...current.filter((user) => user.id !== event.user.id), decorateUser(event.user, current.length)] : current.filter((user) => user.id !== event.user.id))
    })
    channel.listen('.message.sent', (event: { message: Message }) => {
      const message = displayMessage(event.message)
      if (message.recipient_id !== currentUser.id) return
      if (message.sender_id === activeId) setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])
      else {
        const senderName = message.sender?.name ?? 'New message'
        setUnread((current) => ({ ...current, [message.sender_id]: (current[message.sender_id] ?? 0) + 1 }))
        setNotification({ name: senderName, text: message.body || message.attachment_name || 'Sent an attachment' })
        if ('Notification' in window && Notification.permission === 'granted') new Notification(`Message from ${senderName}`, { body: message.body || message.attachment_name || 'Sent an attachment' })
      }
    })
    channel.listen('.typing.updated', (event: { user: User; isTyping: boolean }) => setTypingUserId(event.isTyping ? event.user.id : null))
    return () => { echo.leave(`chat.${currentUser.id}`); echo.leave('chat-presence'); echo.disconnect() }
  }, [currentUser, token, activeId])

  useEffect(() => {
    const handleComposerKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLTextAreaElement
      if (target.tagName !== 'TEXTAREA' || !target.closest('.composer') || event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      target.form?.requestSubmit()
    }
    document.addEventListener('keydown', handleComposerKeyDown)
    return () => document.removeEventListener('keydown', handleComposerKeyDown)
  }, [])

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const path = isRegistering ? '/register' : '/login'
    const body = isRegistering ? { name: String(form.get('name')), email: String(form.get('email')), password: String(form.get('password')) } : { email: String(form.get('email')), password: String(form.get('password')) }
    const response = await api(path, '', { method: 'POST', body: JSON.stringify(body) })
    const data = await response.json()
    if (!response.ok) return setAuthError(data.message ?? Object.values(data.errors ?? {}).flat().join(' '))
    if (data.verification_required) {
      const code = window.prompt('Enter the verification code sent to your email:')
      if (!code) return setAuthError('Email verification is required to finish signing in.')
      const verification = await api('/verify-login', '', { method: 'POST', body: JSON.stringify({ email: data.email, code }) })
      const verificationData = await verification.json()
      if (!verification.ok) return setAuthError(verificationData.message)
      localStorage.setItem(SESSION_KEY, verificationData.token); setToken(verificationData.token); setAuthError(''); return
    }
    localStorage.setItem(SESSION_KEY, data.token); setToken(data.token); setAuthError('')
  }

  const selectUser = (userId: number) => { setActiveId(userId); setUnread((current) => ({ ...current, [userId]: 0 })); setTypingUserId(null); setDraft('') }
  const updateDraft = (value: string) => {
    setDraft(value)
    if (!currentUser || !activeUser) return
    window.clearTimeout(typingTimer.current)
    void api(`/users/${activeUser.id}/typing`, token, { method: 'POST', body: JSON.stringify({ is_typing: value.trim().length > 0 }) })
    if (value.trim()) typingTimer.current = window.setTimeout(() => { void api(`/users/${activeUser.id}/typing`, token, { method: 'POST', body: JSON.stringify({ is_typing: false }) }) }, 900)
  }
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeUser || (!draft.trim() && !selectedFile)) return
    window.clearTimeout(typingTimer.current)
    await api(`/users/${activeUser.id}/typing`, token, { method: 'POST', body: JSON.stringify({ is_typing: false }) })
    const payload = new FormData(); payload.append('body', draft.trim()); if (selectedFile) payload.append('attachment', selectedFile)
    const response = await api(`/users/${activeUser.id}/messages`, token, { method: 'POST', body: payload })
    if (response.ok) { const message = displayMessage(await response.json() as Message); setMessages((current) => [...current, message]); setDraft(''); setSelectedFile(null); const input = document.querySelector<HTMLInputElement>('#chat-attachment'); if (input) input.value = '' }
    else { const data = await response.json(); setAuthError(data.message ?? 'Unable to send this message.') }
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-house-theme') ?? 'light'
    document.documentElement.dataset.theme = savedTheme
  }, [])

  useEffect(() => {
    if (currentUser && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
  }, [currentUser?.id])

  useEffect(() => {
    if (!notification) return
    const toast = document.createElement('button')
    const sender = users.find((user) => user.name === notification.name)
    const unreadCount = sender ? unread[sender.id] ?? 1 : 1
    toast.className = 'message-toast'; toast.type = 'button'; toast.innerHTML = `<strong>${notification.name} · ${unreadCount} unread</strong><span>${notification.text}</span>`
    toast.onclick = () => { const sender = users.find((user) => user.name === notification.name); if (sender) selectUser(sender.id); setNotification(null) }
    document.body.append(toast)
    const timer = window.setTimeout(() => setNotification(null), 6000)
    return () => { window.clearTimeout(timer); toast.remove() }
  }, [notification, unread])

  useEffect(() => {
    if (!currentUser) return
    const actions = document.querySelector('.topbar-actions')
    if (!actions || actions.querySelector('.app-theme-toggle')) return
    const button = document.createElement('button')
    button.type = 'button'; button.className = 'theme-toggle app-theme-toggle'
    const updateLabel = () => { button.textContent = document.documentElement.dataset.theme === 'dark' ? '☼ Light' : '◐ Dark' }
    button.onclick = () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; localStorage.setItem('chat-house-theme', next); updateLabel() }
    updateLabel(); actions.prepend(button)
    return () => button.remove()
  }, [currentUser])

  if (!currentUser) return <AuthScreen onAuthenticated={(nextToken) => { localStorage.setItem(SESSION_KEY, nextToken); setToken(nextToken) }} />
  if (profileUser) return <PublicProfile user={profileUser} onClose={() => { window.history.pushState({}, '', '/'); setProfileUser(null) }} onStartConversation={() => { window.history.pushState({}, '', '/'); setActiveId(profileUser.id); setProfileUser(null) }} />
  if (showDashboard) return <Dashboard user={currentUser} token={token} onClose={() => { window.history.pushState({}, '', '/'); setShowDashboard(false) }} onSaved={(user) => { setCurrentUser(user); setShowDashboard(false) }} />

  if (!currentUser) return <main className="auth-page"><div className="auth-atmosphere" /><section className="auth-card"><div className="brand-mark">c<span>h</span></div><p className="eyebrow">Private conversations, beautifully simple</p><h1>{isRegistering ? 'Make space for better conversations.' : 'Your people, in one place.'}</h1><p className="auth-copy">Create an account or sign in from any browser. Your people and conversations are stored by Laravel.</p><form className="auth-form" onSubmit={authenticate}>{isRegistering && <label><span>Your name</span><input name="name" required placeholder="Maya Chen" /></label>}<label><span>Email address</span><input name="email" required type="email" placeholder="you@example.com" /></label><label><span>Password</span><input name="password" required type="password" placeholder="••••••••" /></label>{authError && <p className="auth-error">{authError}</p>}<button className="primary-button" type="submit">{isRegistering ? 'Create your account' : 'Sign in'} <span>↗</span></button></form><button className="switch-auth" type="button" onClick={() => { setIsRegistering((value) => !value); setAuthError('') }}>{isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}</button><div className="auth-footer"><span>Laravel API</span><span>•</span><span>Shared worldwide when deployed</span></div></section></main>

  return <main className="app-shell"><header className="topbar"><div className="brand-lockup"><div className="brand-mark small">c<span>h</span></div><span>chat house</span></div><div className="topbar-actions"><span className="connection-status"><span className="live-dot" /> Laravel live</span><button className="current-user" onClick={async () => { await api('/logout', token, { method: 'POST' }); localStorage.removeItem(SESSION_KEY); setToken(''); setCurrentUser(null) }}><div className="avatar avatar-self">{currentUser.initials}</div><span>{currentUser.name}</span><span className="chevron">⌄</span></button></div></header><div className="workspace"><aside className="people-panel"><div className="panel-heading"><div><p className="eyebrow">Your space</p><h2>Messages</h2></div><button className="compose-button" aria-label="New message">＋</button></div><div className="search-field"><span>⌕</span><input placeholder="Search people" /></div><div className="filter-row"><button className="filter active">People <b>{otherUsers.length}</b></button></div>{otherUsers.length ? <div className="people-list">{otherUsers.map((person) => <button className={`person-row ${person.id === activeId ? 'selected' : ''}`} key={person.id} onClick={() => selectUser(person.id)}><div className={`avatar avatar-${person.tone}`}>{person.initials}<span className="status online" /></div><div className="person-info"><div><strong>{person.name}</strong><time>Member</time></div><p>Open conversation</p></div></button>)}</div> : <div className="empty-people"><strong>No one else has joined yet.</strong><p>When another person registers, they will appear here from the Laravel database.</p></div>}<div className="panel-bottom"><p><span className="lock">⌑</span> Shared through Laravel</p></div></aside><section className="conversation">{activeUser ? <><header className="conversation-header"><div className={`avatar avatar-${activeUser.tone}`}>{activeUser.initials}<span className="status online" /></div><div><h2>{activeUser.name}</h2><p><span className="online-indicator" />Connected account</p></div><div className="conversation-actions"><button className="icon-button" aria-label="More options">•••</button></div></header><div className="message-area"><div className="date-divider"><span>Conversation</span></div>{conversation.map((message) => <div className={`message-line ${message.sender_id === currentUser.id ? 'me' : ''}`} key={message.id}><div className={`avatar avatar-${message.sender_id === currentUser.id ? 'self' : activeUser.tone}`}>{message.sender_id === currentUser.id ? currentUser.initials : activeUser.initials}</div><div className="message-content"><div className="message-meta"><strong>{message.sender_id === currentUser.id ? 'You' : activeUser.name}</strong><time>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><div className="bubble">{message.body}</div></div></div>)}{typingUserId === activeUser.id && <div className="typing"><span className="typing-dots"><i /><i /><i /></span><span>{activeUser.name.split(' ')[0]} is typing</span></div>}{!conversation.length && <div className="empty-conversation">Say hello to {activeUser.name.split(' ')[0]} to start the conversation.</div>}</div><form className="composer" onSubmit={sendMessage}><div className="composer-box"><textarea value={draft} onChange={(event) => updateDraft(event.target.value)} placeholder={`Message ${activeUser.name.split(' ')[0]}...`} rows={1} /><div className="composer-tools"><span>Connected through Laravel Reverb</span><button className="send-button" type="submit" aria-label="Send message">↗</button></div></div></form></> : <div className="empty-conversation welcome"><div className="brand-mark small">c<span>h</span></div><h2>No conversations yet</h2><p>When another person registers, they will appear in your people list.</p></div>}</section><aside className="details-panel">{activeUser ? <><div className="details-header"><p className="eyebrow">Conversation</p><button className="icon-button" aria-label="Close details">×</button></div><div className={`avatar large avatar-${activeUser.tone}`}>{activeUser.initials}<span className="status online" /></div><h2>{activeUser.name}</h2><p className="handle">{activeUser.email}</p><div className="details-section"><p className="eyebrow">About this account</p><p className="about-copy">A real Chat House member. Messages and typing events are delivered through Laravel.</p></div></> : <p className="eyebrow">No active conversation</p>}</aside></div></main>
}

export default App
