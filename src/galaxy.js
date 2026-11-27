// Loading-screen sky: a slowly turning spiral galaxy (logo at its core) and twinkling stars.
const TAU = Math.PI * 2

export function initGalaxy(canvas, { reduced, center }) {
  const ctx = canvas.getContext('2d')
  let W = 0, H = 0, R = 0
  const dpr = Math.min(window.devicePixelRatio, 2)

  const palette = [
    [255, 246, 232], // core: hot cream
    [255, 196, 216], // pink
    [217, 74, 134], // rose
    [151, 7, 71], // crimson
    [111, 147, 163], // slate-blue dust at the rim
  ]
  const ARMS = 3
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2
  const parts = Array.from({ length: 7000 }, (_, i) => {
    const bulge = i % 5 === 0 // a fifth of the stars form the bright central bulge
    const t = bulge ? Math.pow(Math.random(), 2.2) * 0.35 : Math.pow(Math.random(), 0.9) // 0 = core, 1 = rim
    const arm = i % ARMS
    // stars hug their arm; a little scatter, more near the core
    const spread = bulge ? Math.random() * TAU : gauss() * (0.32 - t * 0.18)
    const col = palette[Math.min(palette.length - 1, Math.floor(t * (palette.length - 0.2) + Math.random() * 0.6))]
    return {
      t,
      a: bulge ? spread : (arm / ARMS) * TAU + t * 6.2 + spread, // spiral twist
      jitter: gauss() * 0.04,
      size: Math.random() < 0.05 ? 1.9 : 0.7 + Math.random() * 0.9,
      col,
      alpha: (1 - t * 0.45) * (0.45 + Math.random() * 0.55),
    }
  })
  const stars = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.4 + 0.3, tw: Math.random() * TAU, sp: 0.6 + Math.random() * 2 }))

  function resize() {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    R = Math.min(W, H) * 0.62
  }
  resize()
  window.addEventListener('resize', resize)

  const state = { zoom: 1, rot: 0 }
  let running = true, time = 0
  const tilt = 0.42, roll = -0.35
  const cr = Math.cos(roll), sr = Math.sin(roll)

  function frame() {
    if (!running) return
    requestAnimationFrame(frame)
    time += 0.016
    ctx.clearRect(0, 0, W, H)
    // centre the galaxy on the logo circle so the moon sits at its core
    let cx = W / 2, cy = H / 2
    if (center) {
      const b = center.getBoundingClientRect()
      cx = b.left + b.width / 2
      cy = b.top + b.height / 2
    }

    // background stars
    for (const s of stars) {
      const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * s.sp + s.tw))
      ctx.globalAlpha = a
      ctx.fillStyle = '#fef4e8'
      ctx.fillRect(s.x * W, s.y * H, s.s, s.s)
    }

    ctx.globalCompositeOperation = 'lighter'
    // core glow
    const z = state.zoom
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45 * z)
    g.addColorStop(0, 'rgba(255,236,220,0.55)')
    g.addColorStop(0.3, 'rgba(217,74,134,0.18)')
    g.addColorStop(1, 'rgba(19,68,90,0)')
    ctx.globalAlpha = 1
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // spiral arms — inner stars orbit faster (differential rotation)
    if (!reduced) state.rot += 0.0016
    for (const p of parts) {
      const ang = p.a + state.rot * (1.6 - p.t)
      const r = (0.04 + p.t * 0.96 + p.jitter) * R * z
      const x = Math.cos(ang) * r
      const y = Math.sin(ang) * r * tilt
      const px = cx + x * cr - y * sr
      const py = cy + x * sr + y * cr
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = `rgb(${p.col[0]},${p.col[1]},${p.col[2]})`
      ctx.fillRect(px, py, p.size, p.size)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
  frame()

  return {
    state,
    stop() {
      running = false
      window.removeEventListener('resize', resize)
    },
  }
}
