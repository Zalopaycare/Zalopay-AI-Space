// Records the teaser scenes frame by frame (30fps) with a virtual clock for CSS animations.
const { chromium } = require('playwright')
const fs = require('fs')
const [,, S, ONLY] = process.argv
const FPS = 30, DT = 1000 / FPS
const APP = 'http://localhost:3011'

const VT = `window.__vt=0;window.__step=(dt)=>{window.__vt+=dt;for(const a of document.getAnimations()){if(a.__s===undefined)a.__s=window.__vt-dt-(a.currentTime||0);a.pause();a.currentTime=window.__vt-a.__s}}`
const CAP_CSS = `@import url("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700&display=block");
#zp-cap{position:fixed;left:50%;bottom:56px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;
 padding:22px 40px;border-radius:22px;background:rgba(6,12,40,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
 border:1px solid rgba(140,180,255,.35);box-shadow:0 18px 60px rgba(0,0,0,.45),0 0 40px rgba(60,120,255,.35);text-align:center;
 font-family:"Be Vietnam Pro",system-ui,sans-serif;color:#fff;animation:zpcap .6s cubic-bezier(.2,.7,.3,1) both;white-space:nowrap}
#zp-cap b{display:block;font-size:40px;font-weight:700;letter-spacing:-.01em;background:linear-gradient(90deg,#fff,#9cc8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
#zp-cap span{display:block;margin-top:6px;font-size:24px;color:#cfdcff}
@keyframes zpcap{from{opacity:0;transform:translate(-50%,24px)}to{opacity:1;transform:translate(-50%,0)}}
#zp-ring{position:fixed;z-index:2147483646;pointer-events:none;border-radius:18px;border:3px solid #6fb2ff;
 box-shadow:0 0 0 9999px rgba(2,6,20,.55),0 0 40px 8px rgba(80,150,255,.8);animation:zpring .7s ease-out both}
@keyframes zpring{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:scale(1)}}
#zp-cur{position:fixed;z-index:2147483647;pointer-events:none;width:28px;height:28px;margin:-4px 0 0 -4px;transition:none}
html,body,*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}`

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, storageState: S + '/state.json' })
  await ctx.addInitScript(VT)
  const p = await ctx.newPage()
  let dir, n
  const scene = (name) => { dir = `${S}/rec/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); n = 0 }
  const shot = async (k = 1, fn) => { for (let i = 0; i < k; i++) { if (fn) await fn(i / Math.max(1, k - 1), i); await p.evaluate((dt) => window.__step(dt), DT); await p.screenshot({ path: `${dir}/f${String(n++).padStart(4, '0')}.png` }) } }
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  const prep = async () => { await p.addStyleTag({ content: CAP_CSS }); await p.evaluate(() => document.fonts.load('700 40px "Be Vietnam Pro"')); await p.evaluate(() => document.fonts.ready) }
  const caption = (title, sub) => p.evaluate(([t, s]) => { document.getElementById('zp-cap')?.remove(); const d = document.createElement('div'); d.id = 'zp-cap'; d.innerHTML = `<b>${t}</b><span>${s}</span>`; document.body.appendChild(d) }, [title, sub])
  const ring = (box) => p.evaluate((r) => { document.getElementById('zp-ring')?.remove(); if (!r) return; const d = document.createElement('div'); d.id = 'zp-ring'; Object.assign(d.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); document.body.appendChild(d) }, box)
  const scrollTo = (y) => p.evaluate((y) => window.scrollTo(0, y), y)
  const go = async (url) => { await p.goto(APP + url); await p.waitForLoadState('networkidle'); await p.waitForTimeout(400); await prep() }
  const want = (k) => !ONLY || ONLY.split(',').includes(k)
  // pre-load web fonts used in captions
  await p.goto(APP + '/'); await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700&display=block' }).catch(() => {})

  const intro = async (name, hash, from, to) => {
    scene(name)
    await p.goto('file://' + S + '/b1080/banner-intro-1080.html' + hash); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
    for (let t = from; t < to; t += DT) { await p.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t } }, t); await p.screenshot({ path: `${dir}/f${String(n++).padStart(4, '0')}.png` }) }
  }
  if (want('intro')) await intro('1-intro', '#once', 0, 7000)

  if (want('feed')) {
    scene('2-feed'); await go('/?theme=default')
    await shot(20)
    await caption('AI Space', 'Hỏi đáp, chia sẻ mẹo và công cụ AI cùng các Zalopay Starter')
    await shot(130, (t) => scrollTo(Math.round(ease(Math.min(1, Math.max(0, (t - .25) / .75))) * 330)))
  }
  if (want('popup')) {
    scene('3-popup'); await go('/?theme=default'); await scrollTo(330)
    await caption('Mở post ngay trên trang', 'Đọc trọn bài, bình luận và trả lời mà không rời feed')
    await shot(25)
    await p.getByText('Mọi người đang dùng AI để tóm tắt biên bản họp').first().click()
    await p.waitForTimeout(700)
    await shot(95)
  }
  if (want('events')) {
    scene('4-events'); await go('/?theme=default')
    await shot(12)
    await ring({ x: 1690, y: 78, w: 220, h: 845 })
    await caption('Sự kiện sắp tới', 'Tạo sự kiện, bấm Quan tâm, chia sẻ và bình luận')
    await shot(110)
  }
  if (want('lib')) {
    scene('5-lib'); await go('/use-cases?theme=default')
    await shot(20)
    await caption('Use Case Library', 'Cách các team Zalopay áp dụng AI vào công việc thật')
    await shot(140, (t) => scrollTo(Math.round(ease(Math.min(1, Math.max(0, (t - .2) / .8))) * 700)))
  }
  if (want('detail')) {
    scene('6-detail'); await go('/use-cases?theme=default')
    await p.getByText('Xem Use Case').first().click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(900); await prep()
    await caption('Chia sẻ use case của bạn', 'Bài toán, cách làm, công cụ AI — để ai cũng áp dụng được')
    await shot(120, (t) => scrollTo(Math.round(ease(Math.min(1, Math.max(0, (t - .15) / .85))) * 300)))
  }
  if (want('dark')) {
    scene('7-dark'); await go('/?theme=gray')
    await caption('Khung trắng hoặc chế độ tối', 'Chọn giao diện bạn thích ở góc phải phía trên')
    await ring({ x: 1824, y: 10, w: 76, h: 38 })
    await shot(100)
    await p.goto(APP + '/?theme=default')
  }
  if (want('outro')) await intro('8-outro', '#outro', 2600, 7600)
  await b.close()
})()
