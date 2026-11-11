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

// ---- Narrow screens (< 1024px): the sidebar becomes a slide-in drawer opened from the top bar ----
export const DRAWER_BREAKPOINT = 1024
const DRAWER_EVENT = 'zp-sidebar-drawer-change'
let drawerOpenNow = false

export function useWidth() {
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
  // the sidebar stays open on wide screens (it can't be folded to icons any more); narrow screens keep the drawer
  const [, setCollapsed] = useSidebarCollapsed()
  const collapsed = false
  const width = useWidth()
  const narrow = width < DRAWER_BREAKPOINT
  const [drawerOpen, setDrawerState] = useState(drawerOpenNow)
  useEffect(() => {
    const on = (e) => setDrawerState(e.detail)
    window.addEventListener(DRAWER_EVENT, on)
    return () => window.removeEventListener(DRAWER_EVENT, on)
  }, [])
  const setDrawerOpen = (v) => { drawerOpenNow = v; setDrawerState(v); window.dispatchEvent(new CustomEvent(DRAWER_EVENT, { detail: v })) }
  const offset = narrow ? 0 : collapsed ? 68 : 224
  // Pages sit centred on the screen when there's room: the right gets the same space as the sidebar
  // takes on the left, shrinking to none on smaller screens so the content keeps at least 1000px.
  const rightPad = narrow ? 0 : Math.max(0, Math.min(offset, width - offset - 1000))
  return { collapsed, setCollapsed, narrow, mobile: width < 700, drawerOpen: narrow && drawerOpen, setDrawerOpen, offset, rightPad, width }
}
