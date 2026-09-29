import { useEffect, useState } from 'react'
import { api } from './api.js'
import { registerPublished } from '../data/useCases.js'

// Loads approved community use cases once per page load and merges them into data/useCases.js.
// Components call usePublishedUseCases() and get a version number that bumps when data lands,
// so memoised lists recompute. `loaded` lets detail pages wait instead of showing a fallback.

let version = 0
let loaded = false
let inflight = null
const listeners = new Set()

export function loadPublishedUseCases(force = false) {
  if (inflight && !force) return inflight
  inflight = api.listSubmissions('?status=approved')
    .then((d) => { registerPublished(d.submissions || []) })
    .catch(() => {})
    .finally(() => { loaded = true; version++; listeners.forEach((fn) => fn(version)) })
  return inflight
}

export function usePublishedUseCases() {
  const [v, setV] = useState(version)
  useEffect(() => {
    listeners.add(setV)
    if (!inflight) loadPublishedUseCases()
    return () => listeners.delete(setV)
  }, [])
  return { version: v, loaded }
}
