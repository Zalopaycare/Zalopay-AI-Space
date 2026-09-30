import { css } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'

const PILL = 'flex:none; display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; border-radius:999px; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; cursor:pointer; white-space:nowrap; transition:background .16s, border-color .16s;'

/** The helpful + reply pill pair every preview card (questions and use cases, on every page) ends with. */
export default function CardActions({ helpful = 0, helped = false, onHelpful, replies = 0, replyActive = false, onReply, compact = false }) {
  const { t } = useI18n()
  const pill = compact ? PILL + 'height:28px; padding:0 10px; gap:5px; font-size:12px;' : PILL
  const stop = (fn) => (e) => { e.stopPropagation(); if (fn) fn(e) }
  return (
    <div style={css(`margin-left:auto; display:flex; align-items:center; gap:${compact ? 6 : 8}px;`)}>
      <button
        onClick={stop(onHelpful)}
        style={css(`${pill} border:1px solid ${helped ? '#B9CCF8' : '#DDE3EC'}; background:${helped ? '#EAF1FF' : '#fff'}; color:#3A4757;`)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={helped ? '#2c5fff' : 'none'} stroke="#2c5fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11l5-9a2.6 2.6 0 0 1 2.5 3.2L13.6 9H19a2.4 2.4 0 0 1 2.3 3l-1.8 7.3A2.4 2.4 0 0 1 17.2 22z"></path><path d="M7 11H3v11h4"></path></svg>
        <span style={css('color:#2c5fff;')}>{helpful}</span> {t('Upvote')}
      </button>
      <button
        onClick={stop(onReply)}
        style={css(`${pill} border:1px solid ${replyActive ? '#B9CCF8' : '#DDE3EC'}; background:${replyActive ? '#EAF1FF' : '#fff'}; color:${replyActive ? '#2c5fff' : '#3A4757'};`)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        {replies} {t('Bình luận')}
      </button>
    </div>
  )
}
