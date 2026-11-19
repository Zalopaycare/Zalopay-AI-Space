import { useState } from 'react'
import { css, hoverClass } from '../lib/style.js'
import { useTitle } from '../hooks/useTitle.js'
import Layout from '../components/Layout.jsx'
import SpaceBackdrop, { BLEED } from '../components/SpaceBackdrop.jsx'
import HeroWordmark from '../components/HeroWordmark.jsx'
import PageActionBar from '../components/PageActionBar.jsx'
import EventsPanel, { openEventForm } from '../components/Events.jsx'
import TopicsPanel, { openTopicForm } from '../components/Topics.jsx'
import { useLocation, useNavigate } from 'react-router-dom'

// The AI Space home, two tabs: "Sự kiện", the events colleagues hold to share an AI topic
// (components/Events.jsx), and "Chủ đề quan tâm", the questions / topics people would like someone to share about
// (components/Topics.jsx; /?tab=wish). The bar at the top creates one of whichever tab is open; the search
// box filters it. Posts are no longer written here; old post links (/questions/<id>) still open the post.
export default function EventsPage() {
  useTitle('AI Space')
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const tab = params.get('tab') === 'wish' || params.has('topic') || params.get('new') === 'topic' ? 'wish' : 'events'
  const pick = (k) => { setQuery(''); navigate({ pathname: '/', search: k === 'wish' ? '?tab=wish' : '' }, { replace: true }) }
  const wish = tab === 'wish'
  return (
    <Layout active="question">
      <div style={css('position:relative; color:#e8eefc; overflow:clip;' + BLEED)}>
        <SpaceBackdrop arcTop={190} />
        <div style={css('position:relative; z-index:1;')}>
          {/* the same wordmark box as before (and as the Use Case Library title), so switching tabs doesn't jump */}
          <section style={css('position:relative; z-index:2; padding:22px var(--zp-gutter) 10px; text-align:center; overflow:visible;')}>
            <HeroWordmark width={361} />
            <p className="zp-tagline" style={css('position:relative; margin:0 auto; max-width:760px; font:400 15px/1.5 var(--zp-font-text); color:rgba(206,219,245,.72); text-wrap:pretty;')}>Nơi đồng nghiệp tạo và cùng tham gia các buổi chia sẻ về AI.</p>
          </section>
          {/* the two tabs, centred over the bar */}
          <div role="tablist" style={css('display:flex; justify-content:center; gap:6px; padding:14px var(--zp-gutter) 0;')}>
            {[['events', 'Sự kiện'], ['wish', 'Chủ đề quan tâm']].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => pick(k)} data-tour={k === 'wish' ? 'wish-tab' : undefined}
                className={tab === k ? undefined : hoverClass('background:rgba(255,255,255,.1) !important; color:#fff !important;')}
                style={css(`height:36px; padding:0 18px; border-radius:999px; cursor:pointer; font:700 14px var(--zp-font-text); ${tab === k ? 'background:#fff; color:#0F172A; border:1px solid #fff;' : 'background:rgba(255,255,255,.04); color:#C9D6F5; border:1px solid rgba(160,190,255,.25);'}`)}>{label}</button>
            ))}
          </div>
          {wish
            ? <PageActionBar prompt="Bạn có câu hỏi, chủ đề AI nào muốn được chia sẻ?" cta="Đăng chủ đề" onCompose={openTopicForm} query={query} onQuery={setQuery} placeholder="Tìm câu hỏi, chủ đề..." />
            : <PageActionBar tour="compose" prompt="Bạn có topic AI nào muốn chia sẻ?" cta="Tạo sự kiện" onCompose={openEventForm} query={query} onQuery={setQuery} placeholder="Tìm sự kiện, địa điểm, người tổ chức..." />}
          <div style={css('padding:16px var(--zp-gutter) 28px;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>
              {wish ? <TopicsPanel query={query} /> : <EventsPanel layout="grid" query={query} />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
