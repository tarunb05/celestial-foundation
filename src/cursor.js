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

/**
 * Shatter the sprite into jagged wedge-shaped pieces that fit back together.
 * Each piece keeps its centroid so it can start (and reassemble) exactly in place.
 */
function makeFragments(img, S = 68, n = 7) {
  const c = { x: S / 2 + (Math.random() - 0.5) * 8, y: S / 2 + (Math.random() - 0.5) * 8 }
  const angles = Array.from({ length: n }, (_, i) => (i / n) * TAU + (Math.random() - 0.5) * (TAU / n) * 0.6)
  const far = S * 0.95
  // shared jagged boundaries so neighbouring pieces interlock
  const bounds = angles.map((a) => {
    const dx = Math.cos(a), dy = Math.sin(a)
    const j = (Math.random() - 0.5) * S * 0.14
    return {
      mid: { x: c.x + dx * S * 0.24 - dy * j, y: c.y + dy * S * 0.24 + dx * j },
      far: { x: c.x + dx * far, y: c.y + dy * far },
    }
  })
  return angles.map((a, k) => {
    const b0 = bounds[k], b1 = bounds[(k + 1) % n]
    let a1 = angles[(k + 1) % n]
    if (a1 < a) a1 += TAU
    const am = (a + a1) / 2
    const cv = document.createElement('canvas')
    cv.width = cv.height = S
    const g = cv.getContext('2d')
    g.beginPath()
    g.moveTo(c.x, c.y)
    g.lineTo(b0.mid.x, b0.mid.y)
    g.lineTo(b0.far.x, b0.far.y)
    g.lineTo(c.x + Math.cos(am) * far * 1.3, c.y + Math.sin(am) * far * 1.3)
    g.lineTo(b1.far.x, b1.far.y)
    g.lineTo(b1.mid.x, b1.mid.y)
    g.closePath()
    g.clip()
    g.drawImage(img, 0, 0, S, S)
    // rough centroid of the visible part of the wedge
    const cx = c.x + Math.cos(am) * S * 0.24
    const cy = c.y + Math.sin(am) * S * 0.24
    return { cv, cx, cy, S }
  })
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
  const ROCK_PX = 34 // drawn size of the whole asteroid
  let pieces = []
  rock.onload = () => {
    pieces = makeFragments(rock).map((p) => ({ ...p, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, theta: 0, omega: 0, k: 1, inc: 0.5, phi: 0, z: 0, g: 1 }))
  }
  // crash state: 'whole' → 'orbit' (shattered around a button) → 'gather' (reassembling) → 'whole'
  let mode = 'whole', gatherT = 0
  const rings = [] // impact shockwaves
  const glow = glowSprite([255, 120, 165])
  const spark = glowSprite([255, 226, 200])

  const mouse = { x: W / 2, y: H / 2 }
  const pos = { x: W / 2, y: H / 2 }
  let visible = false, angle = 0, spinDir = 1, scale = 1, scaleT = 1, heat = 0, t = 0, snapEl = null
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

  // the asteroid hits the button: shatter at the point of contact, pieces burst outward
  // and then settle into tilted orbits around it
  function crash(el, fromWhole) {
    const r = el.getBoundingClientRect()
    const ix = Math.max(r.left, Math.min(r.right, pos.x))
    const iy = Math.max(r.top, Math.min(r.bottom, pos.y))
    const ds = ROCK_PX / pieces[0].S
    const dir = Math.random() < 0.5 ? 1 : -1
    if (fromWhole) rings.push({ x: ix, y: iy, life: 1 })
    pieces.forEach((p, i) => {
      if (fromWhole) {
        p.x = pos.x + (p.cx - p.S / 2) * ds
        p.y = pos.y + (p.cy - p.S / 2) * ds
        p.rot = 0
      }
      const ox = p.x - ix, oy = p.y - iy
      const d = Math.hypot(ox, oy) || 1
      const burst = 4 + Math.random() * 4
      p.vx = (ox / d) * burst + (Math.random() - 0.5) * 2
      p.vy = (oy / d) * burst + (Math.random() - 0.5) * 2
      p.vr = (Math.random() - 0.5) * 0.35
      // start each piece's orbit near where it flew off, so the burst flows into the ring
      p.theta = Math.atan2(p.y - (r.top + r.height / 2), p.x - (r.left + r.width / 2)) + i * 0.15
      p.omega = (0.022 + Math.random() * 0.018) * (i % 4 === 3 ? -dir : dir)
      p.k = 0.92 + Math.random() * 0.3
      p.inc = 0.35 + Math.random() * 0.4
      p.phi = (Math.random() - 0.5) * 0.7
    })
    if (fromWhole)
      for (let i = 0; i < 10; i++) sparks.push({ x: ix, y: iy, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, life: 1 })
    mode = 'orbit'
  }

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
    if (visible && mode === 'whole') {
      const gs = (16 + heat * 20) * scale
      rctx.globalAlpha = 0.12 + heat * 0.35
      rctx.drawImage(glow, pos.x - gs, pos.y - gs, gs * 2, gs * 2)
    }
    // impact shockwaves
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i]
      g.life -= 0.045
      if (g.life <= 0) {
        rings.splice(i, 1)
        continue
      }
      rctx.globalAlpha = g.life * 0.8
      rctx.strokeStyle = 'rgb(255,190,215)'
      rctx.lineWidth = 2 * g.life
      rctx.beginPath()
      rctx.arc(g.x, g.y, (1 - g.life) * 46 + 4, 0, TAU)
      rctx.stroke()
    }
    rctx.globalAlpha = 1
    rctx.globalCompositeOperation = 'source-over'

    // ---- shattered pieces: orbiting the button in 3D, or flying back together ----
    if (mode !== 'whole' && pieces.length) {
      const ds = ROCK_PX / pieces[0].S
      let r = null
      if (mode === 'orbit' && snapEl && snapEl.isConnected) r = snapEl.getBoundingClientRect()
      const cx = r ? r.left + r.width / 2 : 0, cy = r ? r.top + r.height / 2 : 0
      let gathered = 0
      for (const p of pieces) {
        let tx, ty
        if (r) {
          // a tilted ring around the button: x on an ellipse, y squashed by the inclination,
          // z (depth) tells us whether the piece is in front of or behind the button
          p.theta += p.omega
          const rx = (r.width / 2 + 18) * p.k
          const ry = (r.height / 2 + 26) * p.k
          const ex = Math.cos(p.theta) * rx
          const ey = Math.sin(p.theta) * ry * p.inc
          p.z = Math.sin(p.theta)
          tx = cx + ex * Math.cos(p.phi) - ey * Math.sin(p.phi)
          ty = cy + ex * Math.sin(p.phi) + ey * Math.cos(p.phi)
          p.vx = (p.vx + (tx - p.x) * 0.035) * 0.84
          p.vy = (p.vy + (ty - p.y) * 0.035) * 0.84
          p.vr *= 0.99
        } else {
          // reassemble at the cursor, each piece back in its slot
          tx = pos.x + (p.cx - p.S / 2) * ds
          ty = pos.y + (p.cy - p.S / 2) * ds
          p.vx = (p.vx + (tx - p.x) * 0.12) * 0.7
          p.vy = (p.vy + (ty - p.y) * 0.12) * 0.7
          p.rot += (Math.round(p.rot / TAU) * TAU - p.rot) * 0.2
          p.vr *= 0.6
          p.z += (1 - p.z) * 0.2
          p.g += (1 - p.g) * 0.25
          if (Math.hypot(tx - p.x, ty - p.y) < 1.5) gathered++
        }
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
      }
      if (mode === 'gather' && (gathered === pieces.length || performance.now() - gatherT > 650)) mode = 'whole'
      if (mode !== 'whole') {
        // paint back-to-front; pieces behind the button are smaller, dimmer and hidden where it covers them
        const order = [...pieces].sort((a, b) => a.z - b.z)
        for (const p of order) {
          const depth = (p.z + 1) / 2
          p.g += ((r ? 1.55 : 1) - p.g) * 0.12 // pieces grow while orbiting, shrink back to fit when reassembling
          const s = r ? (0.72 + depth * 0.42) * p.g : p.g
          let a = 0.45 + depth * 0.55
          if (r && p.z < 0 && p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom) a *= 0.12
          rctx.globalAlpha = a
          rctx.save()
          rctx.translate(p.x, p.y)
          rctx.rotate(p.rot)
          rctx.scale(s, s)
          rctx.drawImage(p.cv, -p.cx * ds, -p.cy * ds, p.S * ds, p.S * ds)
          rctx.restore()
        }
        rctx.globalAlpha = 1
      }
    }

    if (mode === 'whole' && visible && rock.complete && rock.naturalWidth) {
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
    /** snap onto a small interactive element (or pass null to release); `hover` just enlarges */
    setSnap(el, hover = !!el) {
      if (el === snapEl) return
      const prev = snapEl
      snapEl = el
      scaleT = el ? 1 : hover ? 1.6 : 1
      if (el && pieces.length) {
        if (mode === 'whole' || mode === 'gather') crash(el, !prev && mode === 'whole')
        // already shattered on another button: the pieces simply fly over to the new one
      } else if (!el && mode === 'orbit') {
        mode = 'gather'
        gatherT = performance.now()
      }
    },
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
