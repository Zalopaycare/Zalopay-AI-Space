import { css, hoverClass } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'

const BTN = 'flex:none; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 10px; border:none; border-radius:999px; background:transparent; cursor:pointer; white-space:nowrap; font:600 13px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#475569;'

/** Like · Comment (· Save, given `onSave`) as icons with their counts, as on Threads: the row every
 *  preview card (threads and use cases, on every page) ends with, on the left of the card. */
export default function CardActions({ helpful = 0, helped = false, onHelpful, replies = 0, replyActive = false, onReply, saved = false, onSave, compact = false }) {
  const { t } = useI18n()
  const btn = compact ? BTN + 'height:30px; padding:0 8px; font-size:12.5px;' : BTN
  const size = compact ? 18 : 19
  const stop = (fn) => (e) => { e.stopPropagation(); if (fn) fn(e) }
  const hover = hoverClass('background:#F1F4FA !important;')
  return (
    <div style={css(`display:flex; align-items:center; gap:${compact ? 2 : 4}px; margin-left:${compact ? -8 : -10}px;`)}>
      <button onClick={stop(onHelpful)} aria-pressed={helped} title={t('Thích')} aria-label={t('Thích')} className={hover} style={css(btn + (helped ? 'color:#E0245E;' : ''))}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill={helped ? '#E0245E' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"></path></svg>
        {helpful > 0 && helpful}
      </button>
      <button onClick={stop(onReply)} title={t('Bình luận')} aria-label={t('Bình luận')} className={hover} style={css(btn + (replyActive ? 'color:#2c5fff;' : ''))}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"></path></svg>
        {replies > 0 && replies}
      </button>
      {onSave && (
        <button onClick={stop(onSave)} aria-pressed={saved} title={saved ? t('Bỏ lưu') : t('Lưu')} aria-label={saved ? t('Bỏ lưu') : t('Lưu')} className={hover} style={css(btn + (saved ? 'color:#2c5fff;' : ''))}>
          <svg width={size - 1} height={size - 1} viewBox="0 0 24 24" fill={saved ? '#2c5fff' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        </button>
      )}
    </div>
  )
}
