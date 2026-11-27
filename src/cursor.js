// Asteroid cursor: a tumbling rock that trails fire and embers when it moves.
const TAU = Math.PI * 2

function glowSprite([r, g, b], size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const grd = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, `rgba(${r},${g},${b},1)`)
  grd.addColorStop(0.3, `rgba(${r},${g},${b},0.45)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  x.fillStyle = grd
  x.fillRect(0, 0, size, size)
  return c
}

function asteroidSprite(px) {
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')
  const r = px * 0.42
  g.translate(px / 2, px / 2)

  // lumpy outline
  const N = 13
  const pts = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * TAU + (Math.random() - 0.5) * 0.3
    const rr = r * (0.76 + Math.random() * 0.24)
    return [Math.cos(a) * rr, Math.sin(a) * rr]
  })
  const outline = () => {
    g.beginPath()
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    const start = mid(pts[N - 1], pts[0])
    g.moveTo(start[0], start[1])
    for (let i = 0; i < N; i++) {
      const m = mid(pts[i], pts[(i + 1) % N])
      g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1])
    }
    g.closePath()
  }

  outline()
  const fill = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r * 1.15)
  fill.addColorStop(0, '#fef4e8')
  fill.addColorStop(0.45, '#cbb998')
  fill.addColorStop(1, '#2f4c59')
  g.fillStyle = fill
  g.fill()

  g.save()
  outline()
  g.clip()
  // craters: dark bowl + lit inner wall
  const craters = [[-0.28, -0.18, 0.22], [0.32, 0.12, 0.17], [-0.05, 0.42, 0.13], [0.22, -0.4, 0.1], [-0.45, 0.25, 0.08]]
  for (const [x, y, cr] of craters) {
    g.beginPath()
    g.arc(x * r, y * r, cr * r, 0, TAU)
    g.fillStyle = 'rgba(36,62,74,0.5)'
    g.fill()
    g.beginPath()
    g.arc(x * r + cr * r * 0.22, y * r + cr * r * 0.22, cr * r * 0.62, 0, TAU)
    g.fillStyle = 'rgba(254,244,232,0.16)'
    g.fill()
  }
  // terminator shadow
  const sh = g.createLinearGradient(-r, -r, r, r)
  sh.addColorStop(0, 'rgba(12,49,66,0)')
  sh.addColorStop(0.5, 'rgba(12,49,66,0)')
  sh.addColorStop(1, 'rgba(12,49,66,0.7)')
  g.fillStyle = sh
  g.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)
  g.restore()

  outline()
  g.lineWidth = px * 0.014
  g.strokeStyle = 'rgba(12,49,66,0.55)'
  g.stroke()
  return c
}

export function initAsteroidCursor() {
  const cv = document.createElement('canvas')
  cv.className = 'asteroid-cursor'
  cv.setAttribute('aria-hidden', 'true')
  cv.popover = 'manual'
  document.body.appendChild(cv)
  cv.showPopover()
  const ctx = cv.getContext('2d')

  let W = 0, H = 0
  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    W = window.innerWidth
    H = window.innerHeight
    cv.width = W * dpr
    cv.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  const rock = asteroidSprite(128)
  const hot = glowSprite([255, 232, 205])
  const pink = glowSprite([255, 96, 150])
  const crimson = glowSprite([151, 7, 71])

  const mouse = { x: W / 2, y: H / 2 }
  const pos = { x: W / 2, y: H / 2 }
  let visible = false, angle = 0, spinDir = 1, scale = 1, scaleT = 1, heat = 0
  const parts = []

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

  function emit(x, y, vx, vy, size, decay) {
    parts.push({ x, y, vx, vy, size, decay, life: 1 })
  }

  function frame() {
    requestAnimationFrame(frame)
    ctx.clearRect(0, 0, W, H)

    const px = pos.x, py = pos.y
    pos.x += (mouse.x - pos.x) * 0.35
    pos.y += (mouse.y - pos.y) * 0.35
    const vx = pos.x - px, vy = pos.y - py
    const speed = Math.hypot(vx, vy)
    heat += (Math.min(speed / 22, 1) - heat) * 0.12
    if (Math.abs(vx) > 0.5) spinDir = Math.sign(vx)
    angle += (0.01 + speed * 0.006) * spinDir
    scale += (scaleT - scale) * 0.15

    if (visible) {
      // fire trail: more embers the faster it moves
      const n = Math.min(9, Math.floor(speed * 0.4))
      for (let i = 0; i < n; i++) {
        const t = Math.random()
        emit(
          px + vx * t + (Math.random() - 0.5) * 8 * scale,
          py + vy * t + (Math.random() - 0.5) * 8 * scale,
          -vx * 0.05 + (Math.random() - 0.5) * 0.7,
          -vy * 0.05 + (Math.random() - 0.5) * 0.7,
          (5 + Math.random() * 9) * scale * (0.7 + heat * 0.6),
          0.02 + Math.random() * 0.03
        )
      }
      // idle smoulder
      if (Math.random() < 0.18) {
        emit(pos.x + (Math.random() - 0.5) * 10, pos.y + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 0.3, -0.25 - Math.random() * 0.3, 2 + Math.random() * 3, 0.015)
      }
    }
    if (parts.length > 420) parts.splice(0, parts.length - 420)

    ctx.globalCompositeOperation = 'lighter'

    // streak of light behind the rock
    if (visible && speed > 1.2) {
      const len = Math.min(speed * 5.5, 240)
      const ux = vx / speed, uy = vy / speed
      const tx = pos.x - ux * len, ty = pos.y - uy * len
      const grd = ctx.createLinearGradient(pos.x, pos.y, tx, ty)
      grd.addColorStop(0, `rgba(255,214,190,${0.6 * heat})`)
      grd.addColorStop(0.35, `rgba(255,70,135,${0.4 * heat})`)
      grd.addColorStop(1, 'rgba(151,7,71,0)')
      const w = 10 * scale
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.moveTo(pos.x - uy * w, pos.y + ux * w)
      ctx.lineTo(tx, ty)
      ctx.lineTo(pos.x + uy * w, pos.y - ux * w)
      ctx.closePath()
      ctx.fill()
    }

    // embers: hot cream -> pink -> crimson as they cool
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.96
      p.vy *= 0.96
      p.life -= p.decay
      if (p.life <= 0) {
        parts.splice(i, 1)
        continue
      }
      const s = p.size * (0.35 + p.life * 0.65)
      ctx.globalAlpha = Math.min(1, p.life * 1.4)
      ctx.drawImage(p.life > 0.7 ? hot : p.life > 0.35 ? pink : crimson, p.x - s, p.y - s, s * 2, s * 2)
    }

    if (visible) {
      // atmospheric-entry glow
      const gs = (20 + heat * 34) * scale
      ctx.globalAlpha = 0.22 + heat * 0.6
      ctx.drawImage(pink, pos.x - gs, pos.y - gs, gs * 2, gs * 2)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    if (visible) {
      const rs = 13 * scale
      ctx.save()
      ctx.translate(pos.x, pos.y)
      ctx.rotate(angle)
      ctx.drawImage(rock, -rs, -rs, rs * 2, rs * 2)
      ctx.restore()
    }
  }
  frame()

  return {
    setHover(on) {
      scaleT = on ? 1.6 : 1
    },
    /** re-enter the top layer so the asteroid stays above an open modal dialog */
    raise() {
      cv.hidePopover()
      cv.showPopover()
    },
  }
}
