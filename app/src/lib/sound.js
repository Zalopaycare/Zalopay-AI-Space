// Small sounds, made in the browser (Web Audio, no files): a soft "pop" when something you did goes
// through (Quan tâm, a comment sent, a toast like "Đã copy"), and a two-note chime when a new notification
// arrives. Browsers only allow sound after the person has clicked or typed on the page, so nothing
// plays before that; anything going wrong is silent.

let ctx = null
function audio() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) { try { ctx = new AC() } catch { return null } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}
// unlock on the first click / key press, so a notification later can be heard
if (typeof window !== 'undefined') {
  const unlock = () => { audio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

function tone(a, { freq, start, dur, gain, type = 'sine' }) {
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(a.destination)
  o.start(start)
  o.stop(start + dur + 0.02)
}

let last = 0
/** 'tap' (an action went through) or 'notify' (a new notification). */
export function playSound(kind = 'tap') {
  try {
    const a = audio()
    if (!a || a.state !== 'running') return
    const now = a.currentTime
    // several actions at once make one sound
    if (now - last < 0.08) return
    last = now
    if (kind === 'notify') {
      tone(a, { freq: 880, start: now, dur: 0.22, gain: 0.08 })
      tone(a, { freq: 1318.5, start: now + 0.11, dur: 0.32, gain: 0.07 })
    } else {
      tone(a, { freq: 660, start: now, dur: 0.09, gain: 0.06, type: 'triangle' })
      tone(a, { freq: 990, start: now + 0.035, dur: 0.1, gain: 0.04 })
    }
  } catch { /* no sound then */ }
}
