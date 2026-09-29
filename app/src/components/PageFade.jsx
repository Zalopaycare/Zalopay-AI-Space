import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Route changes swap content immediately (no fade-out gap, which read as a flicker) and reset
 * scroll; Layout fades the new page's content in via the .zp-page-in class while the fixed
 * sidebar and top bar stay put.
 */
export default function PageFade({ children }) {
  const { pathname } = useLocation()
  // Layout effect so the reset lands in the same commit a view transition snapshots.
  useLayoutEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])
  return children
}
