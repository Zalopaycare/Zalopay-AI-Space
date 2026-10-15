import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import ComingSoon from './ComingSoon.jsx'

/**
 * Trailer mode: a signed-in non-admin only ever sees the Coming soon screen, whatever the URL.
 * Admins see the real site; they can preview the screen with ?preview=coming-soon.
 * (The API refuses non-admins too, so this is not only cosmetic.)
 */
export default function TrailerGate({ children }) {
  const { user, loading, trailer } = useAuth()
  const { search } = useLocation()
  if (user?.isAdmin && new URLSearchParams(search).get('preview') === 'coming-soon') return <ComingSoon preview />
  if (loading || !user || user.isAdmin) return children
  if (trailer === null) return null
  return trailer ? <ComingSoon /> : children
}
