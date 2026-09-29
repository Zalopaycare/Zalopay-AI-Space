import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Navigate with a soft cross-fade from the old page to the new one (browser View Transitions),
 * instead of the new page popping in. Falls back to a normal Link where unsupported, and for
 * modifier/middle clicks (open in new tab).
 */
export function softNavigate(navigate, to) {
  if (typeof document === 'undefined' || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate(to)
    return
  }
  const root = document.documentElement
  root.classList.add('zp-vt')
  const vt = document.startViewTransition(() => { flushSync(() => navigate(to)) })
  vt.finished.finally(() => root.classList.remove('zp-vt'))
}

export default function SoftLink({ to, onClick, ...rest }) {
  const navigate = useNavigate()
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (onClick) onClick(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        softNavigate(navigate, to)
      }}
      {...rest}
    />
  )
}
