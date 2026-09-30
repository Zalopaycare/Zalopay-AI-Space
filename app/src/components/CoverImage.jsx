import { css } from '../lib/style.js'

// Use case thumbnail: the uploaded cover if there is one, otherwise a tinted tile with an icon
// picked from the category (never the old "ảnh" placeholder text).

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  code: <g {...P}><path d="m8 7-5 5 5 5"></path><path d="m16 7 5 5-5 5"></path><path d="m14 4-4 16"></path></g>,
  megaphone: <g {...P}><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"></path><path d="M16 8a5 5 0 0 1 0 8"></path><path d="M19 5a9 9 0 0 1 0 14"></path></g>,
  gear: <g {...P}><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path></g>,
  people: <g {...P}><circle cx="9" cy="8" r="3.2"></circle><path d="M3 20a6 6 0 0 1 12 0"></path><circle cx="17" cy="9" r="2.5"></circle><path d="M16 14.5a5 5 0 0 1 5 5.5"></path></g>,
  chart: <g {...P}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path></g>,
  calendar: <g {...P}><rect x="3" y="5" width="18" height="16" rx="2.5"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></g>,
  book: <g {...P}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"></path><path d="M4 19V5"></path></g>,
  palette: <g {...P}><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-2l-.4-1a1.6 1.6 0 0 1 1.5-2.2H17a4 4 0 0 0 4-4c0-4.7-4-8.8-9-8.8z"></path><circle cx="7.5" cy="11" r="1"></circle><circle cx="10" cy="7" r="1"></circle><circle cx="15" cy="7.5" r="1"></circle></g>,
  pen: <g {...P}><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></g>,
  spark: <g {...P}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"></path></g>,
}
const RULES = [
  [/engineer|coding|technical|kỹ thuật|dev/i, 'code', ['#E4ECFF', '#2c5fff']],
  [/market|content|communication|nội dung|truyền thông/i, 'megaphone', ['#FFEBDD', '#E0620B']],
  [/operation|automation|workflow|vận hành|tự động/i, 'gear', ['#E3F7EE', '#00893F']],
  [/people|enablement|nhân sự|đào tạo/i, 'people', ['#F1E7FF', '#6F0CE2']],
  [/data|analysis|phân tích|dữ liệu/i, 'chart', ['#E0F4FF', '#0077B6']],
  [/meeting|collaboration|họp/i, 'calendar', ['#FFF4D9', '#A86B00']],
  [/research|knowledge|nghiên cứu|kiến thức/i, 'book', ['#EAF0F7', '#3A4E6B']],
  [/design|creative|thiết kế/i, 'palette', ['#FFE6F0', '#C2185B']],
  [/productivity|personal|năng suất/i, 'pen', ['#E8F1FF', '#2c5fff']],
]
function look(category) {
  const hit = RULES.find(([re]) => re.test(String(category || '')))
  return hit ? { icon: hit[1], bg: hit[2][0], fg: hit[2][1] } : { icon: 'spark', bg: '#EEF2F9', fg: '#5B6B8C' }
}

// Cards show the square category icon for every use case for now (real cover images will be
// uploaded later). Flip to true to show uploaded / showcase covers on cards again.
const SHOW_COVERS = false

export default function CoverImage({ c, size = 76, radius = 12, forceImage = false }) {
  const box = `position:relative; flex:none; width:${size}px; height:${size}px; border-radius:${radius}px; overflow:hidden;`
  // Uploaded / showcase covers are mostly wide screenshots: show them whole in a 4:3 frame
  // (letterboxed on a soft background) instead of cropping them into a square.
  if (c.coverUrl && (SHOW_COVERS || forceImage)) return (
    <span style={css(`position:relative; flex:none; width:${Math.round(size * 1.34)}px; height:${size}px; border-radius:${radius}px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#F4F7FE; border:1px solid #E6EBF3; box-sizing:border-box;`)}>
      <img src={c.coverUrl} alt="" loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
    </span>
  )
  const { icon, bg, fg } = look(c.category)
  return (
    <span aria-hidden="true" style={css(box + `display:flex; align-items:center; justify-content:center; background:radial-gradient(120% 120% at 20% 10%, #ffffff 0%, ${bg} 60%); color:${fg}; border:1px solid ${bg};`)}>
      <svg width={Math.round(size * 0.42)} height={Math.round(size * 0.42)} viewBox="0 0 24 24">{ICONS[icon]}</svg>
    </span>
  )
}
