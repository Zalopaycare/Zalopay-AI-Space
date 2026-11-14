const { chromium } = require('playwright')
const fs = require('fs')
const [,, FILE, OUT, ONLY] = process.argv
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  await p.goto('file://' + FILE); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500)
  const total = await p.evaluate(() => window.TOTAL)
  fs.mkdirSync(OUT, { recursive: true })
  const times = ONLY ? ONLY.split(',').map(Number) : Array.from({ length: Math.round(total * 30) }, (_, i) => i / 30)
  let i = 0
  for (const t of times) { await p.evaluate((ms) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms } }, t * 1000); await p.screenshot({ path: `${OUT}/f${String(i++).padStart(5, '0')}.png` }) }
  console.log('total', total, 'frames', i)
  await b.close()
})()
