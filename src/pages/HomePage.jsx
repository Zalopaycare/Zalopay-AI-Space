import { Fragment, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import TopNav from '../components/TopNav.jsx'
import ImageSlot from '../components/ImageSlot.jsx'
import { useHeroScene } from '../hooks/useHeroScene.js'
import { homeCards } from '../data/homeCards.js'
import { QUESTIONS, replyLabel } from '../data/homeQuestions.js'
import { orbitTiles, stepIcons } from '../data/orbitIcons.js'

const HOME_NOTIFICATIONS = [
  { text: 'HaiPD đã trả lời câu hỏi của bạn về tóm tắt PDF dài', href: '/questions', time: '2 giờ trước', unread: true, iconText: 'A', iconBg: '#E7ECFB', iconFg: '#2c5fff' },
  { text: 'QuyenNT đã mention bạn trong một bình luận', href: '/questions', time: '1 giờ trước', unread: true, iconText: '@', iconBg: '#F1E7FF', iconFg: '#6F0CE2' },
  { text: 'Use case "Tóm tắt phản hồi khách hàng theo tuần" đã được duyệt', href: '/use-cases', time: 'Hôm qua', unread: true, iconText: '✓', iconBg: '#E7F9F0', iconFg: '#00893F' },
  { text: 'Use case "Auto QA script" bị từ chối — xem lý do trong My Posts', href: '/profile#posts', time: '2 ngày trước', unread: false, iconText: '!', iconBg: '#FFECEC', iconFg: '#D8232A' },
]

const steps = [
  { icon: 'fileText', glow: 'rgba(120,180,255,.5)', title: '1. Điền form ngắn', desc: 'Chia sẻ workflow & tài liệu liên quan của bạn', showArrow: false },
  { icon: 'userRound', glow: 'rgba(0,231,122,.5)', title: '2. AI Hub team hỗ trợ', desc: 'Phỏng vấn nhanh và giúp bạn viết lại theo template chuẩn', showArrow: true },
  { icon: 'messages', glow: 'rgba(160,140,255,.5)', title: '3. Lan tỏa giá trị', desc: 'Use case của bạn được publish để mọi người cùng sử dụng', showArrow: true },
]

function makeStars() {
  const R = () => Math.random()
  return Array.from({ length: 34 }, () => ({
    left: (R() * 100).toFixed(1) + '%',
    top: (R() * 58).toFixed(1) + '%',
    size: (1 + Math.round(R() * 2)) + 'px',
    dur: (2.2 + R() * 3).toFixed(2) + 's',
    delay: '-' + (R() * 4).toFixed(2) + 's',
  }))
}

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const heroRef = useRef(null)
  const orbitRef = useRef(null)
  const sphereRef = useRef(null)
  useHeroScene({ heroRef, orbitRef, sphereRef })
  const [stars] = useState(makeStars)

  const [tab, setTab] = useState('all')
  const [saved, setSaved] = useState({})
  const [query, setQuery] = useState('')
  const [openQ, setOpenQ] = useState(null)
  const [modalDraft, setModalDraft] = useState('')
  const [votes, setVotes] = useState({})
  const [newAnswers, setNewAnswers] = useState({})

  const cards = (tab === 'all' ? homeCards : homeCards.filter((c) => c.category === tab)).slice(0, 5)

  // ---- search ----
  const q = query.trim()
  const hasQuery = !!q
  let srUseCases = [], srQuestions = []
  if (hasQuery) {
    const k = q.toLowerCase()
    const hit = (...fields) => fields.filter(Boolean).join(' ').toLowerCase().indexOf(k) >= 0
    srUseCases = homeCards
      .filter((c) => hit(c.title, c.desc, c.author, c.team, c.tools.join(' '), c.categoryLabel))
      .slice(0, 5)
      .map((c) => ({ title: c.title, meta: [c.author, c.tools.join(', '), c.categoryLabel].filter(Boolean).join(' · '), href: `/use-cases/${c.id}` }))
    srQuestions = QUESTIONS
      .filter((x) => hit(x.title, x.body, x.author, x.team, x.category, (x.tools || []).join(' ')))
      .slice(0, 5)
      .map((x) => ({ title: x.title, meta: [x.author, x.category, x.resolved ? 'Resolved' : 'Waiting for answers'].join(' · '), href: `/questions#q=${x.id}` }))
  }
  const srEmpty = hasQuery && srUseCases.length === 0 && srQuestions.length === 0

  // ---- questions waiting for answers ----
  const qAnswers = (id) => {
    const base = (QUESTIONS.find((x) => x.id === id) || {}).answers || []
    const extra = newAnswers[id] || []
    return [...base, ...extra].map((a) => ({ ...a, helpful: (a.helpful || 0) + (votes[a.id] ? 1 : 0), iHelped: !!votes[a.id] }))
  }
  const waitingQuestions = QUESTIONS.filter((x) => !x.resolved).slice(0, 4).map((x) => {
    const ans = qAnswers(x.id)
    return { ...x, helpfulTotal: ans.reduce((n, a) => n + a.helpful, 0), replyLabel: replyLabel(ans.length), onOpen: () => setOpenQ(x.id) }
  })
  const modalSrc = openQ ? QUESTIONS.find((x) => x.id === openQ) : null
  const modalAnswers = modalSrc ? qAnswers(openQ).map((a) => ({
    ...a,
    helpColor: a.iHelped ? '#2c5fff' : '#64748b',
    helpFill: a.iHelped ? '#2c5fff' : 'none',
    onHelpful: () => setVotes((v) => ({ ...v, [a.id]: !v[a.id] })),
  })) : []

  const tabStyle = (k) => ({
    bg: tab === k ? '#3366F0' : 'transparent',
    color: tab === k ? '#FFFFFF' : '#dbe6ff',
    shadow: tab === k ? '0 6px 16px rgba(51,102,240,.35)' : 'none',
  })
  const tabAll = tabStyle('all'), tabTech = tabStyle('tech'), tabNon = tabStyle('nontech')

  return (
    <div style={css('width:100%; margin:0 auto; background:#04060d; color:#e8eefc; overflow:hidden;')}>
      {/* ============ HERO ============ */}
      <div ref={heroRef} style={css('position:relative; height:828px; overflow:hidden; background:radial-gradient(130% 100% at 50% -12%, #0c1533 0%, #070b1c 42%, #03050e 74%);')}>
        <div style={css('position:absolute; inset:0; z-index:0; pointer-events:none;')}>
          <div style={css('position:absolute; left:50%; bottom:-160px; width:1260px; height:660px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle at 50% 58%, rgba(58,120,255,.55) 0%, rgba(40,88,228,.32) 34%, rgba(20,50,150,0) 66%); filter:blur(44px); animation:riseGlow 9s ease-in-out infinite;')}></div>
          <div style={css('position:absolute; left:50%; bottom:-96px; width:840px; height:380px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle at 50% 72%, rgba(158,212,255,.7) 0%, rgba(92,162,255,.28) 42%, rgba(92,162,255,0) 72%); filter:blur(40px);')}></div>
          <div style={css('position:absolute; left:-8%; bottom:-6%; width:560px; height:440px; border-radius:50%; background:radial-gradient(circle,rgba(40,90,230,.4),rgba(40,90,230,0) 68%); filter:blur(48px);')}></div>
          <div style={css('position:absolute; right:-8%; bottom:-6%; width:560px; height:440px; border-radius:50%; background:radial-gradient(circle,rgba(40,90,230,.4),rgba(40,90,230,0) 68%); filter:blur(48px);')}></div>
        </div>

        <div style={css('position:absolute; inset:0; z-index:1; pointer-events:none;')}>
          {stars.map((s, i) => (
            <span key={i} style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px 1px rgba(255,255,255,.7)', animation: `twinkle ${s.dur} ease-in-out infinite`, animationDelay: s.delay }}></span>
          ))}
        </div>

        <div style={css('position:absolute; left:50%; top:516px; width:560px; height:560px; transform:translate(-50%,-50%); z-index:1; border-radius:50%; background:radial-gradient(circle,rgba(60,132,255,.34) 0%,rgba(60,132,255,0) 62%); filter:blur(30px); pointer-events:none;')}></div>

        <div style={css('position:absolute; top:0; left:0; right:0; z-index:1000;')}>
          <TopNav notifications={HOME_NOTIFICATIONS} />
        </div>

        <div style={css('position:absolute; left:0; right:0; top:152px; z-index:900; text-align:center; pointer-events:none;')}>
          <h1 style={css('margin:0; font:700 70px/1.04 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; letter-spacing:-.02em;')}>
            <span style={css('color:rgba(214,226,252,.5);')}>Zalopay </span><span style={css('background:linear-gradient(180deg,#ffffff 0%,#dfeaff 46%,#a9caff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;')}>AI Space</span>
          </h1>
          <p style={css('margin:22px auto 0; max-width:660px; font:400 18px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:rgba(206,219,245,.72); text-wrap:pretty;')}>{t('Use case thực tế. Quy trình thật.')} {t('Xây dựng bởi')} <span style={css('color:#00E27A; font-weight:700;')}>Zalopay Starters</span>.</p>
        </div>

        <div style={css('position:absolute; left:0; right:0; top:318px; z-index:960; pointer-events:none;')}>
          <div style={css('width:640px; margin:0 auto; position:relative; pointer-events:auto;')}>
            <div className={hoverClass('background:rgba(255,255,255,.12); border-color:rgba(160,196,255,.5);')} style={css('display:flex; align-items:center; gap:12px; background:rgba(255,255,255,.07); backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%); border:1px solid rgba(255,255,255,.16); border-radius:14px; padding:15px 20px; box-shadow:0 18px 40px rgba(0,0,0,.28); transition:background .25s,border-color .25s;')}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(200,216,255,.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3-3"></path></svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Tìm use case, câu hỏi, công cụ AI...')} style={css('flex:1; border:none; outline:none; font-size:15px; color:#ffffff; font-family:inherit; background:transparent;')} />
              {hasQuery && (
                <button onClick={() => setQuery('')} style={css('flex:none; width:26px; height:26px; border:none; border-radius:50%; background:rgba(255,255,255,.16); color:#e6eeff; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
              )}
            </div>

            {hasQuery && (
              <div style={css('position:absolute; left:0; right:0; top:64px; background:#fff; border-radius:18px; box-shadow:0 30px 70px rgba(3,12,40,.5); overflow:hidden; text-align:left; max-height:460px; overflow-y:auto;')}>
                {srUseCases.length > 0 && (
                  <>
                    <div style={css('padding:14px 20px 6px; font:800 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8;')}>Use Cases · {srUseCases.length}</div>
                    {srUseCases.map((r, i) => (
                      <a key={i} href={r.href} onClick={(e) => { e.preventDefault(); navigate(r.href) }} className={hoverClass('background:#F4F7FE;')} style={css('display:flex; gap:12px; align-items:flex-start; padding:11px 20px; text-decoration:none;')}>
                        <span style={css('flex:none; margin-top:2px; width:30px; height:30px; border-radius:9px; background:#EAF0FF; color:#2c5fff; display:flex; align-items:center; justify-content:center;')}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"></rect><path d="M3 10h18"></path></svg>
                        </span>
                        <span style={css('flex:1; min-width:0;')}>
                          <span style={css('display:block; font:700 14.5px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{r.title}</span>
                          <span style={css('display:block; margin-top:3px; font:400 12.5px/1.45 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{r.meta}</span>
                        </span>
                      </a>
                    ))}
                  </>
                )}
                {srQuestions.length > 0 && (
                  <>
                    <div style={css('padding:14px 20px 6px; border-top:1px solid #F1F4FA; font:800 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8;')}>Questions · {srQuestions.length}</div>
                    {srQuestions.map((r, i) => (
                      <a key={i} href={r.href} onClick={(e) => { e.preventDefault(); navigate(r.href) }} className={hoverClass('background:#F4F7FE;')} style={css('display:flex; gap:12px; align-items:flex-start; padding:11px 20px; text-decoration:none;')}>
                        <span style={css('flex:none; margin-top:2px; width:30px; height:30px; border-radius:9px; background:#FFF1E0; color:#B45300; display:flex; align-items:center; justify-content:center;')}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </span>
                        <span style={css('flex:1; min-width:0;')}>
                          <span style={css('display:block; font:700 14.5px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{r.title}</span>
                          <span style={css('display:block; margin-top:3px; font:400 12.5px/1.45 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{r.meta}</span>
                        </span>
                      </a>
                    ))}
                  </>
                )}
                {srEmpty && (
                  <div style={css('padding:34px 24px 30px; text-align:center;')}>
                    <div style={css('font:800 15.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>Không tìm thấy kết quả cho "{query}"</div>
                    <div style={css('margin:8px auto 0; max-width:400px; font:400 13.5px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{t('Thử từ khoá ngắn hơn, hoặc tên công cụ AI như Claude, Gemini, Copilot.')}</div>
                    <div style={css('display:flex; justify-content:center; gap:10px; margin-top:18px;')}>
                      <button onClick={() => navigate('/use-cases')} style={css('display:inline-flex; align-items:center; height:38px; padding:0 18px; border-radius:999px; border:1px solid #DDE3EC; font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757; text-decoration:none; background:#fff; cursor:pointer;')}>{t('Duyệt Use Cases')}</button>
                      <button onClick={() => navigate('/questions')} style={css('display:inline-flex; align-items:center; height:38px; padding:0 18px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#fff; text-decoration:none; border:none; cursor:pointer;')}>{t('Đặt câu hỏi')}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <canvas ref={sphereRef} width="330" height="330" style={css('position:absolute; left:50%; top:516px; transform:translate(-50%,-50%); z-index:500; pointer-events:none;')}></canvas>

        <div style={css('position:absolute; left:50%; top:516px; transform:translate(-50%,-50%); z-index:720; display:flex; align-items:center; justify-content:center; pointer-events:none;')}>
          <img src="/assets/z-grad.png" alt="Zalopay" style={css('display:block; height:86px; width:auto; filter:drop-shadow(0 6px 22px rgba(6,12,30,.55)) drop-shadow(0 0 16px rgba(90,150,255,.35));')} />
        </div>

        <div ref={orbitRef} style={css('position:absolute; left:50%; top:516px; width:0; height:0; pointer-events:none;')}>
          {orbitTiles.map((tile) => (
            <div key={tile.idx} className="orbit-tile" data-idx={tile.idx} style={css('position:absolute; left:0; top:0; opacity:0; transform:translate(-50%,-50%); will-change:transform,opacity;')}>
              <div style={css('display:flex; flex-direction:column; align-items:center; gap:8px;')}>
                <div style={css('width:54px; height:54px; border-radius:15px; background:rgba(255,255,255,.14); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,.28); box-shadow:0 10px 30px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.42); display:flex; align-items:center; justify-content:center;')}>
                  <img src={tile.icon} width={34} height={34} alt="" style={{ display: 'block' }} />
                </div>
                <span style={css('font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#fff; text-shadow:0 1px 6px rgba(0,0,0,.6); white-space:nowrap;')}>{tile.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={css('position:absolute; left:0; right:0; top:712px; z-index:950; text-align:center;')}>
          <a href="#featured" style={css('display:inline-flex; align-items:center; gap:12px; height:58px; padding:0 12px 0 30px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; box-shadow:0 16px 42px rgba(44,95,255,.6), inset 0 1px 0 rgba(255,255,255,.38);')}>
            {t('Khám phá ngay')}
            <span style={css('display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.22); animation:bobDown 1.6s ease-in-out infinite;')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg></span>
          </a>
        </div>
      </div>

      {/* sticky CTA cluster */}
      <div style={css('position:fixed; top:0; left:0; width:100%; z-index:1500; pointer-events:none;')}>
        <div style={css('position:relative; width:1440px; max-width:100%; margin:0 auto; height:0;')}>
          <div style={css('position:absolute; top:88px; right:40px; pointer-events:auto; width:196px; display:flex; flex-direction:column; gap:10px; padding:16px; border-radius:20px; background:rgba(255,255,255,.9); backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%); border:1px solid rgba(160,185,235,.5); box-shadow:0 18px 44px rgba(12,32,80,.22); animation:wiggleCall 3.4s ease-in-out infinite;')}>
            <button onClick={() => navigate('/use-cases?share=1')} className={hoverClass('transform:translateY(-2px); box-shadow:0 14px 28px rgba(10,60,200,.4);')} style={css('display:flex; align-items:center; gap:9px; height:44px; padding:0 14px; border-radius:13px; background:linear-gradient(120deg,#0033C9,#1266e6); color:#fff; font:800 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; text-decoration:none; box-shadow:0 8px 20px rgba(10,60,200,.3); transition:transform .16s ease,box-shadow .16s ease; border:none; cursor:pointer;')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>{t('Chia sẻ Use Case')}
            </button>
            <button onClick={() => navigate('/questions')} className={hoverClass('transform:translateY(-2px); background:#F2F6FF;')} style={css('display:flex; align-items:center; gap:9px; height:44px; padding:0 14px; border-radius:13px; background:#fff; border:1px solid #CFE0FF; color:#0033C9; font:800 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; text-decoration:none; transition:transform .16s ease,background .16s ease; cursor:pointer;')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.2-1.6 2.4"></path><path d="M12 18h.01"></path><circle cx="12" cy="12" r="9.5"></circle></svg>{t('Đặt câu hỏi')}
            </button>
          </div>
        </div>
      </div>

      {/* ============ FEATURED USE CASES ============ */}
      <section id="featured" style={css('position:relative; padding:56px 272px 60px 40px; background:linear-gradient(180deg,#05080f 0%,#070c1b 55%,#04060d 100%);')}>
        <h2 style={css('font:900 30px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; letter-spacing:-.01em; margin:0; background:linear-gradient(100deg,#9fd0ff 0%,#6ea8ff 48%,#5ee7ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;')}>{t('Use Case nổi bật')}</h2>
        <div style={css('display:flex; align-items:center; justify-content:space-between; margin-top:18px;')}>
          <div style={css('display:inline-flex; background:rgba(255,255,255,.08); border-radius:16px; padding:7px; gap:6px;')}>
            <button onClick={() => setTab('all')} style={css(`display:inline-flex; align-items:center; gap:9px; border:none; cursor:pointer; height:46px; padding:0 22px; border-radius:12px; font:700 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; background:${tabAll.bg}; color:${tabAll.color}; box-shadow:${tabAll.shadow};`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>{t('Tất cả')}
            </button>
            <button onClick={() => setTab('tech')} style={css(`display:inline-flex; align-items:center; gap:9px; border:none; cursor:pointer; height:46px; padding:0 22px; border-radius:12px; font:700 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; background:${tabTech.bg}; color:${tabTech.color}; box-shadow:${tabTech.shadow};`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg>{t('Do team tech')}
            </button>
            <button onClick={() => setTab('nontech')} style={css(`display:inline-flex; align-items:center; gap:9px; border:none; cursor:pointer; height:46px; padding:0 22px; border-radius:12px; font:700 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; background:${tabNon.bg}; color:${tabNon.color}; box-shadow:${tabNon.shadow};`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 0 0-16 0"></path></svg>{t('Do team non-tech')}
            </button>
          </div>
          <button onClick={() => navigate('/use-cases')} className={hoverClass('')} style={css('display:inline-flex; align-items:center; gap:8px; font:800 18px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#9fd0ff; animation:wiggleCall 2.8s ease-in-out infinite; background:none; border:none; cursor:pointer; text-decoration:none;')}>
            {t('Xem thêm use case')}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </button>
        </div>

        <div id="featured-rail" style={css('display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; margin-top:24px; padding:8px 0 18px;')}>
          {cards.map((item) => (
            <div key={item.id} className={hoverClass('transform:translateY(-4px); box-shadow:0 24px 54px rgba(30,50,90,.18); border-color:#CFE0FF;')} style={css('position:relative; display:flex; flex-direction:column; background:#ffffff; border:1px solid #E6EBF3; border-radius:20px; box-shadow:0 14px 36px rgba(30,50,90,.1); transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;')}>
              <div style={css('position:relative; margin:14px 14px 0;')}>
                <div style={css(`position:relative; aspect-ratio:16 / 9; border-radius:14px; overflow:hidden; background:linear-gradient(160deg,#e9eef7,#dde6f2);`)}>
                  <ImageSlot id={item.slotId} shape="rounded" radius={14} placeholder="ảnh use case" />
                  <span style={css('position:absolute; top:12px; left:12px; z-index:2; pointer-events:none; display:inline-flex; align-items:center; gap:7px; height:26px; padding:0 12px 0 10px; border-radius:999px; background:#ffffff; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#1B2430; box-shadow:0 2px 10px rgba(0,0,0,.16);')}>
                    <span style={css('position:relative; display:inline-flex; width:8px; height:8px;')}>
                      <span style={css(`position:absolute; inset:0; border-radius:50%; background:${item.statusGlow}; animation:ping 1.9s cubic-bezier(0,0,.2,1) infinite;`)}></span>
                      <span style={css(`position:relative; width:8px; height:8px; border-radius:50%; background:${item.statusColor};`)}></span>
                    </span>{item.statusLabel}
                  </span>
                  <span style={css('position:absolute; bottom:12px; left:12px; z-index:2; pointer-events:none; white-space:nowrap; display:inline-flex; align-items:center; height:28px; padding:0 13px; border-radius:999px; background:#59667A; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#fff; box-shadow:0 2px 10px rgba(0,0,0,.18);')}>{item.categoryLabel}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSaved((s) => ({ ...s, [item.slotId]: !s[item.slotId] })) }}
                title="Lưu use case"
                style={css(`position:absolute; top:24px; right:24px; z-index:6; width:36px; height:36px; border-radius:11px; background:${saved[item.slotId] ? '#E7F9F0' : '#ffffff'}; border:1px solid ${saved[item.slotId] ? '#00CF6A' : '#E6EBF3'}; box-shadow:0 4px 14px rgba(20,30,60,.16); display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; transition:background .16s ease,border-color .16s ease;`)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={saved[item.slotId] ? '#00CF6A' : 'none'} stroke={saved[item.slotId] ? '#00CF6A' : '#5B6675'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              </button>
              <div style={css('padding:16px 20px 20px; display:flex; flex-direction:column; flex:1;')}>
                <h3 style={css('margin:0; font:800 16px/1.32 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-wrap:pretty;')}>{item.title}</h3>
                <p style={css('margin:10px 0 0; font:400 14px/1.5 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5B6675; text-wrap:pretty;')}>{item.desc}</p>
                <div style={{ flex: 1, minHeight: 14 }}></div>
                <div style={css('display:flex; align-items:center; gap:9px; min-width:0;')}>
                  <span style={css('width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex:none; background:#3b82f6;')}>{item.author.slice(0, 1).toUpperCase()}</span>
                  <span style={css('font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; white-space:nowrap;')}>{item.author}</span>
                  <span style={css('color:#CDD5DD;')}>·</span>
                  <span style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5B6675; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;')}>{item.team}</span>
                </div>
                <div style={css('display:flex; flex-wrap:wrap; gap:8px; margin-top:16px;')}>
                  {item.tools.map((tool) => (
                    <span key={tool} style={css('display:inline-flex; align-items:center; height:38px; padding:0 16px; border:1px solid #DDE3EC; border-radius:11px; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757; background:#fff;')}>{tool}</span>
                  ))}
                </div>
                <button onClick={() => navigate(`/use-cases/${item.id}`)} className={hoverClass('transform:translateY(-1px); box-shadow:0 12px 26px rgba(44,95,255,.46), inset 0 1px 0 rgba(255,255,255,.42);')} style={css('margin-top:16px; position:relative; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; gap:9px; width:100%; height:48px; border:1px solid rgba(255,255,255,.35); cursor:pointer; border-radius:14px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; box-shadow:0 8px 18px rgba(44,95,255,.34), inset 0 1px 0 rgba(255,255,255,.35); transition:transform .18s ease,box-shadow .18s ease;')}>
                  {t('Xem Use Case')}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </div>
            </div>
          ))}
          <a href="/use-cases" onClick={(e) => { e.preventDefault(); navigate('/use-cases') }} className={hoverClass('transform:translateY(-4px); box-shadow:0 24px 54px rgba(30,50,90,.16); border-color:#2c5fff;')} style={css('flex:0 0 260px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; text-decoration:none; border:1.5px dashed #B6CBF2; border-radius:20px; background:linear-gradient(160deg,rgba(255,255,255,.9),rgba(233,240,252,.8)); transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;')}>
            <span style={css('display:flex; align-items:center; justify-content:center; width:56px; height:56px; border-radius:50%; background:linear-gradient(120deg,#0033C9,#1266e6); box-shadow:0 10px 24px rgba(10,60,200,.32);')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </span>
            <span style={css('font:800 17px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0033C9; text-align:center; padding:0 20px;')}>{t('Xem thêm use case')}</span>
            <span style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{t('Xem toàn bộ thư viện')}</span>
          </a>
        </div>
      </section>

      {/* ============ QUESTIONS WAITING FOR ANSWERS ============ */}
      <section id="waiting" style={css('position:relative; padding:8px 272px 58px 40px; background:#04060d;')}>
        <div style={css('display:flex; align-items:flex-end; justify-content:space-between; gap:24px;')}>
          <div>
            <h2 style={css('margin:0; font:900 30px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; letter-spacing:-.01em; background:linear-gradient(100deg,#9fd0ff 0%,#6ea8ff 48%,#5ee7ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;')}>{t('Câu hỏi đang chờ trả lời')}</h2>
            <p style={css('margin:10px 0 0; font:400 15px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#c3d0f5;')}>{t('Đồng nghiệp đang chờ câu trả lời. Một câu trả lời ngắn cũng đủ giúp họ đi tiếp.')}</p>
          </div>
          <button onClick={() => navigate('/questions')} style={css('flex:none; display:inline-flex; align-items:center; gap:8px; font:800 18px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#9fd0ff; text-decoration:none; background:none; border:none; cursor:pointer;')}>
            {t('Xem tất cả câu hỏi')}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </button>
        </div>

        <div style={css('display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-top:24px;')}>
          {waitingQuestions.map((qq) => (
            <div key={qq.id} onClick={qq.onOpen} className={hoverClass('transform:translateY(-3px); box-shadow:0 24px 54px rgba(30,50,90,.18); border-color:#CFE0FF;')} style={css('display:flex; flex-direction:column; background:#ffffff; border:1px solid #E6EBF3; border-radius:20px; padding:20px 22px; box-shadow:0 14px 36px rgba(30,50,90,.1); cursor:pointer; transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;')}>
              <div style={css('display:flex; align-items:center; gap:11px;')}>
                <span style={css(`flex:none; width:36px; height:36px; border-radius:50%; background:${qq.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{qq.initials}</span>
                <span style={css('flex:1; min-width:0;')}>
                  <span style={css('display:block; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{qq.author}</span>
                  <span style={css('display:block; font:400 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{qq.team} · {qq.time}</span>
                </span>
                <span style={css('flex:none; display:inline-flex; align-items:center; height:26px; padding:0 12px; border-radius:999px; background:#FFF1E0; color:#B45300; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{t('Đang chờ trả lời')}</span>
              </div>
              <h3 style={css('margin:14px 0 0; font:800 17px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-wrap:pretty;')}>{qq.title}</h3>
              <p style={css('margin:8px 0 0; font:400 14px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5B6675; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;')}>{qq.body}</p>
              <div style={css('display:flex; align-items:center; gap:8px; margin-top:16px; flex-wrap:wrap;')}>
                <span style={css('display:inline-flex; align-items:center; height:26px; padding:0 11px; border-radius:8px; background:#EAF0FF; color:#2c5fff; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{qq.category}</span>
                {(qq.tools || []).map((tl) => (
                  <span key={tl} style={css('display:inline-flex; align-items:center; height:26px; padding:0 11px; border-radius:8px; background:#F1F4FA; color:#3A4757; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{tl}</span>
                ))}
              </div>
              <div style={css('display:flex; align-items:center; gap:10px; margin-top:14px; padding-top:13px; border-top:1px solid #EEF1F7;')}>
                <span style={css('display:inline-flex; align-items:center; gap:8px; height:32px; padding:0 13px; border:1px solid #E6EBF3; border-radius:999px; background:#F8FAFE; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2c5fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                  <span style={css('color:#2c5fff;')}>{qq.helpfulTotal}</span> {t('hữu ích')}
                </span>
                <span style={css('margin-left:auto; display:inline-flex; align-items:center; gap:8px; height:32px; padding:0 14px; border:1px solid #DDE3EC; border-radius:999px; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  {qq.replyLabel}
                </span>
              </div>
            </div>
          ))}
        </div>

        {modalSrc && (
          <div onClick={() => { setOpenQ(null); setModalDraft('') }} style={css('position:fixed; inset:0; z-index:3000; background:rgba(4,10,26,.62); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:40px 24px;')}>
            <div onClick={(e) => e.stopPropagation()} style={css('width:720px; max-width:100%; max-height:100%; overflow-y:auto; background:#ffffff; border-radius:22px; box-shadow:0 40px 100px rgba(3,12,40,.55);')}>
              <div style={css('display:flex; gap:14px; padding:24px 26px 0;')}>
                <span style={css(`flex:none; width:44px; height:44px; border-radius:50%; background:${modalSrc.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{modalSrc.initials}</span>
                <div style={css('flex:1; min-width:0;')}>
                  <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                    <span style={css('font:800 14.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{modalSrc.author}</span>
                    <span style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{modalSrc.team} · {modalSrc.time}</span>
                    <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${modalSrc.resolved ? '#E7F9F0' : '#FFF1E0'}; color:${modalSrc.resolved ? '#00893F' : '#B45300'}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{modalSrc.resolved ? 'Resolved' : t('Đang chờ trả lời')}</span>
                  </div>
                </div>
                <button onClick={() => { setOpenQ(null); setModalDraft('') }} style={css('flex:none; width:36px; height:36px; border:1px solid #E6EBF3; border-radius:11px; background:#fff; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
              </div>

              <div style={css('padding:16px 26px 0;')}>
                <h3 style={css('margin:0; font:800 21px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-wrap:pretty;')}>{modalSrc.title}</h3>
                <p style={css('margin:11px 0 0; font:400 15px/1.65 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757; white-space:pre-wrap;')}>{modalSrc.body}</p>
                <div style={css('display:flex; align-items:center; gap:8px; margin-top:16px; flex-wrap:wrap;')}>
                  <span style={css('display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:8px; background:#EAF0FF; color:#2c5fff; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{modalSrc.category}</span>
                  {(modalSrc.tools || []).map((tl) => (
                    <span key={tl} style={css('display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:8px; background:#F1F4FA; color:#3A4757; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{tl}</span>
                  ))}
                </div>
                <div style={css('display:flex; align-items:center; gap:10px; margin-top:16px; padding:13px 0 0; border-top:1px solid #EEF1F7;')}>
                  <span style={css('display:inline-flex; align-items:center; gap:8px; height:34px; padding:0 14px; border:1px solid #E6EBF3; border-radius:999px; background:#F8FAFE; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2c5fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                    <span style={css('color:#2c5fff;')}>{modalAnswers.reduce((n, a) => n + a.helpful, 0)}</span> {t('hữu ích')}
                  </span>
                  <span style={css('margin-left:auto; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{replyLabel(modalAnswers.length)}</span>
                </div>
              </div>

              <div style={css('margin-top:18px; padding:18px 26px 22px; background:#F8FAFE; border-top:1px solid #EEF1F7;')}>
                {modalAnswers.map((a) => (
                  <div key={a.id} style={css('display:flex; gap:12px; padding:14px 0; border-bottom:1px solid #EEF1F7;')}>
                    <span style={css(`flex:none; width:34px; height:34px; border-radius:50%; background:${a.avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{a.initials}</span>
                    <div style={css('flex:1; min-width:0;')}>
                      <div style={css('display:flex; align-items:center; gap:8px; flex-wrap:wrap;')}>
                        <span style={css('font:800 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{a.author}</span>
                        <span style={css('font:400 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{a.team} · {a.time}</span>
                      </div>
                      <p style={css('margin:7px 0 0; font:400 14px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>{a.body}</p>
                      <button onClick={a.onHelpful} style={css(`display:inline-flex; align-items:center; gap:7px; margin-top:9px; border:none; background:transparent; padding:0; cursor:pointer; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:${a.helpColor};`)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={a.helpFill} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
                        Hữu ích · {a.helpful}
                      </button>
                    </div>
                  </div>
                ))}
                {modalAnswers.length === 0 && (
                  <div style={css('padding:16px 0 6px; text-align:center; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Chưa có câu trả lời. Câu trả lời đầu tiên thường giúp ích nhất.')}</div>
                )}

                <div style={css('display:flex; gap:12px; margin-top:16px;')}>
                  <span style={css('flex:none; width:34px; height:34px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>NT</span>
                  <div style={{ flex: 1 }}>
                    <textarea value={modalDraft} onChange={(e) => setModalDraft(e.target.value)} rows={3} placeholder={t('Viết câu trả lời của bạn...')} style={css('width:100%; box-sizing:border-box; border:1px solid #DDE3EC; border-radius:14px; padding:12px 14px; font:400 14px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; background:#fff; outline:none; resize:vertical;')}></textarea>
                    <div style={css('display:flex; align-items:center; margin-top:10px;')}>
                      <button onClick={() => navigate('/questions')} style={css('font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3366F0; text-decoration:none; background:none; border:none; cursor:pointer; padding:0;')}>{t('Mở trong Questions')}</button>
                      <button
                        onClick={() => {
                          const body = modalDraft.trim()
                          if (!body) return
                          setNewAnswers((s) => ({ ...s, [openQ]: [...(s[openQ] || []), { id: 'na' + Date.now(), author: 'NgocTA', initials: 'NT', team: 'Product Ops', time: 'Vừa xong', helpful: 0, body, avatarBg: '#2c5fff' }] }))
                          setModalDraft('')
                        }}
                        style={css(`margin-left:auto; height:40px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; opacity:${modalDraft.trim() ? 1 : 0.5};`)}
                      >
                        {t('Đăng câu trả lời')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {waitingQuestions.length === 0 && (
          <div style={css('margin-top:24px; padding:44px 24px; text-align:center; background:#fff; border:1px dashed #C9D4E6; border-radius:20px;')}>
            <div style={css('font:800 16px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Không còn câu hỏi nào đang chờ')}</div>
            <div style={css('margin-top:8px; font:400 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{t('Mọi câu hỏi đều đã có người trả lời. Bạn có thể đặt câu hỏi mới bất cứ lúc nào.')}</div>
          </div>
        )}
      </section>

      {/* ============ SHARE YOUR USE CASE ============ */}
      <section style={css('position:relative; background:#04060d; padding:48px 272px 64px 40px;')}>
        <div style={css('display:flex; gap:40px; align-items:center; background:linear-gradient(120deg,#0033C9 0%,#0a4fe0 52%,#1266e6 100%); border-radius:24px; padding:44px 46px; box-shadow:0 22px 60px rgba(0,40,150,.34); position:relative; overflow:hidden; color:#fff;')}>
          <div style={css('position:absolute; right:-6%; top:-40%; width:520px; height:520px; border-radius:50%; background:radial-gradient(circle,rgba(0,207,106,.4) 0%,rgba(0,207,106,0) 66%); filter:blur(30px); pointer-events:none;')}></div>
          <div style={css('position:absolute; left:24%; bottom:-60%; width:560px; height:420px; border-radius:50%; background:radial-gradient(circle,rgba(90,170,255,.5) 0%,rgba(90,170,255,0) 68%); filter:blur(40px); pointer-events:none;')}></div>
          <div style={css('flex:none; width:440px; position:relative; z-index:2;')}>
            <h2 style={css('margin:0; font:900 27px/1.15 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; letter-spacing:-.01em; color:#fff;')}>Share your AI use case with Us</h2>
            <p style={css('margin:14px 0 0; font:400 15px/1.6 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:rgba(255,255,255,.82);')}>{t('Bạn đang dùng AI để giải quyết công việc hiệu quả hơn?')} {t('Hãy chia sẻ để cùng nhau học hỏi và tạo ra giá trị lớn hơn cho Zalopay.')}</p>
            <div style={css('display:flex; align-items:center; gap:18px; margin-top:26px;')}>
              <button onClick={() => navigate('/use-cases?share=1')} style={css('display:inline-flex; align-items:center; gap:9px; height:50px; padding:0 24px; background:#00CF6A; color:#04180F; border:none; border-radius:999px; font:700 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; text-decoration:none; box-shadow:0 10px 28px rgba(0,207,106,.5);')}>{t('Chia sẻ Use Case')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#04180F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
              </button>
              <button onClick={() => navigate('/questions')} style={css('display:inline-flex; align-items:center; gap:9px; height:50px; padding:0 24px; background:rgba(255,255,255,.14); color:#fff; border:1px solid rgba(255,255,255,.42); border-radius:999px; font:700 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; text-decoration:none;')}>{t('Đặt câu hỏi')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </button>
            </div>
          </div>
          <div style={css('flex:1; display:flex; align-items:flex-start; justify-content:center; gap:6px; position:relative; z-index:2;')}>
            {steps.map((item, i) => (
              <Fragment key={i}>
                {item.showArrow && (
                  <svg width="22" height="22" style={{ flex: 'none', marginTop: 42 }} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                )}
                <div style={css('width:170px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:13px;')}>
                  <div style={css(`position:relative; width:64px; height:64px; border-radius:18px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.3); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; box-shadow:0 0 34px ${item.glow}, inset 0 1px 0 rgba(255,255,255,.35);`)}>
                    <img src={stepIcons[item.icon]} width={28} height={28} alt="" style={{ display: 'block' }} />
                  </div>
                  <div style={css('font:800 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#fff;')}>{item.title}</div>
                  <div style={css('font:400 12.5px/1.5 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:rgba(255,255,255,.72);')}>{item.desc}</div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
