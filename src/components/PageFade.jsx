import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Smooth cross-page transitions, ported from page-transition.js. That script faded a
 * veil over full page reloads; here navigation is client-side, so instead we fade the
 * outgoing view out and the incoming view in around each route change.
 */
export default function PageFade({ children }) {
  const location = useLocation()
  const [display, setDisplay] = useState(children)
  const [phase, setPhase] = useState('in') // 'in' | 'out'
  const prevKey = useRef(location.pathname + location.search)

  useEffect(() => {
    const key = location.pathname + location.search
    if (key === prevKey.current) {
      setDisplay(children)
      return
    }
    prevKey.current = key
    setPhase('out')
    const t = setTimeout(() => {
      setDisplay(children)
      setPhase('in')
      window.scrollTo({ top: 0 })
    }, 160)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  useEffect(() => {
    setDisplay(children)
  }, [children])

  return (
    <div
      style={{
        opacity: phase === 'out' ? 0 : 1,
        transition: 'opacity .3s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {display}
    </div>
  )
}
