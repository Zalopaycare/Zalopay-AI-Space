const { chromium } = require('playwright')
const [,, S] = process.argv
const V = S + '/fx/v/', APP = 'http://localhost:3011'
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, storageState: S + '/state3.json' })
  const p = await ctx.newPage()
  await p.goto(APP + '/use-cases?theme=default'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2500)
  await p.addStyleTag({ content: '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}' })
  const n = await p.evaluate(() => {
    let k = 0
    for (const el of [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && /Ảnh bìa sẽ được cập nhật sau/.test(e.textContent))) {
      let x = el; while (x.parentElement && x.parentElement.getBoundingClientRect().width < 200) x = x.parentElement
      x.style.display = 'none'; k++
    }
    return k
  })
  console.log('hidden', n); await p.waitForTimeout(500)
  await p.screenshot({ path: V + 'lib.png' })
  const cards = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.textContent.trim().startsWith('Xem Use Case') && e.textContent.trim().length < 20 && !e.querySelector('*:not(svg):not(path)')).slice(0, 3).map((el) => {
    let x = el; while (x && x.getBoundingClientRect().width < 750) x = x.parentElement
    const r = x.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }
  }))
  for (const [i, c] of cards.entries()) { await p.screenshot({ path: `${V}uc${i + 1}.png`, clip: c }); console.log(i, JSON.stringify(c)) }
  const bb = await p.getByText('Xem Use Case').first().boundingBox()
  await p.screenshot({ path: V + 'btn-view.png', clip: { x: bb.x - 8, y: bb.y - 8, width: bb.width + 34, height: bb.height + 16 } })
  await b.close()
})()
