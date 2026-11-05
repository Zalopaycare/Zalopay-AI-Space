// "Thẻ xám": a trial look like Facebook's dark mode. The page around stays dark; the white cards,
// menus and fields turn grey (#242526) with light text. Nothing in the pages changes: css() and
// hoverClass() (lib/style.js) pass every declaration through tone(), which swaps light backgrounds
// and borders for greys, dark text for light text, and lifts coloured text so it reads on grey.
// The choice is kept per browser; turning it on or off reloads the page.
//
// "Khung trắng" (the default) is softened the same way: pure white cards on the dark page glare, so every
// light fill and border is taken one step down to an ivory with a hint of grey-blue (white → #EEF2F8),
// the lighter panels and lines inside a card moving with it so they still stand apart. Text stays as is.

const KEY = 'zp-theme'

function readTheme() {
  try {
    const q = new URLSearchParams(window.location.search).get('theme')
    if (q === 'gray' || q === 'default') localStorage.setItem(KEY, q)
    return localStorage.getItem(KEY) === 'gray'
  } catch { return false }
}

export const GRAY = typeof window !== 'undefined' && readTheme()
if (GRAY) document.documentElement.classList.add('zp-gray')

export function setGrayTheme(on) {
  try { localStorage.setItem(KEY, on ? 'gray' : 'default') } catch { /* ignore */ }
  window.location.reload()
}

const CARD = '#242526'
const COLOR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b/g

function parse(c) {
  if (c === 'white') return { r: 255, g: 255, b: 255, a: 1 }
  if (c[0] === '#') {
    const h = c.length === 4 ? c.slice(1).replace(/./g, (x) => x + x) : c.slice(1)
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }
  }
  const p = c.slice(c.indexOf('(') + 1, -1).split(/[\s,/]+/).filter(Boolean).map(Number)
  if (p.length < 3 || p.some(Number.isNaN)) return null
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
}

function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l, chroma: d }
}

const out = (h, s, l, a) => (a < 1 ? `hsla(${h.toFixed(0)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%,${a})` : `hsl(${h.toFixed(0)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%)`)
const withAlpha = (hex, a) => {
  if (a >= 1) return hex
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

// A light fill: white → card grey; faint greys → a step lighter; light tints → the same hue, dark.
function toneFill(c) {
  if (c.a < 0.6) return null // see-through glass on the dark page: leave it
  const { h, l, chroma } = hsl(c)
  if (l < 0.74) return null
  if (l >= 0.985) return withAlpha(CARD, c.a)
  if (chroma < 0.05) return withAlpha(l >= 0.965 ? '#2D2E30' : '#3A3B3C', c.a)
  if (l >= 0.86) return out(h, 0.32, 0.21, c.a)
  return chroma < 0.12 ? withAlpha('#4E4F50', c.a) : out(h, 0.34, 0.3, c.a)
}

function toneLine(c) {
  if (c.a < 0.6) return null
  const { h, l, chroma } = hsl(c)
  if (l < 0.74) return null
  return chroma < 0.1 ? withAlpha('#3E4042', c.a) : out(h, 0.22, 0.3, c.a)
}

// Text: near-black → near-white, slate greys → light greys, coloured text lifted to read on grey.
function toneText(c) {
  const { h, s, l, chroma } = hsl(c)
  if (chroma < 0.2) {
    if (l < 0.22) return withAlpha('#E4E6EB', c.a)
    if (l < 0.42) return withAlpha('#CED0D4', c.a)
    if (l < 0.55) return withAlpha('#B0B3B8', c.a)
    return null
  }
  if (l >= 0.62) return null
  return out(h, Math.min(s, 0.8), 0.68, c.a)
}

// Softened white: light fills one step down (white → about #EEF2F8), greys towards the same grey-blue,
// light tints keep their colour; light borders follow so they still show against the card.
function softFill(c) {
  if (c.a < 0.6) return null
  const { h, s, l, chroma } = hsl(c)
  if (l < 0.9) return null
  return chroma < 0.06 ? out(216, 0.45, l - 0.047, c.a) : out(h, s, l - 0.035, c.a)
}
function softLine(c) {
  if (c.a < 0.6) return null
  const { h, s, l, chroma } = hsl(c)
  if (l < 0.85) return null
  return chroma < 0.06 ? out(216, 0.3, l - 0.05, c.a) : out(h, s, l - 0.04, c.a)
}
const softKindOf = (prop) => (/^background/.test(prop) ? softFill : /^(border|outline|column-rule)/.test(prop) ? softLine : null)

const kindOf = (prop) => {
  if (/^(color|caret-color|text-decoration-color|-webkit-text-fill-color|fill|stroke)$/.test(prop)) return toneText
  if (/^background/.test(prop)) return toneFill
  if (/^(border|outline|box-shadow|column-rule)/.test(prop)) return toneLine
  return null
}

const swap = (val, fn) => val.replace(COLOR, (m) => {
  const c = parse(m)
  return (c && fn(c)) || m
})

// A filled colour button keeps its text as it is (white on blue, dark on yellow…).
const solidFill = (bg) => {
  if (!bg) return false
  const m = bg.match(COLOR)
  if (!m) return false
  return m.some((x) => { const c = parse(x); if (!c || c.a < 0.6) return false; const { l, chroma } = hsl(c); return chroma >= 0.2 && l < 0.86 })
}

/** Tone one style: [[cssProp, value], …] → the same list with greys for the trial look. */
export function tone(decls) {
  if (!GRAY) return soften(decls)
  const bg = decls.find(([p]) => p === 'background' || p === 'background-color' || p === 'background-image')
  const keepText = solidFill(bg && bg[1])
  // gradient lettering (background clipped to the text, like the page titles) is words, not a box: leave it
  const clipText = decls.some(([p, v]) => /background-clip$/.test(p) && /text/.test(v))
  return decls.map(([p, v]) => {
    const fn = kindOf(p)
    if (!fn || (keepText && fn === toneText) || (clipText && fn === toneFill)) return [p, v]
    return [p, swap(v, fn)]
  })
}

function soften(decls) {
  const clipText = decls.some(([p, v]) => /background-clip$/.test(p) && /text/.test(v))
  if (clipText) return decls
  return decls.map(([p, v]) => { const fn = softKindOf(p); return fn ? [p, swap(v, fn)] : [p, v] })
}

/** Tone a "a:b; c:d" string (hover and ::after rules). */
export function toneCss(text) {
  if (!text) return text
  const decls = text.split(';').map((d) => { const i = d.indexOf(':'); return i < 0 ? null : [d.slice(0, i).trim(), d.slice(i + 1).trim()] }).filter((d) => d && d[0])
  return tone(decls).map(([p, v]) => `${p}:${v}`).join(';') + ';'
}

/** Tone a React style object written by hand (style={{ … }}). */
export function toneObj(obj) {
  if (!obj) return obj
  const keys = Object.keys(obj)
  const decls = keys.map((k) => [k.startsWith('--') ? k : k.replace(/[A-Z]/g, (x) => '-' + x.toLowerCase()), typeof obj[k] === 'string' ? obj[k] : null])
  const toned = tone(decls.filter((d) => d[1] != null))
  const res = { ...obj }
  let j = 0
  keys.forEach((k, i) => { if (decls[i][1] != null) res[k] = toned[j++][1] })
  return res
}
