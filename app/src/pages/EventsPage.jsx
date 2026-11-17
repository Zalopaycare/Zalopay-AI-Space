import { useState } from 'react'
import { css } from '../lib/style.js'
import { useTitle } from '../hooks/useTitle.js'
import Layout from '../components/Layout.jsx'
import SpaceBackdrop, { BLEED } from '../components/SpaceBackdrop.jsx'
import HeroWordmark from '../components/HeroWordmark.jsx'
import PageActionBar from '../components/PageActionBar.jsx'
import EventsPanel, { openEventForm } from '../components/Events.jsx'

// The AI Space home: the events colleagues hold to share an AI topic (components/Events.jsx). Anyone
// creates one from the bar at the top (or the sidebar's "Tạo sự kiện"); below, every upcoming event as
// a grid of cards, searchable. Posts are no longer written here; old post links (/questions/<id>) still
// open the post on its own page.
export default function EventsPage() {
  useTitle('AI Space')
  const [query, setQuery] = useState('')
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
          <PageActionBar tour="compose" prompt="Bạn có topic AI nào muốn chia sẻ?" cta="Tạo sự kiện" onCompose={openEventForm} query={query} onQuery={setQuery} placeholder="Tìm sự kiện, địa điểm, người tổ chức..." />
          <div style={css('padding:16px var(--zp-gutter) 28px;')}>
            <div style={css('max-width:760px; margin:0 auto;')}>
              <EventsPanel layout="grid" query={query} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
