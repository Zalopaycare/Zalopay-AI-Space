import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

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

// ---- Narrow screens (< 1024px): the sidebar becomes a slide-in drawer opened from the top bar ----
export const DRAWER_BREAKPOINT = 1024
const DRAWER_EVENT = 'zp-sidebar-drawer-change'
let drawerOpenNow = false

function useWidth() {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth))
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

/**
 * Everything the chrome needs about the sidebar: whether we're on a narrow screen (drawer mode),
 * whether the drawer is open, the desktop collapsed state, and `offset` — how far page content
 * and fixed elements must sit from the left edge (0 in drawer mode).
 */
export function useSidebarLayout() {
  const [, setCollapsed] = useSidebarCollapsed()
  const width = useWidth()
  const narrow = width < DRAWER_BREAKPOINT
  const [drawerOpen, setDrawerState] = useState(drawerOpenNow)
  useEffect(() => {
    const on = (e) => setDrawerState(e.detail)
    window.addEventListener(DRAWER_EVENT, on)
    return () => window.removeEventListener(DRAWER_EVENT, on)
  }, [])
  const setDrawerOpen = (v) => { drawerOpenNow = v; setDrawerState(v); window.dispatchEvent(new CustomEvent(DRAWER_EVENT, { detail: v })) }
  const { pathname } = useLocation()
  // Like Threads: on a laptop the sidebar stays open (no collapsing) and the page is centred on the
  // screen, not on the space right of the sidebar. rail = the sidebar's width; offset = where the page
  // starts. When the screen is too narrow for the centred content to clear the sidebar, the page
  // starts after it instead (so nothing hides under it). The use case page (1120px column), review,
  // chat and admin pages are wider than the 760px feed and need a wider screen to centre.
  const rail = narrow ? 0 : 224
  const contentW = /^\/(use-cases\/|review|chat|admin)/.test(pathname) ? 1120 : 760
  const centred = !narrow && (width - contentW) / 2 >= rail + 16
  const offset = narrow || centred ? 0 : rail
  return { collapsed: false, setCollapsed, narrow, mobile: width < 700, drawerOpen: narrow && drawerOpen, setDrawerOpen, offset, rail }
}
