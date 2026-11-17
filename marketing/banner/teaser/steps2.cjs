const { chromium } = require('playwright')
const [,, S] = process.argv
const V = S + '/fx/v/', APP = 'http://localhost:3011'
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, storageState: S + '/state3.json' })
  const p = await ctx.newPage()
  await p.goto(APP + '/use-cases/c9?theme=default'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2000)
  await p.getByText('2. Tự áp dụng').first().click(); await p.waitForTimeout(1500)
  const box = () => p.evaluate(() => {
    const el = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Hỏi về quy trình')
    let x = el; while (x && !(x.getBoundingClientRect().width >= 850 && x.getBoundingClientRect().height >= 200)) x = x.parentElement
    window.__box = x; const r = x.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  for (let i = 1; i <= 5; i++) {
    const c = await box(); console.log(i, JSON.stringify(c))
    await p.screenshot({ path: `${V}step${i}.png`, clip: { ...c, height: 196 } })
    if (i < 5) { await p.evaluate(() => { const y = window.scrollY; [...window.__box.querySelectorAll('button')].find((b) => /Tiếp/.test(b.textContent)).click(); window.scrollTo(0, y) }); await p.waitForTimeout(700); await p.evaluate(() => { const b = window.__box.getBoundingClientRect(); if (b.y < 60 || b.y > 700) window.scrollBy(0, b.y - 492) }); await p.waitForTimeout(400) }
  }
  await b.close()
})()
