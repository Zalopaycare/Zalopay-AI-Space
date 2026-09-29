import { css } from '../lib/style.js'

const STARS = [
  [84, '17%', 3, '3.4s', '0s'], [126, '33%', 2, '4.2s', '.5s'], [92, '59%', 4, '3.7s', '.2s'],
  [150, '79%', 3, '4.6s', '.9s'], [206, '11%', 2, '3.9s', '1.1s'], [236, '45%', 3, '4.1s', '.3s'],
  [178, '88%', 4, '3.5s', '.7s'], [280, '25%', 2, '4.4s', '1s'], [300, '67%', 3, '3.8s', '.4s'],
  [112, '49%', 2, '4.3s', '.6s'], [256, '83%', 3, '3.6s', '1.2s'], [322, '39%', 2, '4.5s', '.8s'],
  [60, '6%', 2, '4s', '.3s'], [48, '94%', 2, '3.3s', '1.4s'], [360, '8%', 2, '4.7s', '.2s'], [370, '92%', 3, '3.9s', '.6s'],
]

/**
 * The Use Case Library hero backdrop (grid, blue glow, curved planet horizon, twinkling stars)
 * as a reusable absolute layer. Drop it as the first child of a `position:relative` wrapper;
 * `arcTop` is where the horizon starts and `bg` must match the page background so the
 * horizon's body blends into the rest of the page.
 */
// The horizon sits this much higher than `arcTop`, so the curve peeks out right under the page heading.
const ARC_LIFT = 80

export default function SpaceBackdrop({ arcTop = 260, bg = '#07070c', className }) {
  const o = arcTop - 260
  return (
    <div className={className} style={css(`position:absolute; left:0; right:0; top:0; height:${arcTop + 720}px; overflow:hidden; pointer-events:none; z-index:0;`)}>
      <div style={css(`position:absolute; left:0; right:0; top:0; height:${arcTop + 360}px; background-image:linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); background-size:52px 52px; -webkit-mask-image:radial-gradient(82% 62% at 50% 16%, #000 26%, transparent 76%); mask-image:radial-gradient(82% 62% at 50% 16%, #000 26%, transparent 76%);`)}></div>
      <div className="zp-bd-light" style={css(`position:absolute; left:50%; top:${o - 10}px; transform:translateX(-50%); width:1180px; height:600px; background:radial-gradient(50% 56% at 50% 40%, rgba(150,190,255,.62) 0%, rgba(26,95,255,.6) 22%, rgba(16,60,210,.3) 48%, rgba(16,60,210,0) 72%);`)}></div>
      <div className="zp-bd-light" style={css(`position:absolute; left:50%; top:${o + 70}px; transform:translateX(-50%); width:560px; height:320px; background:radial-gradient(50% 50% at 50% 50%, rgba(120,170,255,.55) 0%, rgba(60,120,255,0) 70%); filter:blur(6px);`)}></div>
      <div className="zp-bd-light" style={css(`position:absolute; left:50%; top:${arcTop - ARC_LIFT}px; transform:translateX(-50%); width:2600px; height:2600px; border-radius:50%; background:${bg}; box-shadow:0 -2px 92px 10px rgba(26,95,255,.68), inset 0 8px 82px rgba(46,120,255,.3);`)}></div>
      {STARS.map(([top, left, size, dur, delay], i) => (
        <span
          key={i}
          style={css(`position:absolute; top:${top + o}px; left:${left}; width:${size}px; height:${size}px; border-radius:50%; background:${size >= 3 ? '#fff' : '#cfe6ff'}; box-shadow:0 0 ${size + 4}px ${size >= 3 ? '#9fd0ff' : '#2f8dff'}; animation:twinkle ${dur} ease-in-out ${delay} infinite;`)}
        />
      ))}
    </div>
  )
}
