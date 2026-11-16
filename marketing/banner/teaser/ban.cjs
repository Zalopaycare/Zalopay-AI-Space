const { chromium } = require('playwright')
const fs = require('fs')
const [,, S, HASH, OUT, T0, T1, K] = process.argv
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  await p.goto('file://' + S + '/b1080/banner-intro-1080.html' + HASH); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })
  let n = 0
  for (let t = +T0; t < +T1; t += 1000 / 30 * +K) { await p.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t } }, t); await p.screenshot({ path: `${OUT}/f${String(n++).padStart(4, '0')}.png` }) }
  console.log(OUT, n); await b.close()
})()
