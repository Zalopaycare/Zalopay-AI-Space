import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { api } from '../lib/api.js'

// Tells the server which page a signed-in person has open (admin "Đang online" list): on every page
// change and every 45 s while the tab is visible. Renders nothing.
export default function PresenceBeat() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  useEffect(() => {
    if (!user) return undefined
    const beat = () => { if (document.visibilityState === 'visible') api.presence(pathname).catch(() => {}) }
    beat()
    const t = setInterval(beat, 45_000)
    document.addEventListener('visibilitychange', beat)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', beat) }
  }, [user, pathname])
  return null
}
