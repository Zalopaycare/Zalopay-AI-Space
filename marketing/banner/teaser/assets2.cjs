const { chromium } = require('playwright')
const [,, S] = process.argv
const V = S + '/fx/v/', APP = 'http://localhost:3011'
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, storageState: S + '/state3.json' })
  const p = await ctx.newPage()
  const go = async (u) => { await p.goto(APP + u); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2500); await p.addStyleTag({ content: '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}' }) }
  const crop = async (name, loc, pad = 4) => { const bb = await loc.boundingBox(); const c = { x: bb.x - pad, y: bb.y - pad, width: bb.width + 2 * pad, height: bb.height + 2 * pad }; await p.screenshot({ path: V + name + '.png', clip: c }); console.log(name, JSON.stringify(c)) }
  // container of a text: climb parents until big enough
  const box = (text, minW, minH) => p.evaluate(([t, w, h]) => {
    const el = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && e.textContent.trim() === t)
    let x = el; while (x && !(x.getBoundingClientRect().width >= w && x.getBoundingClientRect().height >= h)) x = x.parentElement
    const r = x.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, [text, minW, minH])
  const shotBox = async (name, c, pad = 0) => { await p.screenshot({ path: V + name + '.png', clip: { x: c.x - pad, y: c.y - pad, width: c.width + 2 * pad, height: c.height + 2 * pad } }); console.log(name, JSON.stringify(c)) }
  await go('/?theme=default'); await p.screenshot({ path: V + 'feed.png' })
  await crop('btn-event', p.getByText('+ Tạo sự kiện').first(), 6)
  await crop('btn-interest', p.getByText('Quan tâm', { exact: true }).first(), 6)
  await crop('btn-post', p.getByText('Đăng post', { exact: true }).nth(1), 6)
  await crop('composer', p.getByText('Bạn có gì muốn hỏi hay chia sẻ về AI?').locator('xpath=ancestor::*[contains(@style,"border") or self::div][3]'), 0).catch((e) => console.log('composer fail'))
  await shotBox('events', await box('Sự kiện sắp tới', 190, 600), 8)
  await p.getByText('+ Tạo sự kiện').first().click(); await p.waitForTimeout(1200)
  await shotBox('evform', await box('Đăng sự kiện', 560, 700))
  await go('/?theme=default')
  await p.getByText('Quan tâm', { exact: true }).first().click(); await p.waitForTimeout(1000)
  await shotBox('events-int', await box('Sự kiện sắp tới', 190, 600), 8)
  await p.screenshot({ path: V + 'feed-int.png' })
  await go('/?theme=default')
  await p.getByText('Bạn có gì muốn hỏi hay chia sẻ về AI?').click(); await p.waitForTimeout(1200)
  await p.screenshot({ path: V + 'compose-full.png' })
  await go('/use-cases?theme=default'); await p.screenshot({ path: V + 'lib.png' })
  await crop('btn-share', p.getByText('Chia sẻ use case', { exact: true }).nth(1), 6)
  await crop('btn-view', p.getByText('Xem Use Case').first(), 8)
  await p.getByText('Xem Use Case').first().click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2000)
  await p.screenshot({ path: V + 'detail.png' })
  await b.close()
})()
