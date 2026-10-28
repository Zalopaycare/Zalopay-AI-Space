import { css } from '../lib/style.js'

// Use case thumbnail: the cover image if there is one, otherwise a quiet 16:9 frame saying the cover
// is on its way (owners add covers later).

export default function CoverImage({ c, size = 76, radius = 12 }) {
  // same 16:9 frame with or without a cover, so cards line up
  const box = `position:relative; flex:none; width:${Math.round(size * 16 / 9)}px; height:${size}px; border-radius:${radius}px; overflow:hidden;`
  // Covers are 1920×1080 (the share form makes them so): a 16:9 frame. Older showcase screenshots of
  // other shapes are shown whole, letterboxed on a soft background, rather than cropped.
  if (c.coverUrl) return (
    <span style={css(`position:relative; flex:none; width:${Math.round(size * 16 / 9)}px; height:${size}px; border-radius:${radius}px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#F4F7FE; border:1px solid #E6EBF3; box-sizing:border-box;`)}>
      <img src={c.coverUrl} alt="" loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
    </span>
  )
  return (
    <span style={css(box + `display:flex; align-items:center; justify-content:center; padding:0 8px; box-sizing:border-box; background:#F4F7FE; border:1px dashed #C9D5EC; color:#94a3b8; text-align:center; font-size:${Math.max(10, Math.round(size * 0.14))}px; font-weight:600; line-height:1.35;`)}>
      Ảnh bìa sẽ được cập nhật sau
    </span>
  )
}
