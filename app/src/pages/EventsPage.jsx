import { useState } from 'react'
import { css, hoverClass } from '../lib/style.js'
import { useTitle } from '../hooks/useTitle.js'
import Layout from '../components/Layout.jsx'
import SpaceBackdrop, { BLEED } from '../components/SpaceBackdrop.jsx'
import HeroWordmark from '../components/HeroWordmark.jsx'
import PageActionBar from '../components/PageActionBar.jsx'
import EventsPanel, { openEventForm } from '../components/Events.jsx'
import TopicsPanel from '../components/Topics.jsx'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebarLayout } from '../hooks/useSidebarCollapsed.js'

// The AI Space home. Two tabs: "Sự kiện", the events colleagues hold to share an AI topic (components/Events.jsx),
// and "Lịch", the same events in a week / month calendar like Outlook's (/?tab=calendar). "Chủ đề quan tâm",
// the questions / topics people would like someone to share about (components/Topics.jsx), sits in a column
// fixed to the right edge (like the events rail of the old posts page); on a small screen it comes under the
// events instead. Posts are no longer written here; old post links (/questions/<id>) still open the post.
const RAIL_W = 272
export default function EventsPage() {
  useTitle('AI Space')
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const tab = new URLSearchParams(location.search).get('tab') === 'calendar' ? 'calendar' : 'events'
  const pick = (k) => navigate({ pathname: '/', search: k === 'calendar' ? '?tab=calendar' : '' }, { replace: true })
  const { width, offset } = useSidebarLayout()
  // the topics column when the events still get a fair width beside it
  const rail = width - offset - RAIL_W >= 640
  const cal = tab === 'calendar'
  return (
    <Layout active="question">
      <div style={css('position:relative; color:#e8eefc; overflow:clip;' + BLEED)}>
        <SpaceBackdrop arcTop={190} />
        <div style={{ ...css('position:relative; z-index:1;'), ...(rail ? { paddingRight: RAIL_W } : {}) }}>
          {/* the same wordmark box as before (and as the Use Case Library title), so switching tabs doesn't jump */}
          <section style={css('position:relative; z-index:2; padding:22px var(--zp-gutter) 10px; text-align:center; overflow:visible;')}>
            <HeroWordmark width={361} />
            <p className="zp-tagline" style={css('position:relative; margin:0 auto; max-width:760px; font:400 15px/1.5 var(--zp-font-text); color:rgba(206,219,245,.72); text-wrap:pretty;')}>Nơi đồng nghiệp tạo và cùng tham gia các buổi chia sẻ về AI.</p>
          </section>
          {/* the two tabs, centred over the bar */}
          <div role="tablist" style={css('display:flex; justify-content:center; gap:6px; padding:14px var(--zp-gutter) 0;')}>
            {[['events', 'Sự kiện'], ['calendar', 'Lịch']].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => pick(k)} data-tour={k === 'calendar' ? 'calendar-tab' : undefined}
                className={tab === k ? undefined : hoverClass('background:rgba(255,255,255,.1) !important; color:#fff !important;')}
                style={css(`display:inline-flex; align-items:center; gap:7px; height:36px; padding:0 18px; border-radius:999px; cursor:pointer; font:700 14px var(--zp-font-text); ${tab === k ? 'background:#fff; color:#0F172A; border:1px solid #fff;' : 'background:rgba(255,255,255,.04); color:#C9D6F5; border:1px solid rgba(160,190,255,.25);'}`)}>
                {k === 'calendar' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>}
                {label}
              </button>
            ))}
          </div>
          <PageActionBar tour="compose" prompt="Bạn có topic AI nào muốn chia sẻ?" cta="Tạo sự kiện" onCompose={openEventForm} query={query} onQuery={setQuery} placeholder="Tìm sự kiện, địa điểm, người tổ chức..." searchHidden={cal} />
          <div style={css('padding:16px var(--zp-gutter) 28px;')}>
            {/* the calendar gets the whole width; the cards a readable column */}
            <div style={css(`max-width:${cal ? 1200 : 760}px; margin:0 auto;`)}>
              <EventsPanel layout="grid" query={cal ? '' : query} calendar={cal} />
              {!rail && (
                <div style={css('margin-top:28px;')}><TopicsPanel layout="rail" /></div>
              )}
            </div>
          </div>
        </div>
        {rail && (
          // fixed to the right edge under the top bar, the length of the screen; a long list scrolls inside it
          <div className="zp-thinscroll" data-tour="wish-tab" style={{ ...css('position:fixed; top:58px; right:0; bottom:0; z-index:40; overflow-y:auto; box-sizing:border-box; padding:22px 18px 24px 4px;'), width: RAIL_W }}>
            <TopicsPanel layout="rail" />
          </div>
        )}
      </div>
    </Layout>
  )
}
