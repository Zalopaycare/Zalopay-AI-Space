import { useRef, useState } from 'react'
import { css, hoverClass } from '../lib/style.js'
import { api } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { loadPublishedUseCases } from '../lib/publishedUseCases.js'
import Avatar from './Avatar.jsx'

const TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE = 15 * 1024 * 1024 // original file; what we send is a 256px JPEG, far below the server's 400 KB
const MAX_SENT = 400 * 1024
const SIZE = 256

/** Decode the file, center-crop it to a square and return a 256×256 JPEG data URL. */
function squareJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      if (!side) return reject(new Error('bad_image'))
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black in JPEG
      ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad_image')) }
    img.src = url
  })
}

const btn = 'display:block; width:100%; text-align:left; padding:7px 10px; border:none; border-radius:9px; background:transparent; cursor:pointer; font:700 12.5px "Aeonik Pro","Geist","Be Vietnam Pro",sans-serif; white-space:nowrap;'

/** "Ảnh đại diện" block for the avatar menu: upload a photo (cropped in the browser) or remove it. */
export default function AvatarPhotoPicker({ size = 40, bare = false }) {
  const { t } = useI18n()
  const { user, setUser } = useAuth()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const done = (d) => {
    if (d?.user) setUser(d.user)
    loadPublishedUseCases(true) // use case cards read authors' photos from the submissions list
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!TYPES.includes(file.type)) return setError(t('Chỉ nhận ảnh PNG, JPG hoặc WEBP.'))
    if (file.size > MAX_FILE) return setError(t('Ảnh quá lớn, chọn ảnh khác.'))
    setBusy(true)
    try {
      const dataUrl = await squareJpeg(file).catch(() => { throw Object.assign(new Error('bad_image'), { kind: 'type' }) })
      if (dataUrl.length > MAX_SENT) throw Object.assign(new Error('too_large'), { status: 413 })
      done(await api.uploadAvatar(dataUrl))
    } catch (err) {
      setError(err.kind === 'type' ? t('Chỉ nhận ảnh PNG, JPG hoặc WEBP.') : err.status === 413 ? t('Ảnh quá lớn, chọn ảnh khác.') : t('Không lưu được ảnh, thử lại sau.'))
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async () => {
    setError('')
    setBusy(true)
    try { done(await api.removeAvatar()) } catch { setError(t('Không bỏ được ảnh, thử lại sau.')) } finally { setBusy(false) }
  }

  if (!user) return null
  // Profile page: the photo with the upload button (camera icon) right under it.
  if (bare) return (
    <div style={css('display:flex; flex-direction:column; align-items:center; gap:8px; flex:none;')}>
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} title={t('Đổi ảnh đại diện')} aria-label={t('Đổi ảnh đại diện')} style={css('padding:0; border:none; background:none; border-radius:50%; cursor:pointer;')}>
        <Avatar user={user} size={size} fontSize={Math.round(size * 0.35)} />
      </button>
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={hoverClass('background:#EEF3FF !important;')} style={css(`display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; border:1px solid #DDE3EC; border-radius:999px; background:#fff; cursor:pointer; font:700 12.5px "Be Vietnam Pro",sans-serif; color:#2c5fff; white-space:nowrap; ${busy ? 'opacity:.6; cursor:default;' : ''}`)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7.5 6.5H5A2 2 0 0 0 3 8.5v9A2 2 0 0 0 5 19.5h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2.5z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>
        {busy ? t('Đang lưu...') : user.avatarUrl ? t('Đổi ảnh') : t('Tải ảnh lên')}
      </button>
      {user.avatarUrl && <button type="button" disabled={busy} onClick={onRemove} style={css('padding:0; border:none; background:none; cursor:pointer; font:600 12px "Be Vietnam Pro",sans-serif; color:#64748b;')}>{t('Bỏ ảnh')}</button>}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} style={{ display: 'none' }} />
      {error && <div role="alert" style={css('max-width:180px; text-align:center; font:600 12px "Be Vietnam Pro",sans-serif; color:#D8232A;')}>{error}</div>}
    </div>
  )
  return (
    <div style={css(bare ? '' : 'padding:8px 6px 8px; margin-bottom:4px; border-bottom:1px solid #EEF1F7;')}>
      <div style={css(`display:flex; align-items:center; gap:${bare ? 16 : 10}px;`)}>
        <Avatar user={user} size={size} fontSize={Math.round(size * 0.35)} />
        <div style={css('flex:1; min-width:0;')}>
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={hoverClass('background:#EEF3FF !important;')} style={css(btn + `color:#2c5fff; ${busy ? 'opacity:.6; cursor:default;' : ''}`)}>
            {busy ? t('Đang lưu...') : t('Tải ảnh lên')}
          </button>
          {user.avatarUrl && (
            <button type="button" disabled={busy} onClick={onRemove} className={hoverClass('background:#F5F7FB !important;')} style={css(btn + `color:#475569; ${busy ? 'opacity:.6; cursor:default;' : ''}`)}>{t('Bỏ ảnh')}</button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} style={{ display: 'none' }} />
      {error && <div role="alert" style={css('margin-top:6px; padding:0 4px; font:600 12px "Be Vietnam Pro",sans-serif; color:#D8232A; white-space:normal;')}>{error}</div>}
    </div>
  )
}
