import { useEffect } from 'react'

export const BRAND = 'Zalopay AI Space'

/** Sets the browser tab title: "<page> · Zalopay AI Space", or just the brand when page is empty. */
export function useTitle(page) {
  useEffect(() => {
    document.title = page ? `${page} · ${BRAND}` : BRAND
  }, [page])
}
