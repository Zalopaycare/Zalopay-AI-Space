import { showToast } from '../components/Toaster.jsx'

/** Copy text; works without the async Clipboard API too (plain-http pages, older browsers). */
export function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(text)
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      ok ? resolve() : reject(new Error('copy failed'))
    } catch (e) { reject(e) }
  })
}

/** Copy + toast feedback ("Đã copy ✓" / error). */
export function copyWithToast(text, done = 'Đã copy ✓') {
  return copyText(text).then(() => showToast(done)).catch(() => showToast('Không copy được, thử lại'))
}
