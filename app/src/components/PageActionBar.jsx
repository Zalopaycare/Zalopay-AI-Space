import { forwardRef } from 'react'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/**
 * Composer prompt + search box pinned to the very top of Home, Use Case Library and Questions,
 * with identical geometry on every page so switching pages doesn't make the top of the page jump.
 */
const PageActionBar = forwardRef(function PageActionBar({ prompt, cta, onCompose, query, onQuery, onSubmit, placeholder, searchOnly = false, maxWidth = 760 }, inputRef) {
  const { t } = useI18n()
  const { user } = useAuth()
  return (
    <div style={css('position:relative; z-index:6; padding:20px 40px 0;')}>
      <div style={{ maxWidth, margin: '0 auto' }}>
        {!searchOnly && (
        <div
          onClick={onCompose}
          className={hoverClass('background:rgba(255,255,255,.12); border-color:rgba(160,196,255,.5);')}
          style={css('display:flex; align-items:center; gap:14px; height:60px; padding:0 11px 0 12px; box-sizing:border-box; border-radius:18px; background:rgba(255,255,255,.07); border:1px solid rgba(160,196,255,.28); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); cursor:pointer; transition:background .16s, border-color .16s;')}
        >
          <div style={css(`flex:none; width:38px; height:38px; border-radius:50%; background:linear-gradient(180deg,#4480ff,#2c5fff); color:#fff; display:flex; align-items:center; justify-content:center; font:800 13px ${FONT};`)}>{user?.initials || '?'}</div>
          <span style={css(`flex:1; min-width:0; font:400 15px ${FONT}; color:rgba(219,230,255,.78); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{t(prompt)}</span>
          <span style={css(`flex:none; display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 18px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 14px ${FONT}; box-shadow:0 10px 22px rgba(44,95,255,.4);`)}>{t(cta)}</span>
        </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); if (onSubmit) onSubmit(query) }}
          style={searchOnly ? css('display:flex; align-items:center; gap:11px; height:46px; box-sizing:border-box; background:#ffffff; border:1px solid #E6EBF3; border-radius:999px; padding:0 18px; box-shadow:0 10px 26px rgba(0,0,0,.25);') : css('display:flex; align-items:center; gap:11px; height:46px; box-sizing:border-box; margin-top:12px; background:#ffffff; border:1px solid #E6EBF3; border-radius:999px; padding:0 18px; box-shadow:0 10px 26px rgba(0,0,0,.25);')}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3-3"></path></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t(placeholder)}
            style={css(`flex:1; min-width:0; border:none; outline:none; background:transparent; font:400 14.5px ${FONT}; color:#0F172A;`)}
          />
        </form>
      </div>
    </div>
  )
})

export default PageActionBar
