// Small helpers that let us port the design's inline `style="a:b; c:d;"` strings
// and `style-hover="..."` pseudo-class strings almost verbatim into React,
// instead of hand-converting every declaration into a JS object literal.

import { tone, toneCss } from './theme.js'

const styleCache = new Map()

/** Parse a CSS declaration string ("color:#fff; font-size:12px;") into a React style object. */
export function css(str) {
  if (!str) return undefined
  const hit = styleCache.get(str)
  if (hit) return hit
  const decls = []
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const val = decl.slice(i + 1).trim()
    if (!prop || !val) continue
    decls.push([prop, val])
  }
  const obj = {}
  for (const [prop, val] of tone(decls)) {
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    obj[key] = val
  }
  styleCache.set(str, obj)
  return obj
}

/** Merge two style objects/strings (later wins). Either arg may be undefined. */
export function mergeCss(...parts) {
  return Object.assign({}, ...parts.map((p) => (typeof p === 'string' ? css(p) : p || {})))
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

let hoverStyleEl = null
const hoverMap = new Map()
let hoverCounter = 0

/** Register a `:hover { ...cssText }` rule once and return the className to apply. */
// Hovering a card (a post on AI Space, a use case, a booth): it lifts and a strong blue glow spreads
// around it. !important: the cards set their own border and shadow inline.
export const CARD_HOVER = 'transform:translateY(-3px) !important; border-color:rgba(100,155,255,.95) !important; box-shadow:0 0 0 1px rgba(80,140,255,.5), 0 0 30px 4px rgba(50,115,255,.55), 0 0 70px 14px rgba(44,95,255,.3), 0 18px 40px rgba(0,0,0,.3) !important;'

export function hoverClass(cssText) {
  if (!cssText) return ''
  let cls = hoverMap.get(cssText)
  if (cls) return cls
  cls = 'hv' + hoverCounter++
  hoverMap.set(cssText, cls)
  if (!hoverStyleEl) {
    hoverStyleEl = document.createElement('style')
    hoverStyleEl.setAttribute('data-hover-styles', '')
    document.head.appendChild(hoverStyleEl)
  }
  hoverStyleEl.appendChild(document.createTextNode(`.${cls}:hover{${toneCss(cssText)}}`))
  return cls
}

const afterMap = new Map()
let afterCounter = 0

/** Register a `::after { ...cssText }` rule once and return the className to apply. */
export function afterClass(cssText) {
  if (!cssText) return ''
  let cls = afterMap.get(cssText)
  if (cls) return cls
  cls = 'af' + afterCounter++
  afterMap.set(cssText, cls)
  if (!hoverStyleEl) {
    hoverStyleEl = document.createElement('style')
    hoverStyleEl.setAttribute('data-hover-styles', '')
    document.head.appendChild(hoverStyleEl)
  }
  hoverStyleEl.appendChild(document.createTextNode(`.${cls}::after{${toneCss(cssText)}}`))
  return cls
}
