// Asteroid cursor: a tumbling rock that disturbs the space around it.
// A faint field of cosmic dust covers the page; as the asteroid flies through,
// nearby dust is pushed aside, caught in its wake and lights up, then drifts home.
const TAU = Math.PI * 2

function glowSprite([r, g, b], size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const grd = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(${r},${g},${b},1)`)
  grd.addColorStop(0.3, `rgba(${r},${g},${b},0.4)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  x.fillStyle = grd
  x.fillRect(0, 0, size, size)
  return c
}

function makeLayer(cls) {
  const cv = document.createElement('canvas')
  cv.className = `asteroid-layer ${cls}`
  cv.setAttribute('aria-hidden', 'true')
  cv.popover = 'manual'
  document.body.appendChild(cv)
  cv.showPopover()
  return cv
}

export function initAsteroidCursor() {
  // dust uses `difference` blending so it reads on both the dark and cream sections
  const dustCv = makeLayer('asteroid-layer--dust')
  const rockCv = makeLayer('asteroid-layer--rock')
  const dctx = dustCv.getContext('2d')
  const rctx = rockCv.getContext('2d')

  const SP = 58 // dust spacing in px
  let W = 0, H = 0, span = 0, dust = []
  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    W = window.innerWidth
    H = window.innerHeight
    for (const [cv, ctx] of [[dustCv, dctx], [rockCv, rctx]]) {
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    span = H + SP * 2
    dust = []
    for (let y = 0; y < span; y += SP) {
      for (let x = -SP; x < W + SP; x += SP) {
        dust.push({ hx: x + Math.random() * SP, hy: y + Math.random() * SP, ox: 0, oy: 0, vx: 0, vy: 0, s: 0.6 + Math.random() * 1.1, tw: Math.random() * TAU })
      }
    }
  }
  resize()
  window.addEventListener('resize', resize)

  // pixel-art asteroid sprite
  const rock = new Image()
  rock.src = '/img/asteroid.png'
  const glow = glowSprite([255, 120, 165])
  const spark = glowSprite([255, 226, 200])

  const mouse = { x: W / 2, y: H / 2 }
  const pos = { x: W / 2, y: H / 2 }
  let visible = false, angle = 0, spinDir = 1, scale = 1, scaleT = 1, heat = 0, t = 0
  const sparks = []

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    mouse.x = e.clientX
    mouse.y = e.clientY
    if (!visible) {
      visible = true
      pos.x = mouse.x
      pos.y = mouse.y
    }
  })
  document.documentElement.addEventListener('mouseleave', () => (visible = false))
  window.addEventListener('pointerdown', () => (scale *= 0.8))

  function frame() {
    requestAnimationFrame(frame)
    t += 0.016
    const px = pos.x, py = pos.y
    pos.x += (mouse.x - pos.x) * 0.35
    pos.y += (mouse.y - pos.y) * 0.35
    const vx = pos.x - px, vy = pos.y - py
    const speed = Math.hypot(vx, vy)
    heat += (Math.min(speed / 22, 1) - heat) * 0.1
    if (Math.abs(vx) > 0.5) spinDir = Math.sign(vx)
    angle += (0.01 + speed * 0.005) * spinDir
    scale += (scaleT - scale) * 0.15

    // ---- the space: dust field reacting to the asteroid ----
    dctx.clearRect(0, 0, W, H)
    const R = 110 + heat * 90
    const R2 = R * R
    const shift = (window.scrollY * 0.2) % span
    dctx.strokeStyle = 'rgb(214,206,196)'
    dctx.fillStyle = 'rgb(214,206,196)'
    dctx.lineCap = 'round'
    for (const d of dust) {
      let y = d.hy - shift
      if (y < -SP) y += span
      const x = d.hx + d.ox
      y += d.oy
      const dx = x - pos.x, dy = y - pos.y
      const dist2 = dx * dx + dy * dy
      let near = 0
      if (visible && dist2 < R2) {
        const dist = Math.sqrt(dist2) || 1
        near = 1 - dist / R
        const f = near * near
        // pushed outward, and dragged along in the asteroid's wake
        d.vx += (dx / dist) * f * (0.5 + speed * 0.06) + vx * f * 0.06
        d.vy += (dy / dist) * f * (0.5 + speed * 0.06) + vy * f * 0.06
      }
      d.vx = (d.vx - d.ox * 0.012) * 0.9
      d.vy = (d.vy - d.oy * 0.012) * 0.9
      d.ox += d.vx
      d.oy += d.vy
      const energy = Math.min(1, Math.hypot(d.ox, d.oy) / 36)
      const a = 0.05 + 0.05 * Math.sin(t * 1.5 + d.tw) + energy * 0.7 + near * 0.3
      if (a < 0.04) continue
      dctx.globalAlpha = Math.min(1, a)
      const sv = Math.hypot(d.vx, d.vy)
      if (sv > 0.4) {
        dctx.lineWidth = d.s * 1.2
        dctx.beginPath()
        dctx.moveTo(x - d.vx * 3.5, y - d.vy * 3.5)
        dctx.lineTo(x, y)
        dctx.stroke()
      } else {
        dctx.fillRect(x - d.s / 2, y - d.s / 2, d.s, d.s)
      }
    }
    dctx.globalAlpha = 1

    // ---- the rock ----
    rctx.clearRect(0, 0, W, H)
    if (visible && speed > 14 && Math.random() < 0.25 && sparks.length < 24) {
      sparks.push({ x: pos.x, y: pos.y, vx: -vx * 0.08 + (Math.random() - 0.5), vy: -vy * 0.08 + (Math.random() - 0.5), life: 1 })
    }
    rctx.globalCompositeOperation = 'lighter'
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]
      s.x += s.vx
      s.y += s.vy
      s.life -= 0.05
      if (s.life <= 0) {
        sparks.splice(i, 1)
        continue
      }
      const r = 4 * s.life
      rctx.globalAlpha = s.life
      rctx.drawImage(spark, s.x - r, s.y - r, r * 2, r * 2)
    }
    if (visible) {
      const gs = (16 + heat * 20) * scale
      rctx.globalAlpha = 0.12 + heat * 0.35
      rctx.drawImage(glow, pos.x - gs, pos.y - gs, gs * 2, gs * 2)
    }
    rctx.globalAlpha = 1
    rctx.globalCompositeOperation = 'source-over'
    if (visible && rock.complete && rock.naturalWidth) {
      // tumble in quarter turns so the pixel art stays crisp (free rotation would blur it)
      const rs = Math.round(17 * scale)
      const quarter = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2)
      rctx.save()
      rctx.translate(Math.round(pos.x), Math.round(pos.y))
      rctx.rotate(quarter)
      rctx.drawImage(rock, -rs, -rs, rs * 2, rs * 2)
      rctx.restore()
    }
  }
  frame()

  return {
    setHover(on) {
      scaleT = on ? 1.6 : 1
    },
    /** re-enter the top layer so the asteroid stays above an open modal dialog */
    raise() {
      for (const cv of [dustCv, rockCv]) {
        cv.hidePopover()
        cv.showPopover()
      }
    },
  }
}
