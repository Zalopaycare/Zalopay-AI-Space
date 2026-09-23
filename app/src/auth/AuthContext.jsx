import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const [afterLogin, setAfterLogin] = useState(null)
  const [ssoEnabled, setSsoEnabled] = useState(false)

  useEffect(() => {
    api.me().then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false))
    api.config().then((d) => setSsoEnabled(!!d.ssoEnabled)).catch(() => {})
  }, [])

  const openLogin = useCallback((onDone) => {
    setAfterLogin(() => onDone || null)
    setLoginOpen(true)
  }, [])

  const closeLogin = useCallback(() => { setLoginOpen(false); setAfterLogin(null) }, [])

  const onLoggedIn = useCallback((u) => {
    setUser(u)
    setLoginOpen(false)
    if (afterLogin) afterLogin()
    setAfterLogin(null)
  }, [afterLogin])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }, [])

  const requireLogin = useCallback((fn) => {
    if (user) { fn(); return }
    openLogin(fn)
  }, [user, openLogin])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginOpen, openLogin, closeLogin, onLoggedIn, logout, requireLogin, ssoEnabled }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
