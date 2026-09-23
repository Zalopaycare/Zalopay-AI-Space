import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { PAIRS, ATTR_PAIRS } from './pairs.js'

const TEXT_EN = Object.fromEntries(PAIRS.filter((p) => p[0] !== p[1]))
const ATTR_EN = Object.fromEntries(PAIRS.concat(ATTR_PAIRS).filter((p) => p[0] !== p[1]))

const I18nContext = createContext({ lang: 'vi', t: (s) => s, ta: (s) => s, setLang: () => {} })

function readInitialLang() {
  try {
    return localStorage.getItem('zp-lang') || 'vi'
  } catch {
    return 'vi'
  }
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  const setLang = useCallback((next) => {
    if (next !== 'vi' && next !== 'en') return
    setLangState(next)
    try {
      localStorage.setItem('zp-lang', next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      // UI chrome label — falls back to the Vietnamese source string.
      t: (viText) => (lang === 'en' ? TEXT_EN[viText] || viText : viText),
      // Attribute text (placeholders, titles).
      ta: (viText) => (lang === 'en' ? ATTR_EN[viText] || viText : viText),
    }),
    [lang, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
