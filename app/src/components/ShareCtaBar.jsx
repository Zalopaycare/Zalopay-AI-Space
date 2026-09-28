import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import mascot from '../assets/mascot.png'

const FONT = '"Aeonik Pro","Geist","Be Vietnam Pro",sans-serif'

/** Slim "share your use case" call-to-action bar used at the bottom of Home, the library and use case pages. */
export default function ShareCtaBar({ onClick }) {
  const { t } = useI18n()
  return (
    <div style={css('position:relative; max-width:1200px; margin:22px auto 0; display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:14px 18px 14px 16px; border-radius:20px; background:radial-gradient(60% 160% at 92% 0%, rgba(94,231,255,.28) 0%, rgba(94,231,255,0) 55%), linear-gradient(110deg,#0b1f5e 0%,#1a5fff 60%,#3a8dff 100%); border:1px solid rgba(255,255,255,.16); box-shadow:0 18px 44px rgba(20,80,200,.35);')}>
      <img src={mascot} alt="" className="zp-mascot" style={css('flex:none; width:124px; height:auto; margin:-34px 0 -22px -6px; filter:drop-shadow(0 10px 18px rgba(3,20,80,.45));')} />
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
