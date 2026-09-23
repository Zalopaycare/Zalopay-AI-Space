import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { api, relativeTime } from '../lib/api.js'
import TopNav from '../components/TopNav.jsx'
import { allCases, avatarColor } from '../data/useCases.js'

const UCS = {
  approved: { label: 'Published', bg: '#E7F9F0', color: '#00893F' },
  pending: { label: 'Pending Review', bg: '#FFF1E0', color: '#B45300' },
  rejected: { label: 'Rejected', bg: '#FFECEC', color: '#D8232A' },
}

export default function ProfilePage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [postFilter, setPostFilter] = useState('all')

  const [myQuestions, setMyQuestions] = useState([])
  const [savedQuestions, setSavedQuestions] = useState([])
  const [answersGiven, setAnswersGiven] = useState(0)
  const [myUseCases, setMyUseCases] = useState([])
  const [savedUseCaseIds, setSavedUseCaseIds] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) { setLoaded(true); return }
    Promise.all([
      api.listQuestions(),
      api.listSubmissions('?mine=1'),
      api.mySavedUseCaseIds(),
    ]).then(([qd, sd, savedIds]) => {
      const mine = qd.questions.filter((q) => q.author === user.name)
      setMyQuestions(mine)
      setSavedQuestions(qd.questions.filter((q) => q.saved))
      let answered = 0
      qd.questions.forEach((q) => q.answers.forEach((a) => { if (a.author === user.name) answered++ }))
      setAnswersGiven(answered)
      setMyUseCases(sd.submissions)
      setSavedUseCaseIds(savedIds.ids)
    }).finally(() => setLoaded(true))
  }, [user])

  if (!user) {
    return (
      <div style={css('min-height:100vh; background:#04060d; color:#e8eefc;')}>
        <TopNav />
        <div style={css('display:flex; align-items:center; justify-content:center; padding:120px 24px;')}>
          <div style={css('font:700 18px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#fff;')}>{t('Bạn cần đăng nhập để xem hồ sơ.')}</div>
        </div>
      </div>
    )
  }

  const posts = []
    .concat(myQuestions.map((q) => ({
      kind: 'Question', kindBg: '#E7ECFB', kindColor: '#2c5fff', type: 'question',
      title: q.title, desc: q.body, category: [].concat(q.category).join(', '), time: relativeTime(q.time),
      statusLabel: q.resolved ? 'Resolved' : 'Waiting for answers',
      statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0', statusColor: q.resolved ? '#00893F' : '#B45300',
      metric: q.answers.length + ' answers', href: '/questions', cta: 'Xem thread', hasReason: false, reason: '',
    })))
    .concat(myUseCases.map((c) => {
      const st = UCS[c.reviewStatus] || UCS.pending
      return {
        kind: 'Use Case', kindBg: '#E7F9F0', kindColor: '#00893F', type: 'usecase',
        title: c.title, desc: c.problem, category: [].concat(c.category).join(', '), time: relativeTime(c.time),
        statusLabel: st.label, statusBg: st.bg, statusColor: st.color,
        metric: c.reviewStatus === 'approved' ? 'Đã publish' : 'Chưa publish',
        href: c.reviewStatus === 'rejected' ? '/use-cases?share=1' : '/use-cases',
        cta: c.reviewStatus === 'rejected' ? 'Sửa & gửi lại' : 'Xem trạng thái',
        hasReason: c.reviewStatus === 'rejected', reason: c.adminNote,
      }
    }))

  const recent = posts.slice(0, 4).map((p) => ({ kind: p.kind, tagBg: p.kindBg, tagColor: p.kindColor, title: p.title, meta: p.category + ' · ' + p.time, statusLabel: p.statusLabel, statusBg: p.statusBg, statusColor: p.statusColor }))

  const mkTab = (k) => ({ bg: tab === k ? '#3366F0' : 'transparent', color: tab === k ? '#FFFFFF' : '#dbe6ff' })
  const tabs = [['overview', 'Overview'], ['posts', 'My Posts'], ['saved', t('Đã lưu')]].map(([k, label]) => ({ key: k, label, ...mkTab(k), onPick: () => setTab(k) }))
  const postFilters = [['all', t('Tất cả')], ['question', t('Câu hỏi')], ['usecase', t('Use Case')]].map(([k, label]) => {
    const on = postFilter === k
    return { key: k, label, bg: on ? '#E7ECFB' : '#fff', border: on ? '#B9CCF8' : '#DDE3EC', color: on ? '#2c5fff' : '#3A4757', onPick: () => setPostFilter(k) }
  })
  const filtered = postFilter === 'all' ? posts : posts.filter((p) => p.type === postFilter)

  const savedUseCases = savedUseCaseIds.map((id) => allCases.find((c) => c.id === id)).filter(Boolean)
    .map((c) => ({ ...c, initial: c.author.slice(0, 1).toUpperCase(), toolsR: c.tools.map((tl) => ({ name: tl })) }))

  const savedQuestionsR = savedQuestions.map((q) => ({
    title: q.title, author: q.author, team: q.team, answers: q.answers.length,
    statusLabel: q.resolved ? 'Resolved' : 'Waiting for answers',
    statusBg: q.resolved ? '#E7F9F0' : '#FFF1E0', statusColor: q.resolved ? '#00893F' : '#B45300',
  }))

  const stats = [
    { value: posts.length, label: 'Posts', color: '#2c5fff' },
    { value: myQuestions.length, label: 'Questions', color: '#0F172A' },
    { value: myUseCases.length, label: 'Use Cases', color: '#0F172A' },
    { value: answersGiven, label: 'Answers', color: '#00A352' },
  ]

  return (
    <div style={css('position:relative; width:100%; margin:0 auto; background:#04060d; color:#e8eefc;')}>
      <div style={css('position:absolute; top:-260px; left:-8%; width:900px; height:900px; border-radius:50%; background:radial-gradient(circle,rgba(58,120,255,.34),rgba(58,120,255,0) 66%); filter:blur(60px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:absolute; top:-160px; right:-10%; width:820px; height:820px; border-radius:50%; background:radial-gradient(circle,rgba(0,140,255,.22),rgba(0,140,255,0) 66%); filter:blur(60px); pointer-events:none; z-index:0;')}></div>
      <div style={css('position:absolute; top:900px; left:22%; width:1000px; height:1100px; border-radius:50%; background:radial-gradient(circle,rgba(44,95,255,.16),rgba(44,95,255,0) 68%); filter:blur(80px); pointer-events:none; z-index:0;')}></div>

      <div style={css('position:relative; z-index:400; background:linear-gradient(180deg,#0c1533 0%,#070b1c 100%);')}>
        <TopNav />
      </div>

      <section style={css('position:relative; z-index:1; padding:48px 40px 0;')}>
        <div style={css('max-width:1000px; margin:0 auto; display:flex; align-items:center; gap:26px; flex-wrap:wrap;')}>
          <div style={css('width:84px; height:84px; flex:none; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 28px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{user.initials}</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={css('margin:0; font:900 26px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>{user.name}</h1>
            <p style={css('margin:6px 0 0; font:400 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#c3d0f5;')}>{user.team ? user.team + ' · ' : ''}{user.email}</p>
            <div style={css('display:inline-flex; align-items:center; gap:8px; margin-top:10px; height:26px; padding:0 12px; border-radius:999px; background:#E7ECFB; color:#2c5fff; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{t('Đăng nhập bằng email công ty')}</div>
          </div>
        </div>

        <div style={css('max-width:1000px; margin:26px auto 0; display:grid; grid-template-columns:repeat(4,1fr); gap:14px;')}>
          {stats.map((s) => (
            <div key={s.label} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 20px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
              <div style={css(`font:900 26px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:${s.color};`)}>{s.value}</div>
              <div style={css('margin-top:5px; font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#64748b;')}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={css('max-width:1000px; margin:28px auto 0; display:flex; align-items:center; gap:14px;')}>
          <div style={css('display:inline-flex; background:rgba(255,255,255,.08); border-radius:16px; padding:7px; gap:6px;')}>
            {tabs.map((tb) => (
              <button key={tb.key} onClick={tb.onPick} style={css(`border:none; cursor:pointer; height:44px; padding:0 20px; border-radius:12px; font:700 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; background:${tb.bg}; color:${tb.color};`)}>{tb.label}</button>
            ))}
          </div>
          <div style={css('margin-left:auto; display:flex; gap:10px;')}>
            <button onClick={() => navigate('/questions')} style={css('display:inline-flex; align-items:center; gap:8px; height:44px; padding:0 18px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; color:#3A4757; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;')}>{t('Đặt câu hỏi')}</button>
            <button onClick={() => navigate('/use-cases?share=1')} style={css('display:inline-flex; align-items:center; gap:8px; height:44px; padding:0 20px; border:none; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; box-shadow:0 12px 26px rgba(44,95,255,.34); cursor:pointer;')}>{t('Chia sẻ Use Case')}</button>
          </div>
        </div>
      </section>

      {tab === 'overview' && (
        <section style={css('position:relative; z-index:1; padding:26px 40px 90px;')}>
          <div style={css('max-width:1000px; margin:0 auto;')}>
            <h3 style={css('margin:0 0 14px; font:800 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>{t('Hoạt động gần đây')}</h3>
            {loaded && recent.length === 0 && (
              <div style={css('background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:40px; text-align:center; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Chưa có hoạt động nào. Đặt câu hỏi hoặc chia sẻ use case đầu tiên của bạn.')}</div>
            )}
            <div style={css('display:flex; flex-direction:column; gap:12px;')}>
              {recent.map((r, i) => (
                <div key={i} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 22px; display:flex; align-items:center; gap:16px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                  <span style={css(`flex:none; display:inline-flex; align-items:center; height:26px; padding:0 12px; border-radius:999px; background:${r.tagBg}; color:${r.tagColor}; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{r.kind}</span>
                  <div style={css('flex:1; min-width:0;')}>
                    <div style={css('font:700 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{r.title}</div>
                    <div style={css('margin-top:3px; font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{r.meta}</div>
                  </div>
                  <span style={css(`flex:none; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${r.statusBg}; color:${r.statusColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{r.statusLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'posts' && (
        <section style={css('position:relative; z-index:1; padding:26px 40px 90px;')}>
          <div style={css('max-width:1000px; margin:0 auto;')}>
            <div style={css('display:flex; align-items:center; gap:8px; margin-bottom:16px;')}>
              {postFilters.map((f) => (
                <button key={f.key} onClick={f.onPick} style={css(`height:34px; padding:0 15px; border:1px solid ${f.border}; border-radius:999px; background:${f.bg}; color:${f.color}; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer;`)}>{f.label}</button>
              ))}
              <span style={css('margin-left:auto; font:600 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#c3d0f5;')}>{filtered.length} posts</span>
            </div>
            <div style={css('display:flex; flex-direction:column; gap:14px;')}>
              {filtered.map((p, i) => (
                <div key={i} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:20px 22px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                  <div style={css('display:flex; align-items:center; gap:9px; flex-wrap:wrap;')}>
                    <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${p.kindBg}; color:${p.kindColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{p.kind}</span>
                    <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${p.statusBg}; color:${p.statusColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{p.statusLabel}</span>
                    <span style={css('display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:#EDF0FA; color:#3A4757; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{p.category}</span>
                    <span style={css('margin-left:auto; font:400 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{p.time}</span>
                  </div>
                  <h4 style={css('margin:12px 0 0; font:800 16.5px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{p.title}</h4>
                  <p style={css('margin:8px 0 0; font:400 13.5px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5B6675;')}>{p.desc}</p>
                  {p.hasReason && (
                    <div style={css('margin-top:12px; padding:12px 14px; border-radius:12px; background:#FFECEC; font:600 12.5px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#B4232A;')}>Admin từ chối: {p.reason}</div>
                  )}
                  <div style={css('display:flex; align-items:center; gap:14px; margin-top:14px; font:600 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>
                    <span>{p.metric}</span>
                    <button onClick={() => navigate(p.href)} style={css('margin-left:auto; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3366F0; background:none; border:none; cursor:pointer; padding:0;')}>{p.cta}</button>
                  </div>
                </div>
              ))}
              {loaded && filtered.length === 0 && (
                <div style={css('background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:40px; text-align:center; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Chưa có bài nào ở mục này.')}</div>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'saved' && (
        <section style={css('position:relative; z-index:1; padding:26px 40px 90px;')}>
          <div style={css('max-width:1000px; margin:0 auto;')}>
            <h3 style={css('margin:0 0 14px; font:800 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>{t('Use Cases đã lưu')}</h3>
            {savedUseCases.length === 0 ? (
              <div style={css('background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:32px; text-align:center; margin-bottom:32px; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Chưa lưu use case nào.')}</div>
            ) : (
              <div style={css('display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:32px;')}>
                {savedUseCases.map((c) => (
                  <div key={c.id} style={css('display:flex; flex-direction:column; background:#fff; border:1px solid #E6EBF3; border-radius:18px; overflow:hidden; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                    <div style={css('position:relative; height:132px; background:linear-gradient(160deg,#e9eef7,#dde6f2); display:flex; align-items:center; justify-content:center;')}>
                      <span style={css('font:600 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#9fb0c8;')}>ảnh use case</span>
                    </div>
                    <div style={css('display:flex; flex-direction:column; flex:1; padding:16px 20px 18px;')}>
                      <span style={css('align-self:flex-start; display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:#EDF0FA; color:#3A4757; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;')}>{c.category}</span>
                      <h4 style={css('margin:10px 0 0; font:800 16px/1.32 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A; text-wrap:pretty;')}>{c.title}</h4>
                      <p style={css('margin:8px 0 0; font:400 13.5px/1.55 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#5B6675; text-wrap:pretty;')}>{c.desc}</p>
                      <div style={{ flex: 1, minHeight: 12 }}></div>
                      <div style={css('display:flex; align-items:center; gap:9px; margin-top:14px;')}>
                        <span style={css(`width:26px; height:26px; border-radius:50%; background:${avatarColor(c.author)}; color:#fff; display:flex; align-items:center; justify-content:center; font:700 11px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{c.initial}</span>
                        <span style={css('font:700 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{c.author}</span>
                        <span style={css('font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>· {c.team}</span>
                      </div>
                      <div style={css('display:flex; flex-wrap:wrap; gap:7px; margin-top:12px;')}>
                        {c.toolsR.map((tl) => (
                          <span key={tl.name} style={css('display:inline-flex; align-items:center; height:28px; padding:0 12px; border:1px solid #E6EBF3; border-radius:9px; font:700 12px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#3A4757;')}>{tl.name}</span>
                        ))}
                      </div>
                      <button onClick={() => navigate(`/use-cases/${c.id}`)} style={css('display:inline-flex; align-items:center; justify-content:center; gap:8px; height:42px; margin-top:16px; border-radius:12px; background:linear-gradient(120deg,#0033C9,#2c5fff); color:#fff; font:700 14px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; text-decoration:none; border:none; cursor:pointer;')}>
                        {t('Xem Use Case')}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h3 style={css('margin:0 0 14px; font:800 17px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#ffffff;')}>{t('Questions đã lưu')}</h3>
            {savedQuestionsR.length === 0 ? (
              <div style={css('background:#fff; border:1px dashed #DDE3EC; border-radius:16px; padding:32px; text-align:center; font:600 13.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{t('Chưa lưu câu hỏi nào.')}</div>
            ) : (
              <div style={css('display:flex; flex-direction:column; gap:12px;')}>
                {savedQuestionsR.map((q, i) => (
                  <div key={i} style={css('background:#fff; border:1px solid #E6EBF3; border-radius:16px; padding:18px 22px; box-shadow:0 8px 22px rgba(30,50,90,.06);')}>
                    <div style={css('display:flex; align-items:center; gap:9px;')}>
                      <span style={css(`display:inline-flex; align-items:center; height:24px; padding:0 11px; border-radius:999px; background:${q.statusBg}; color:${q.statusColor}; font:700 11.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif;`)}>{q.statusLabel}</span>
                      <span style={css('margin-left:auto; font:400 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{q.answers} answers</span>
                    </div>
                    <h4 style={css('margin:10px 0 0; font:800 16px/1.35 "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{q.title}</h4>
                    <div style={css('margin-top:10px; font:400 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#94a3b8;')}>{q.author} · {q.team}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
