import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Two-way sync between page filter state and the URL query string, so a filtered view can be
 * shared and survives Back/Forward. `fields` maps a query key to [value, setValue, defaultValue].
 * Other params (e.g. ?share=1) are left alone. Pass enabled=false to pause (e.g. on a detail page).
 */
export function useUrlFilters(fields, enabled = true) {
  const location = useLocation()
  const navigate = useNavigate()
  const fieldsRef = useRef(fields)
  fieldsRef.current = fields

  // URL → state (initial load and Back/Forward)
  useEffect(() => {
    if (!enabled) return
    const qs = new URLSearchParams(location.search)
    for (const [key, [value, set, def]] of Object.entries(fieldsRef.current)) {
      const next = qs.has(key) ? qs.get(key) : def
      if ((next ?? def) !== (value ?? def)) set(next)
    }
  }, [location.search, enabled])

  // state → URL (replace, so typing doesn't flood history)
  const values = Object.values(fields).map((f) => f[0])
  const first = useRef(true)
  useEffect(() => {
    if (!enabled) return
    // The first pass is the URL → state load above; writing now would drop params not applied yet.
    if (first.current) { first.current = false; return }
    const qs = new URLSearchParams(location.search)
    for (const [key, [value, , def]] of Object.entries(fieldsRef.current)) {
      if (value == null || value === '' || value === def) qs.delete(key)
      else qs.set(key, value)
    }
    const search = qs.toString() ? '?' + qs : ''
    if (search !== location.search) navigate({ pathname: location.pathname, search, hash: location.hash }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...values])
}
