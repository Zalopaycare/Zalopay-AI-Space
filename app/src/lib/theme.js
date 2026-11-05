// Dark mode ("Khung xám" in the switch): the page around stays dark; the white cards turn see-through
// dark grey glass (the space backdrop shows through, blurred) and menus / popups solid near-black, with light
// text. Nothing in the pages changes: css() and hoverClass() (lib/style.js) pass every declaration
// through tone(), which swaps light backgrounds and borders for dark ones, dark text for light text, and
// lifts coloured text so it reads on black.
//
// The light look ("Khung trắng", the default) is softened a little: pure white cards on the dark page
// glare, so light fills and borders are taken a small step down to a near-neutral off-white (white →
// about #F3F5F8), the lighter panels and lines inside a card moving with it. Text stays as it is.
// The white cards are what people see first; the last choice is kept per browser (next visits open the same way),
// and turning it on or off reloads the page.

const KEY = 'zp-theme'

function readTheme() {
  try {
    const q = new URLSearchParams(window.location.search).get('theme')
    if (q === 'gray' || q === 'default') localStorage.setItem(KEY, q)
    // white cards unless this browser last picked dark mode
    return localStorage.getItem(KEY) === 'gray'
  } catch { return false }
}

export const GRAY = typeof window !== 'undefined' && readTheme()
if (GRAY) document.documentElement.classList.add('zp-gray')

export function setGrayTheme(on) {
  try { localStorage.setItem(KEY, on ? 'gray' : 'default') } catch { /* ignore */ }
  window.location.reload()
}

// cards: dark grey glass; anything floating (menus, dropdowns, tooltips: position absolute / fixed / sticky)
// stays solid so what's under it doesn't show through
const GLASS = [38, 40, 46, 0.62]
const SOLID = '#0D1222'
const GLASS_BLUR = 'blur(16px) saturate(130%)'
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

// A light fill: white → black glass (solid near-black when floating); faint greys inside a card → a
// faint light wash over it; light tints → the same hue, dark.
const glass = (a) => `rgba(${GLASS[0]},${GLASS[1]},${GLASS[2]},${+(GLASS[3] * a).toFixed(2)})`
function fillTone(floating) {
  return (c) => {
    if (c.a < 0.6) return null // see-through glass on the dark page: leave it
    const { h, l, chroma } = hsl(c)
    if (l < 0.74) return null
    if (l >= 0.985) return floating ? withAlpha(SOLID, c.a) : glass(c.a)
    if (chroma < 0.05) return floating ? withAlpha(l >= 0.965 ? '#161C2D' : '#1F2638', c.a) : `rgba(255,255,255,${l >= 0.965 ? 0.06 : 0.1})`
    if (l >= 0.86) return out(h, 0.32, 0.21, c.a)
    return chroma < 0.12 ? 'rgba(255,255,255,.14)' : out(h, 0.34, 0.3, c.a)
  }
}
const toneFill = fillTone(false)

function toneLine(c) {
  if (c.a < 0.6) return null
  const { h, l, chroma } = hsl(c)
  if (l < 0.74) return null
  return chroma < 0.1 ? 'rgba(255,255,255,.12)' : out(h, 0.22, 0.3, c.a)
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

// Off-white: light fills a small step down, greys towards a barely-blue neutral, light tints keep their
// colour; light borders follow so they still show against the card.
function softFill(c) {
  if (c.a < 0.6) return null
  const { h, s, l, chroma } = hsl(c)
  if (l < 0.9) return null
  return chroma < 0.06 ? out(216, 0.22, l - 0.035, c.a) : out(h, s, l - 0.025, c.a)
}
function softLine(c) {
  if (c.a < 0.6) return null
  const { h, s, l, chroma } = hsl(c)
  if (l < 0.85) return null
  return chroma < 0.06 ? out(216, 0.18, l - 0.035, c.a) : out(h, s, l - 0.03, c.a)
}
const softKindOf = (prop) => (/^background/.test(prop) ? softFill : /^(border|outline|column-rule)/.test(prop) ? softLine : null)
function soften(decls) {
  if (decls.some(([p, v]) => /background-clip$/.test(p) && /text/.test(v))) return decls
  return decls.map(([p, v]) => { const fn = softKindOf(p); return fn ? [p, swap(v, fn)] : [p, v] })
}

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
  const pos = (decls.find(([p]) => p === 'position') || [])[1]
  const floating = pos === 'absolute' || pos === 'fixed' || pos === 'sticky'
  const fill = floating ? fillTone(true) : toneFill
  let glassed = false
  const res = decls.map(([p, v]) => {
    const fn = kindOf(p)
    if (!fn || (keepText && fn === toneText) || (clipText && fn === toneFill)) return [p, v]
    if (fn === toneFill) {
      const nv = swap(v, fill)
      if (!floating && nv !== v && nv.includes(`rgba(${GLASS[0]},${GLASS[1]},${GLASS[2]},`)) glassed = true
      return [p, nv]
    }
    return [p, swap(v, fn)]
  })
  // glass blurs what's behind it, so text on it stays readable
  if (glassed && !decls.some(([p]) => p === 'backdrop-filter')) res.push(['backdrop-filter', GLASS_BLUR], ['-webkit-backdrop-filter', GLASS_BLUR])
  // and a faint edge, so a card still shows where the page behind is just as dark
  if (glassed && !decls.some(([p]) => /^(border|outline)$/.test(p))) res.push(['outline', '1px solid rgba(160,190,255,.14)'], ['outline-offset', '-1px'])
  return res
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
