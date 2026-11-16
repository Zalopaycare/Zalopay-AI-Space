const { chromium } = require('playwright')
const [,, S] = process.argv
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  await p.goto('file://' + S + '/b1080/banner-intro-1080.html#logo'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
  let n = 0
  for (let t = 2600; t < 7600; t += 1000 / 30) { await p.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t } }, t); await p.screenshot({ path: `${S}/rec/9-logo/f${String(n++).padStart(4, '0')}.png` }) }
  await b.close()
})()
