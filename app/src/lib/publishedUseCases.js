import { useEffect, useState } from 'react'
import { api } from './api.js'
import { registerPublished, registerTemplateCases } from '../data/useCases.js'
import { useAuth } from '../auth/AuthContext.jsx'

// Loads approved community use cases once per page load and merges them into data/useCases.js.
// Components call usePublishedUseCases() and get a version number that bumps when data lands,
// so memoised lists recompute. `loaded` lets detail pages wait instead of showing a fallback.

let version = 0
let loaded = false
let inflight = null
const listeners = new Set()

export function loadPublishedUseCases(force = false) {
  if (inflight && !force) return inflight
  inflight = Promise.all([
    // showcase first: registerPublished keeps whatever is registered as built-in
    api.showcase().then((d) => registerTemplateCases(d.cases || [])).catch(() => {}),
    api.listSubmissions('?status=approved').catch(() => null),
  ])
    .then(([, d]) => { if (d) registerPublished(d.submissions || []) })
    .catch(() => {})
    .finally(() => { loaded = true; version++; listeners.forEach((fn) => fn(version)) })
  return inflight
}

let loadedFor = null

export function usePublishedUseCases() {
  const { user } = useAuth()
  const [v, setV] = useState(version)
  // Showcase + approved posts need a signed-in user: load again once someone signs in.
  useEffect(() => {
    const uid = user?.id || null
    if (uid && loadedFor !== uid) { loadedFor = uid; loadPublishedUseCases(true) }
  }, [user?.id])
  useEffect(() => {
    listeners.add(setV)
    if (!inflight) loadPublishedUseCases()
    return () => listeners.delete(setV)
  }, [])
  return { version: v, loaded }
}
