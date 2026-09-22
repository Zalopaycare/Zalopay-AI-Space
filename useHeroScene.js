import { useEffect } from 'react'

const ORBIT_SPEED = 0.14
const SPHERE_SPIN = 0.16

/**
 * Ported near-verbatim from Zalopay AI Space v2.dc.html componentDidMount/WillUnmount:
 * a particle-sphere canvas plus a mouse-driven 3D orbit of AI-tool tiles around it.
 * `heroRef` is the hero section (drag/hover source), `orbitRef` the tile container,
 * `sphereRef` the canvas.
 */
export function useHeroScene({ heroRef, orbitRef, sphereRef }) {
  useEffect(() => {
    const hero = heroRef.current
    const o = { yaw: 0, vyaw: 0, pitch: (18 * Math.PI) / 180, pitchTarget: (18 * Math.PI) / 180, nx: 0, ny: 0, hovering: false, dragging: false, lastX: 0, lastY: 0 }
    let mm, ml, md, mu

    if (hero) {
      mm = (e) => {
        const r = hero.getBoundingClientRect()
        o.hovering = true
        o.nx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)))
        o.ny = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)))
        if (o.dragging) {
          const dx = e.clientX - o.lastX
          const dy = e.clientY - o.lastY
          o.yaw += dx * 0.009
          o.vyaw = dx * 0.35
          o.pitchTarget = (Math.max(2, Math.min(40, (o.pitch * 180) / Math.PI + dy * 0.15)) * Math.PI) / 180
          o.lastX = e.clientX
          o.lastY = e.clientY
        } else {
          o.pitchTarget = ((18 - o.ny * 14) * Math.PI) / 180
        }
      }
      ml = () => { o.hovering = false; o.nx = 0; o.pitchTarget = (18 * Math.PI) / 180 }
      md = (e) => { o.dragging = true; o.vyaw = 0; o.lastX = e.clientX; o.lastY = e.clientY; hero.style.cursor = 'grabbing' }
      mu = () => { o.dragging = false; hero.style.cursor = '' }
      hero.style.cursor = 'grab'
      hero.addEventListener('mousemove', mm)
      hero.addEventListener('mouseleave', ml)
      hero.addEventListener('mousedown', md)
      window.addEventListener('mouseup', mu)
    }

    // ---- particle sphere setup ----
    const cv = sphereRef.current
    let ctx = null
    let pts = []
    const CSS = 330, R = 134, CX = 165, CY = 165
    if (cv) {
      ctx = cv.getContext('2d')
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = CSS * dpr
      cv.height = CSS * dpr
      cv.style.width = CSS + 'px'
      cv.style.height = CSS + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const N = 1500, GA = Math.PI * (3 - Math.sqrt(5))
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2
        const rr = Math.sqrt(Math.max(0, 1 - y * y))
        const th = i * GA
        pts.push({ x: Math.cos(th) * rr, y, z: Math.sin(th) * rr, ring: 0 })
      }
      const mkRing = (ax, az, cnt) => {
        const ca = Math.cos(ax), sa = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az)
        for (let k = 0; k < cnt; k++) {
          const t = (k / cnt) * Math.PI * 2
          const x = Math.cos(t), y = 0, z = Math.sin(t)
          const y1 = y * ca - z * sa, z1 = y * sa + z * ca, x1 = x
          const x2 = x1 * cz - y1 * sz, y2 = x1 * sz + y1 * cz, z2 = z1
          pts.push({ x: x2, y: y2, z: z2, ring: 1 })
        }
      }
      mkRing(0.5, 0.3, 172)
      mkRing(-0.7, 0.95, 172)
      mkRing(0.32, -0.62, 172)
    }

    const D2R = Math.PI / 180
    const geo = [
      [200, 0, 18], [200, 90, 18], [200, 180, 18], [200, 270, 18],
      [284, 45, -18], [284, 135, -18], [284, 225, -18], [284, 315, -18],
    ].map((d) => ({ r: d[0], a: d[1] * D2R, roll: d[2] * D2R }))
    const DP = 840, maxR = 284, tilt = -0.34
    let syaw = 0
    let last = performance.now()
    let raf = 0

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      syaw += SPHERE_SPIN * dt

      if (ctx && sphereRef.current) {
        ctx.clearRect(0, 0, CSS, CSS)
        const cyw = Math.cos(syaw), syw = Math.sin(syaw), ct = Math.cos(tilt), st = Math.sin(tilt)
        const arr = []
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]
          const x1 = p.x * cyw + p.z * syw, z1 = -p.x * syw + p.z * cyw, y1 = p.y
          const y2 = y1 * ct - z1 * st, z2 = y1 * st + z1 * ct
          let d = x1 * -0.45 + y2 * -0.55 + z2 * 0.7
          let shade = 0.2 + 0.8 * d
          if (shade < 0) shade = 0
          if (shade > 1) shade = 1
          const depth = (z2 + 1) / 2
          let a = (0.3 + 0.62 * shade) * (0.46 + 0.54 * depth)
          if (p.ring) a = Math.min(1, a + 0.22)
          const cr = 26 + (p.ring ? 204 : 176) * shade
          const cg = 74 + (p.ring ? 184 : 158) * shade
          const cb = 156 + 99 * shade
          const sz = (p.ring ? 1.0 : 0.62) + (p.ring ? 0.85 : 0.82) * shade
          arr.push({ sx: CX + x1 * R, sy: CY + y2 * R, z: z2, c: 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' + a.toFixed(3) + ')', sz })
        }
        arr.sort((m, n) => m.z - n.z)
        for (let i = 0; i < arr.length; i++) {
          const q = arr[i]
          ctx.beginPath()
          ctx.fillStyle = q.c
          ctx.arc(q.sx, q.sy, q.sz, 0, 6.2832)
          ctx.fill()
        }
      }

      const scene = orbitRef.current
      if (scene) {
        if (!o.dragging) {
          o.yaw += (ORBIT_SPEED + (o.hovering ? o.nx * 2.2 : 0)) * dt
          o.yaw += o.vyaw * dt
          o.vyaw *= Math.pow(0.92, dt * 60)
        }
        o.pitch += (o.pitchTarget - o.pitch) * Math.min(1, dt * 6)
        const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch)
        const tiles = scene.querySelectorAll('.orbit-tile')
        tiles.forEach((el, i) => {
          const g = geo[i]
          if (!g) return
          const cr = Math.cos(g.roll), sr = Math.sin(g.roll)
          const x = g.r * Math.cos(g.a), y = 0, z = g.r * Math.sin(g.a)
          const x1 = x * cr - y * sr, y1 = x * sr + y * cr, z1 = z
          const x2 = x1 * cy + z1 * sy, y2 = y1, z2 = -x1 * sy + z1 * cy
          const x3 = x2, y3 = y2 * cp - z2 * sp, z3 = y2 * sp + z2 * cp
          const scale = DP / (DP - z3)
          el.style.transform = 'translate(-50%,-50%) translate(' + (x3 * scale).toFixed(1) + 'px,' + (y3 * scale).toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')'
          el.style.opacity = Math.max(0.4, Math.min(1, 0.5 + 0.5 * (z3 / maxR))).toFixed(3)
          el.style.zIndex = String(Math.round(500 + z3))
          el.style.filter = z3 < 0 ? 'blur(' + ((-z3 / maxR) * 2).toFixed(1) + 'px)' : 'none'
        })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      if (hero) {
        if (mm) hero.removeEventListener('mousemove', mm)
        if (ml) hero.removeEventListener('mouseleave', ml)
        if (md) hero.removeEventListener('mousedown', md)
      }
      if (mu) window.removeEventListener('mouseup', mu)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
