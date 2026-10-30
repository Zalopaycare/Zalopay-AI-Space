import { css } from '../lib/style.js'
import logo from '../assets/zalopay-ai-space-logo.png'
import aiCloud from '../assets/ai-cloud.png'
import aiCube from '../assets/ai-cube.png'
import aiOpenai from '../assets/ai-openai.png'
import aiClaude from '../assets/ai-claude.png'

const AI_LOGOS = [
  { src: aiCloud, alt: 'Cloud terminal', w: 28, pos: { left: -100, top: 58 } },
  { src: aiCube, alt: 'Cursor', w: 22, pos: { left: -40, bottom: 60 } },
  { src: aiOpenai, alt: 'ChatGPT', w: 26, pos: { right: -98, top: 60 } },
  { src: aiClaude, alt: 'Claude', w: 26, pos: { right: -42, bottom: 60 } },
]

const UFO_STARS = [
  { left: '4%', top: '6px', size: '2px', dur: '2.6s', delay: '-.4s' },
  { left: '14%', top: '38px', size: '3px', dur: '3.1s', delay: '-1.8s' },
  { left: '24%', top: '4px', size: '2px', dur: '2.2s', delay: '-.9s' },
  { left: '90%', top: '14px', size: '3px', dur: '2.8s', delay: '-2.2s' },
  { left: '80%', top: '44px', size: '2px', dur: '2.4s', delay: '-1.1s' },
  { left: '96%', top: '2px', size: '2px', dur: '3.4s', delay: '-.2s' },
  { left: '70%', top: '0px', size: '2px', dur: '2.9s', delay: '-1.6s' },
  { left: '38%', top: '10px', size: '2px', dur: '2.5s', delay: '-.6s' },
  { left: '46%', top: '46px', size: '2px', dur: '3.2s', delay: '-2.4s' },
  { left: '58%', top: '4px', size: '3px', dur: '2.7s', delay: '-1.3s' },
  { left: '63%', top: '40px', size: '2px', dur: '2.3s', delay: '-.2s' },
  { left: '32%', top: '48px', size: '2px', dur: '3.5s', delay: '-1.9s' },
  { left: '52%', top: '18px', size: '2px', dur: '2.9s', delay: '-.8s' },
]

/**
 * The animated "Zalopay AI Space" wordmark: UFO with a light beam over the logo, a flash + glint,
 * and the AI tool logos floating around it. The intro keyframes run when an ancestor has the
 * `zp-intro` class (see index.css); otherwise it shows the settled state.
 */
// `width`: the wordmark's width (its height follows).
export default function HeroWordmark({ width = 320 }) {
  return (
    <>
      <div style={css(`position:relative; max-width:${width}px; width:100%; margin:0 auto; height:32px;`)}>
        {UFO_STARS.map((s, i) => (
          <span key={i} style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px 1px rgba(255,255,255,.75)', animation: `twinkle ${s.dur} ease-in-out infinite`, animationDelay: s.delay, pointerEvents: 'none' }}></span>
        ))}
        <div className="zp-ufo">
          <div style={css('position:relative; width:0; height:0;')}>
            <div style={css('position:absolute; left:0; top:24px; width:84px; height:96px; transform:translateX(-50%); clip-path:polygon(50% 0%, 100% 100%, 0% 100%); background:linear-gradient(180deg,rgba(180,225,255,.5) 0%,rgba(140,200,255,.12) 65%,rgba(140,200,255,0) 100%);')} className="zp-beam"></div>
            <svg width="60" height="32" viewBox="0 0 76 40" style={css('position:absolute; left:-30px; top:0; display:block; filter:drop-shadow(0 6px 14px rgba(0,0,0,.5));')}>
              <ellipse cx="38" cy="26" rx="36" ry="8" fill="#B7C6E0" />
              <ellipse cx="38" cy="24" rx="27" ry="6.5" fill="#8CA0C7" />
              <path d="M20 22 Q38 2 56 22 Z" fill="#CFE6FF" opacity="0.9" />
              <circle cx="22" cy="27" r="2.2" fill="#5EE7FF" />
              <circle cx="38" cy="29" r="2.2" fill="#FFE45E" />
              <circle cx="54" cy="27" r="2.2" fill="#5EE7FF" />
            </svg>
          </div>
        </div>
      </div>
      <div style={css(`position:relative; margin:0 auto; width:min(100%,${width}px);`)}>
        <div className="zp-logo-ting" style={css('position:relative;')}>
          <div className="zp-flash"></div>
          <div className="zp-logo-reveal">
            <img src={logo} alt="Zalopay AI Space" style={css('position:relative; display:block; width:100%; height:auto;')} />
          </div>
          <svg className="zp-glint" width="72" height="72" viewBox="0 0 24 24"><path d="M12 0 C12.8 7.5 16.5 11.2 24 12 C16.5 12.8 12.8 16.5 12 24 C11.2 16.5 7.5 12.8 0 12 C7.5 11.2 11.2 7.5 12 0 Z" fill="#fff" /></svg>
        </div>
        {AI_LOGOS.map((l, i) => (
          <div key={l.alt} className="zp-ailogo-pos" style={{ ...l.pos, '--i': i }}>
            <div className="zp-ailogo"><img src={l.src} alt={l.alt} style={{ width: l.w, height: 'auto', display: 'block' }} /></div>
          </div>
        ))}
      </div>
    </>
  )
}
