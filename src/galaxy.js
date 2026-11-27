// Loading-screen sky: a Milky Way band — dense blue star clouds, a warm orange core cut by
// dark dust lanes, and thousands of stars — running diagonally behind the logo.
// The band is painted once into an oversized buffer; each frame just drifts/zooms it and
// twinkles the brightest stars on top.
const TAU = Math.PI * 2
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2

function blob(g, x, y, r, [cr, cg, cb], a) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r)
  grd.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`)
  grd.addColorStop(0.45, `rgba(${cr},${cg},${cb},${a * 0.45})`)
  grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
  g.fillStyle = grd
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

function paintMilkyWay(BW, BH) {
  const c = document.createElement('canvas')
  c.width = BW
  c.height = BH
  const g = c.getContext('2d')

  // deep night sky
  const bg = g.createLinearGradient(0, 0, BW, BH)
  bg.addColorStop(0, '#02040f')
  bg.addColorStop(0.5, '#050c26')
  bg.addColorStop(1, '#03071a')
  g.fillStyle = bg
  g.fillRect(0, 0, BW, BH)

  // band axis: through the centre, tilted like the photo (top-left → bottom-right)
  const ang = 1.08 // ~62° from horizontal
  const ux = Math.cos(ang), uy = Math.sin(ang) // along the band
  const nx = -uy, ny = ux // across the band
  const L = Math.hypot(BW, BH) * 0.6
  const width = Math.min(BW, BH) * 0.14
  const at = (t, off) => ({ x: BW / 2 + ux * t * L + nx * off, y: BH / 2 + uy * t * L + ny * off })

  g.globalCompositeOperation = 'lighter'
  // blue star clouds (the bulk of the band), clumpy
  for (let i = 0; i < 520; i++) {
    const t = Math.random() * 2 - 1
    const p = at(t, gauss() * width * 1.4)
    const r = width * (0.25 + Math.random() * 0.9)
    const deep = Math.random() < 0.6
    blob(g, p.x, p.y, r, deep ? [22, 48, 160] : [50, 100, 220], 0.012 + Math.random() * 0.022)
  }
  // brighter knots of stars inside the clouds
  for (let i = 0; i < 60; i++) {
    const p = at(Math.random() * 1.4 - 0.9, gauss() * width * 0.8)
    blob(g, p.x, p.y, width * (0.1 + Math.random() * 0.22), [100, 155, 255], 0.04 + Math.random() * 0.045)
  }
  // warm galactic core: orange / rust glow toward the lower end, off to one side of the lane
  for (let i = 0; i < 170; i++) {
    const t = 0.3 + Math.random() * 0.7
    const p = at(t, width * 0.4 + gauss() * width * 0.55)
    const warm = Math.random()
    const col = warm < 0.5 ? [225, 115, 40] : warm < 0.85 ? [170, 75, 40] : [250, 175, 95]
    blob(g, p.x, p.y, width * (0.15 + Math.random() * 0.45), col, (0.02 + Math.random() * 0.04) * (0.4 + t))
  }

  // dark dust lanes: many small, faint smudges along a winding path, so they read as streaks
  g.globalCompositeOperation = 'source-over'
  for (let lane = 0; lane < 2; lane++) {
    const side = lane ? -0.35 : 0.15
    for (let i = 0; i < 900; i++) {
      const t = Math.random() * 1.9 - 0.95
      const wiggle = Math.sin(t * 7 + lane * 2) * width * 0.22 + Math.sin(t * 19) * width * 0.06
      const p = at(t, width * side + wiggle + gauss() * width * 0.12)
      blob(g, p.x, p.y, width * (0.04 + Math.random() * 0.1), [2, 4, 14], 0.05 + Math.random() * 0.07)
    }
  }

  // (stars are not painted here: they are live particles, see initGalaxy)
  g.globalCompositeOperation = 'source-over'
  return { c, at, width }
}

export function initGalaxy(canvas, { reduced, center }) {
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio, 2)
  let W = 0, H = 0, sky = null, twinkles = []
  const OVER = 1.8 // buffer is larger than the screen so it can drift and zoom out

  function resize() {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const BW = Math.round(W * OVER), BH = Math.round(H * OVER)
    sky = paintMilkyWay(BW, BH)
    // live stars: each one has a depth, so they drift, twinkle and parallax independently.
    // ~60% crowd into the Milky Way band, the rest are scattered across the sky.
    const count = Math.min(9000, Math.round((W * H) / 130))
    twinkles = Array.from({ length: count }, () => {
      const inBand = Math.random() < 0.7
      const p = inBand ? sky.at(Math.random() * 2 - 1, gauss() * sky.width * 1.5) : { x: Math.random() * BW, y: Math.random() * BH }
      const tint = Math.random()
      const big = Math.random() < 0.012
      return {
        x: p.x - BW / 2,
        y: p.y - BH / 2,
        z: 0.25 + Math.random() * 0.75, // 1 = far away, 0.25 = close
        s: big ? 1.6 + Math.random() * 1.2 : Math.random() < 0.9 ? 0.5 + Math.random() * 0.8 : 1.1 + Math.random() * 0.9,
        a: 0.3 + Math.random() * 0.7,
        tw: Math.random() * TAU,
        sp: 0.5 + Math.random() * 2.5,
        col: tint < 0.6 ? '#ffffff' : tint < 0.86 ? '#b9d2ff' : '#ffe2c2',
        big,
      }
    })
  }
  // soft halo for the few big blue-white stars
  const halo = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    blob(g, 32, 32, 32, [120, 170, 255], 0.6)
    return c
  })()
  resize()
  window.addEventListener('resize', resize)

  const state = { zoom: 1, rot: 0, warp: 0 }
  let running = true, time = 0
  // hyperspace streaks used for the exit warp
  const streaks = Array.from({ length: 320 }, () => ({ a: Math.random() * TAU, d: Math.random(), w: 0.5 + Math.random() * 1.3 }))

  function frame() {
    if (!running) return
    requestAnimationFrame(frame)
    time += 0.016
    if (!reduced) state.rot += 0.00012
    // centre the band on the logo circle
    let cx = W / 2, cy = H / 2
    if (center) {
      const b = center.getBoundingClientRect()
      cx = b.left + b.width / 2
      cy = b.top + b.height / 2
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#02040f'
    ctx.fillRect(0, 0, W, H)
    ctx.translate(cx, cy)
    ctx.rotate(state.rot)
    ctx.scale(state.zoom, state.zoom)
    ctx.translate(-sky.c.width / 2, -sky.c.height / 2)
    ctx.drawImage(sky.c, 0, 0)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // live stars, projected with depth: near ones spread faster as we zoom, and drift a little
    ctx.globalCompositeOperation = 'lighter'
    const z = state.zoom
    const cr = Math.cos(state.rot), sr = Math.sin(state.rot)
    const drift = reduced ? 0 : time * 2.2
    for (const s of twinkles) {
      const depthBoost = 1 + Math.max(0, z - 0.85) * (1 / s.z - 1) * 0.9
      const f = z * depthBoost
      const lx = s.x + drift / s.z, ly = s.y - drift * 0.4 / s.z
      const x = cx + (lx * cr - ly * sr) * f
      const y = cy + (lx * sr + ly * cr) * f
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue
      const tw = 0.5 + 0.5 * Math.sin(time * s.sp + s.tw)
      const a = s.a * (0.35 + 0.65 * tw * tw)
      const size = s.s * (0.75 + 0.35 / s.z)
      if (s.big) {
        ctx.globalAlpha = a * 0.8
        const hs = size * 7
        ctx.drawImage(halo, x - hs, y - hs, hs * 2, hs * 2)
      }
      ctx.globalAlpha = a
      ctx.fillStyle = s.col
      ctx.fillRect(x - size / 2, y - size / 2, size, size)
      if (s.big || a > 0.9) {
        // cross-shaped glint on the brightest stars
        ctx.globalAlpha = s.big ? a * 0.7 : (a - 0.9) * 4
        ctx.fillRect(x - size * 3, y - 0.3, size * 6, 0.6)
        ctx.fillRect(x - 0.3, y - size * 3, 0.6, size * 6)
      }
    }
    ctx.globalAlpha = 1

    // warp: stars stream outward from the logo as we fly forward
    if (state.warp > 0.01) {
      const maxR = Math.hypot(W, H) * 0.6
      ctx.strokeStyle = '#dfe9ff'
      ctx.lineCap = 'round'
      for (const s of streaks) {
        s.d *= 1.02 + state.warp * 0.09
        if (s.d > 1.15) s.d = 0.02 + Math.random() * 0.1
        const r1 = s.d * maxR, r0 = r1 * (1 - 0.35 * state.warp)
        ctx.globalAlpha = Math.min(1, s.d * 1.6) * state.warp
        ctx.lineWidth = s.w * (0.6 + s.d)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0)
        ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
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
