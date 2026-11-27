// UFO cursor.
// - Flying: the tilted UFO (with speed lines) follows the mouse, facing the way it travels,
//   and disturbs a faint field of space dust as it passes.
// - Over anything clickable (buttons, links, planets, moons): it parks above the target,
//   levels out, bobs gently and shines a pixel tractor beam down onto it.
const TAU = Math.PI * 2
const PX = 3 // pixel grid for the beam, so it matches the sprites

function makeLayer(cls) {
  const cv = document.createElement('canvas')
  cv.className = `asteroid-layer ${cls}`
  cv.setAttribute('aria-hidden', 'true')
  cv.popover = 'manual'
  document.body.appendChild(cv)
  cv.showPopover()
  return cv
}

function loadImage(src) {
  const img = new Image()
  img.src = src
  return img
}

export function initAsteroidCursor() {
  // dust uses `difference` blending so it reads on both the dark and cream sections
  const dustCv = makeLayer('asteroid-layer--dust')
  const ufoCv = makeLayer('asteroid-layer--rock')
  const dctx = dustCv.getContext('2d')
  const ctx = ufoCv.getContext('2d')

  const SP = 58 // dust spacing in px
  let W = 0, H = 0, span = 0, dust = []
  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    W = window.innerWidth
    H = window.innerHeight
    for (const [cv, c] of [[dustCv, dctx], [ufoCv, ctx]]) {
      cv.width = W * dpr
      cv.height = H * dpr
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
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

  const hoverImg = loadImage('/img/ufo.png') // the one, level saucer — used in every state
  const HOVER_W = 40

  const mouse = { x: W / 2, y: H / 2 }
  const pos = { x: W / 2, y: H / 2 }
  let visible = false, facing = 1, scale = 1, scaleT = 1, heat = 0, t = 0
  let target = null, beam = 0
  const motes = [] // little specks drifting up the beam

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
  window.addEventListener('pointerdown', () => (scale *= 0.85))

  function drawBeam(topX, topY, r, a) {
    // a stepped, pixel-art cone from the saucer down over the target
    const bottomY = r.bottom + 4
    const topW = 16
    const bottomW = Math.min(Math.max(r.width + 16, 40), 220)
    const rows = Math.max(1, Math.floor((bottomY - topY) / PX))
    for (let i = 0; i < rows; i++) {
      const k = i / rows
      const y = Math.round((topY + i * PX) / PX) * PX
      const w = Math.round((topW + (bottomW - topW) * k) / (PX * 2)) * PX * 2
      const flicker = 0.85 + 0.15 * Math.sin(t * 9 + i * 0.7)
      // soft outer beam, brighter core, scanline shimmer
      ctx.globalAlpha = a * 0.16 * flicker
      ctx.fillStyle = '#9fe3ff'
      ctx.fillRect(Math.round(topX - w / 2), y, w, PX)
      ctx.globalAlpha = a * 0.16 * flicker * (i % 3 === 0 ? 0.6 : 1)
      ctx.fillStyle = '#d9f6ff'
      ctx.fillRect(Math.round(topX - w / 4), y, Math.round(w / 2), PX)
    }
    // lit ellipse where the beam lands
    ctx.globalAlpha = a * 0.28
    ctx.fillStyle = '#bff0ff'
    ctx.beginPath()
    ctx.ellipse(topX, bottomY, bottomW / 2, 5, 0, 0, TAU)
    ctx.fill()
    // motes rising up the beam
    if (Math.random() < 0.5 * a) motes.push({ x: topX + (Math.random() - 0.5) * bottomW * 0.8, y: bottomY, life: 1 })
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]
      m.y -= 1.2
      m.x += (topX - m.x) * 0.02 // drawn in toward the saucer
      m.life -= 0.02
      if (m.life <= 0 || m.y < topY) {
        motes.splice(i, 1)
        continue
      }
      ctx.globalAlpha = a * m.life
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(m.x / PX) * PX, Math.round(m.y / PX) * PX, PX, PX)
    }
    ctx.globalAlpha = 1
  }

  function frame() {
    requestAnimationFrame(frame)
    t += 0.016

    // where to fly: the mouse, or parked above the hovered target
    let tx = mouse.x, ty = mouse.y, r = null
    if (target && target.isConnected) {
      r = target.getBoundingClientRect()
      tx = r.left + r.width / 2 + (mouse.x - (r.left + r.width / 2)) * 0.08
      ty = r.top - 30 + Math.sin(t * 3) * 2.5 // hover just above it, bobbing
      // never leave the screen: keep the whole saucer inside the viewport
      const halfW = (HOVER_W * scale) / 2 + 4
      const halfH = (HOVER_W * scale * (hoverImg.naturalHeight || 19)) / (hoverImg.naturalWidth || 40) / 2 + 4
      tx = Math.min(W - halfW, Math.max(halfW, tx))
      ty = Math.min(H - halfH, Math.max(halfH, ty))
    }
    const px = pos.x, py = pos.y
    const follow = r ? 0.2 : 0.35
    pos.x += (tx - pos.x) * follow
    pos.y += (ty - pos.y) * follow
    const vx = pos.x - px, vy = pos.y - py
    const speed = Math.hypot(vx, vy)
    heat += (Math.min(speed / 22, 1) - heat) * 0.1
    if (Math.abs(vx) > 0.8) facing = Math.sign(vx)
    scale += (scaleT - scale) * 0.15
    beam += ((r ? 1 : 0) - beam) * 0.12

    // ---- the space: dust field reacting to the UFO ----
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

    // ---- beam + saucer ----
    ctx.clearRect(0, 0, W, H)
    if (!visible) return
    const hh = (HOVER_W * scale * hoverImg.naturalHeight) / (hoverImg.naturalWidth || 1)
    if (beam > 0.02 && r) drawBeam(pos.x, pos.y + hh * 0.35, r, beam)
    else motes.length = 0

    ctx.imageSmoothingEnabled = true
    const drawSprite = (img, w, alpha, flip) => {
      if (!img.complete || !img.naturalWidth || alpha < 0.02) return
      const h = (w * img.naturalHeight) / img.naturalWidth
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(Math.round(pos.x), Math.round(pos.y))
      if (flip) ctx.scale(-1, 1)
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
      ctx.restore()
    }
    drawSprite(hoverImg, HOVER_W * scale, 1, false)
    // the saucer's lights blink while it hovers
    if (r && hoverImg.complete) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8)
      ctx.fillStyle = '#f6d65a'
      const lw = HOVER_W * scale
      for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(pos.x + i * lw * 0.28 - 1), Math.round(pos.y + hh * 0.02 - 1), 2, 2)
      ctx.globalAlpha = 1
    }
  }
  frame()

  return {
    /** hover over a clickable element (or a virtual {getBoundingClientRect, isConnected}); null releases */
    setSnap(el, hover = !!el) {
      target = el
      scaleT = el ? 1 : hover ? 1.15 : 1
    },
    setHover(on) {
      scaleT = on ? 1.15 : 1
    },
    /** re-enter the top layer so the cursor stays above an open modal dialog */
    raise() {
      for (const cv of [dustCv, ufoCv]) {
        cv.hidePopover()
        cv.showPopover()
      }
    },
  }
}
