import { forwardRef } from 'react'
import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import mascot from '../assets/mascot.png'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/**
 * Composer prompt + search box pinned to the very top of Home, Use Case Library and Questions,
 * with identical geometry on every page so switching pages doesn't make the top of the page jump.
 */
const PageActionBar = forwardRef(function PageActionBar({ prompt, cta, onCompose, query, onQuery, onSubmit, placeholder, searchOnly = false, maxWidth = 760, filters = null, onKeyDown, onFocus, inputProps = {} }, inputRef) {
  const { t } = useI18n()
  return (
    <div style={css('position:relative; z-index:6; padding:20px var(--zp-gutter) 0;')}>
      <div style={{ maxWidth, margin: '0 auto' }}>
        {!searchOnly && (
        <div
          onClick={onCompose}
          className={hoverClass('background:rgba(255,255,255,.12); border-color:rgba(160,196,255,.5);')}
          style={css('display:flex; align-items:center; gap:14px; height:60px; padding:0 11px 0 12px; box-sizing:border-box; border-radius:18px; background:rgba(255,255,255,.07); border:1px solid rgba(160,196,255,.28); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); cursor:pointer; transition:background .16s, border-color .16s;')}
        >
          <img src={mascot} alt="" className="zp-mascot" style={css('flex:none; width:64px; height:auto; margin:-14px -4px -10px -6px; filter:drop-shadow(0 6px 12px rgba(3,20,80,.45));')} />
          <span style={css(`flex:1; min-width:0; font:400 15px ${FONT}; color:rgba(219,230,255,.78); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>{t(prompt)}</span>
          <span style={css(`flex:none; display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 18px; border-radius:999px; background:linear-gradient(180deg,#4480ff 0%,#2c5fff 100%); color:#fff; font:700 14px ${FONT}; box-shadow:0 10px 22px rgba(44,95,255,.4);`)}>{t(cta)}</span>
        </div>
        )}
        <div className="zp-search-row" style={css(`display:flex; align-items:center; gap:10px; ${searchOnly ? '' : 'margin-top:12px;'}`)}>
          <form
            onSubmit={(e) => { e.preventDefault(); if (onSubmit) onSubmit(query) }}
            style={searchOnly ? css('flex:1; min-width:0; display:flex; align-items:center; gap:11px; height:46px; box-sizing:border-box; background:#ffffff; border:1px solid #E6EBF3; border-radius:999px; padding:0 18px; box-shadow:0 10px 26px rgba(0,0,0,.25);') : css('flex:1; min-width:0; display:flex; align-items:center; gap:11px; height:46px; box-sizing:border-box; background:#ffffff; border:1px solid #E6EBF3; border-radius:999px; padding:0 18px; box-shadow:0 10px 26px rgba(0,0,0,.25);')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3-3"></path></svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              placeholder={t(placeholder)}
              aria-label={t(placeholder)}
              className="zp-search-input"
              style={css(`flex:1; min-width:0; border:none; outline:none; background:transparent; font:400 14.5px ${FONT}; color:#0F172A;`)}
              {...inputProps}
            />
            {query && (
              <button
                type="button"
                onClick={() => { onQuery(''); if (inputRef && typeof inputRef !== 'function') inputRef.current?.focus() }}
                aria-label={t('Xoá từ khoá')}
                title={t('Xoá từ khoá')}
                className={hoverClass('background:#E6EBF3 !important; color:#0F172A !important;')}
                style={css('flex:none; width:26px; height:26px; margin-right:-6px; border:none; border-radius:50%; background:#F1F4FA; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            )}
          </form>
          {filters}
        </div>
      </div>
    </div>
  )
})

export default PageActionBar
