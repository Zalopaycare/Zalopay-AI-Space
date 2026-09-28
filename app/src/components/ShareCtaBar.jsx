import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/** Slim "share your use case" call-to-action bar used at the bottom of Home, the library and use case pages. */
export default function ShareCtaBar({ onClick }) {
  const { t } = useI18n()
  return (
    <div style={css('position:relative; overflow:hidden; max-width:1200px; margin:0 auto; display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:16px 18px 16px 20px; border-radius:20px; background:radial-gradient(60% 160% at 92% 0%, rgba(94,231,255,.28) 0%, rgba(94,231,255,0) 55%), linear-gradient(110deg,#0b1f5e 0%,#1a5fff 60%,#3a8dff 100%); border:1px solid rgba(255,255,255,.16); box-shadow:0 18px 44px rgba(20,80,200,.35);')}>
      <span style={css('flex:none; width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.3); box-shadow:inset 0 1px 0 rgba(255,255,255,.35);')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M12 7v6"></path><path d="M9 10h6"></path></svg>
      </span>
      <div style={css(`flex:1; min-width:240px; font:800 18px/1.35 ${FONT}; color:#fff; letter-spacing:-.01em;`)}>{t('Bạn cũng đang áp dụng AI vào công việc hàng ngày?')}</div>
      <button
        onClick={onClick}
        className={hoverClass('transform:translateY(-1px); box-shadow:0 14px 30px rgba(6,30,120,.5);')}
        style={css(`flex:none; display:inline-flex; align-items:center; gap:9px; height:44px; padding:0 22px; border:none; border-radius:999px; background:#fff; color:#1a5fff; font:800 14.5px ${FONT}; cursor:pointer; box-shadow:0 10px 24px rgba(6,30,120,.34); transition:transform .16s, box-shadow .16s;`)}
      >
        {t('Kể Toro nghe với')}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
      </button>
    </div>
  )
}
