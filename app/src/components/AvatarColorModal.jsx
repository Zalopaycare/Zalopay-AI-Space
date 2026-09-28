import { createPortal } from 'react-dom'
import { css } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { AVATAR_COLORS } from './Avatar.jsx'

/** Full-screen avatar color picker, opened from the avatar menu in the top bar. */
export default function AvatarColorModal({ user, onClose, onPick }) {
  const { t } = useI18n()
  return createPortal(
    <div onClick={onClose} style={css('position:fixed; inset:0; z-index:5200; background:rgba(4,6,13,.6); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:24px;')}>
      <div onClick={(e) => e.stopPropagation()} style={css('width:360px; max-width:100%; background:#fff; border:1px solid #E6EBF3; border-radius:20px; box-shadow:0 30px 70px rgba(6,14,40,.45); padding:20px 22px 22px;')}>
        <div style={css('display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;')}>
          <div style={css('font:800 15px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; color:#0F172A;')}>{t('Chọn màu avatar')}</div>
          <button onClick={onClose} style={css('width:30px; height:30px; border:none; border-radius:50%; background:#F1F4FA; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        <div style={css('display:grid; grid-template-columns:repeat(6,1fr); gap:12px;')}>
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onPick(c); onClose() }}
              title={c}
              style={{ width: 40, height: 40, borderRadius: '50%', background: c, border: user.avatarColor === c ? '3px solid #0F172A' : '2px solid transparent', boxShadow: '0 2px 6px rgba(0,0,0,.15)', cursor: 'pointer', padding: 0 }}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
