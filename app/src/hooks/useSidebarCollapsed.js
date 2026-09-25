import { useEffect, useState } from 'react'

const KEY = 'zp-sidebar-collapsed'
const EVENT = 'zp-sidebar-collapsed-change'

function read() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Shared collapsed/expanded state for the left Sidebar, read by Layout/TopNav too so they can offset around it. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(read)

  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setCollapsedState(e.newValue === '1') }
    const onCustom = (e) => setCollapsedState(e.detail)
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVENT, onCustom)
    }
  }, [])

  const setCollapsed = (value) => {
    setCollapsedState(value)
    try { localStorage.setItem(KEY, value ? '1' : '0') } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }))
  }

  return [collapsed, setCollapsed]
}
