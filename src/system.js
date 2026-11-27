import * as THREE from 'three'
import gsap from 'gsap'
import { noiseGLSL, bakeMoonTexture, createMoonMaterial, createGlow } from './moon.js'

/**
 * Solar system of projects: the Celestial moon at the centre, one planet per project.
 * Hover slows the system down, click flies the camera to the planet.
 */
/** 1-based number of a main planet (moons are not counted) */
export function planetNumber(projects, i) {
  return projects.slice(0, i + 1).filter((p) => p.moonOf == null).length
}

export function initSystem(canvas, projects, { labelsEl, centerLabel, reduced, onHover, onFocus }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)

  const shared = { uTime: { value: 0 }, uLightPos: { value: new THREE.Vector3() } }

  // ---------- Centre: the Celestial moon ----------
  const moonMat = createMoonMaterial(bakeMoonTexture(renderer, 2.3), { full: 1, bump: 0.05 })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), moonMat)
  scene.add(moon)
  const halo = createGlow(new THREE.Color(1, 0.9, 0.85), 0.55)
  scene.add(halo)

  // ---------- Stars ----------
  {
    const n = 1800
    const p = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40)
      p.set([v.x, v.y, v.z], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfef4e8, size: 0.16, transparent: true, opacity: 0.75, sizeAttenuation: true, depthWrite: false })))
  }

  // ---------- Planets ----------
  const planetVert = /* glsl */ `
    varying vec3 vObj; varying vec3 vN; varying vec3 vViewPos;
    void main(){
      vObj = position;
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.);
      vViewPos = mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`
  const planetFrag = /* glsl */ `
    uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uBands; uniform float uSeed;
    uniform float uHover; uniform float uTime; uniform vec3 uLightPos;
    varying vec3 vObj; varying vec3 vN; varying vec3 vViewPos;
    ${noiseGLSL}
    void main(){
      vec3 p = normalize(vObj);
      float t;
      if (uBands > .5) {
        float warp = fbm(p * 2.2 + uSeed + vec3(0., 0., uTime * .02));
        t = .5 + .5 * sin(p.y * 11. + warp * 3.5 + uSeed);
      } else {
        t = smoothstep(-.05, .2, fbm(p * 2.6 + uSeed * 1.7));
      }
      vec3 col = mix(uA, uB, t);
      col = mix(col, uC, smoothstep(.45, .85, fbm(p * 5.5 - uSeed)) * .45);
      vec3 N = normalize(vN);
      vec3 L = normalize(uLightPos - vViewPos);
      vec3 V = normalize(-vViewPos);
      float diff = smoothstep(-.45, 1., dot(N, L));
      float fres = pow(1. - max(dot(N, V), 0.), 2.4);
      vec3 c = col * (.3 + .8 * diff) + uB * fres * (.35 + uHover * .9) * (.35 + .65 * diff);
      gl_FragColor = vec4(c, 1.);
    }`

  const ringFrag = /* glsl */ `
    uniform vec3 uA; uniform vec3 uB; varying vec2 vUv;
    void main(){
      float r = length(vUv - .5) * 2.;
      if (r < .62 || r > 1.) discard;
      float bands = .55 + .45 * sin(r * 70.) * sin(r * 23.);
      float a = smoothstep(.62, .68, r) * smoothstep(1., .93, r) * bands * .75;
      gl_FragColor = vec4(mix(uA, uB, bands), a);
    }`

  const planets = projects.map((p, i) => {
    const look = p.planet
    const uniforms = {
      ...shared,
      uA: { value: new THREE.Color(look.a) },
      uB: { value: new THREE.Color(look.b) },
      uC: { value: new THREE.Color(look.c) },
      uBands: { value: look.bands },
      uSeed: { value: i * 3.17 + 1.3 },
      uHover: { value: 0 },
    }
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(look.size, 64, 64), new THREE.ShaderMaterial({ uniforms, vertexShader: planetVert, fragmentShader: planetFrag }))
    mesh.rotation.z = 0.2 + Math.random() * 0.3
    scene.add(mesh)

    if (look.ring) {
      const ring = new THREE.Mesh(
        new THREE.PlaneGeometry(look.size * 4.4, look.size * 4.4),
        new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          uniforms: { uA: { value: new THREE.Color(look.b) }, uB: { value: new THREE.Color(look.c) } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
          fragmentShader: ringFrag,
        })
      )
      ring.rotation.x = -Math.PI / 2 + 0.35
      mesh.add(ring)
    }

    const isMoon = p.moonOf != null

    // generous invisible hit target so small planets (and tiny moons) are easy to click
    const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(look.size * (isMoon ? 2.6 : 1.8), isMoon ? 0.42 : 0.75), 12, 12), new THREE.MeshBasicMaterial({ visible: false }))
    hit.userData.index = i
    scene.add(hit)

    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(Array.from({ length: 256 }, (_, k) => new THREE.Vector3(Math.cos((k / 256) * Math.PI * 2), 0, Math.sin((k / 256) * Math.PI * 2)))),
      new THREE.LineBasicMaterial({ color: 0x4a64a8, transparent: true, opacity: isMoon ? 0.22 : 0.28 })
    )
    scene.add(orbit)

    const label = document.createElement('button')
    label.className = `planet-label${isMoon ? ' planet-label--moon' : ''}`
    label.type = 'button'
    label.innerHTML = `<span class="planet-label__num">${isMoon ? '☾' : String(planetNumber(projects, i)).padStart(2, '0')}</span><span class="planet-label__name">${p.title}</span>`
    label.setAttribute('aria-label', `Explore ${p.title}`)
    labelsEl.appendChild(label)

    return {
      mesh, hit, orbit, label, uniforms,
      size: look.size,
      parent: isMoon ? p.moonOf : null,
      phase: (i / projects.length) * Math.PI * 2 + i * 0.7,
      radius: 0,
      speed: 0,
      incline: isMoon ? 0.35 + ((i * 0.37) % 0.5) : 0, // moons orbit on tilted planes
      pos: new THREE.Vector3(),
    }
  })
  // moons: radius and speed relative to their planet
  planets.forEach((pl) => {
    if (pl.parent == null) return
    const siblings = planets.filter((q) => q.parent === pl.parent)
    const j = siblings.indexOf(pl)
    pl.moonBase = planets[pl.parent].size * 1.9 + j * 0.34
    pl.radius = pl.moonBase
    pl.speed = 0.9
    pl.phase = (j / siblings.length) * Math.PI * 2 // moons of the same planet evenly spaced too
    pl.orbit.rotation.x = -pl.incline // matches the tilted plane used for the moon's position
  })

  // ---------- Layout ----------
  const home = { pos: new THREE.Vector3(), target: new THREE.Vector3() }
  const cam = { pos: new THREE.Vector3(), target: new THREE.Vector3(), ox: 0, oy: 0 }
  let mobile = false, W = 1, H = 1, K = 1 // K: body size factor for crowded layouts

  function layout() {
    W = canvas.clientWidth
    H = canvas.clientHeight
    renderer.setSize(W, H, false)
    camera.aspect = W / H
    mobile = W / H < 0.9
    camera.fov = mobile ? 50 : 40
    const base = mobile ? 1.75 : 2.7
    const outer = mobile ? 5.6 : 8.4 // outermost orbit, however many planets there are
    const main = planets.filter((pl) => pl.parent == null)
    const gap = main.length > 1 ? Math.min(mobile ? 0.66 : 0.92, (outer - base) / (main.length - 1)) : 0
    const moonR = mobile ? 1.15 : 1.45
    moon.scale.setScalar(moonR)
    halo.scale.setScalar(moonR * 6)
    // evenly spaced: every planet gets its own equal slice of the circle, and neighbouring orbits are
    // spread far apart (stepping through the slices by a number coprime to the count). They all turn
    // at the same angular speed, so the spacing never bunches up.
    const n = main.length
    const gcd = (a, b) => (b ? gcd(b, a % b) : a)
    let step = Math.max(1, Math.round(n * 0.45))
    while (n > 1 && gcd(step, n) !== 1) step++
    main.forEach((pl, k) => {
      pl.radius = base + k * gap
      pl.speed = 0.16
      pl.phase = (((k * step) % n) / n) * Math.PI * 2
      pl.orbit.scale.setScalar(pl.radius)
    })
    // with many planets on a small screen, shrink the bodies so neighbouring orbits don't collide
    K = mobile ? 0.72 : main.length > 7 ? 0.9 : 1
    planets.forEach((pl) => {
      pl.hit.scale.setScalar(K)
      if (pl.parent == null) return
      pl.radius = pl.moonBase * K
      pl.orbit.scale.setScalar(pl.radius)
    })
    if (mobile) home.pos.set(0, 22, 9.5) // steeper, more top-down view uses the tall screen
    else home.pos.set(0, 10, 18.6).multiplyScalar(THREE.MathUtils.clamp(1.6 / camera.aspect, 1, 1.5)) // pull back on narrower screens
    if (!focused) {
      cam.pos.copy(home.pos)
      cam.target.copy(home.target)
    }
    camera.updateProjectionMatrix()
  }

  // ---------- Interaction ----------
  let hovered = -1, focused = null, timeScale = 1, timeTarget = 1, simT = 0
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2(9, 9)
  const mouse = { x: 0, y: 0 }

  const pick = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect()
    const v = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    return pickRay(v)
  }
  // of all planets whose hit area the ray crosses, choose the one whose centre is closest to the ray
  function pickRay(v) {
    ray.setFromCamera(v, camera)
    const hits = ray.intersectObjects(planets.map((p) => p.hit))
    let best = -1, bestD = Infinity
    for (const h of hits) {
      const i = h.object.userData.index
      const d = ray.ray.distanceToPoint(planets[i].pos) / planets[i].size
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    mouse.x = ndc.x
    mouse.y = ndc.y
  })
  canvas.addEventListener('pointerleave', () => ndc.set(9, 9))
  canvas.addEventListener('click', (e) => {
    const i = pick(e.clientX, e.clientY)
    if (i >= 0) api.focus(i)
    else if (focused !== null) api.blur()
  })
  planets.forEach((pl, i) => {
    pl.label.addEventListener('click', () => api.focus(i))
    pl.label.addEventListener('pointerenter', () => setHover(i))
    pl.label.addEventListener('pointerleave', () => setHover(-1))
  })

  function setHover(i) {
    if (i === hovered) return
    hovered = i
    planets.forEach((pl, k) => pl.label.classList.toggle('is-hover', k === i))
    canvas.style.cursor = i >= 0 ? 'pointer' : ''
    onHover?.(i)
  }

  const tmp = new THREE.Vector3()
  const projV = new THREE.Vector3()
  const api = {
    /** on-screen box of a planet/moon (client coords), so the cursor can crash into it like a button */
    screenRect(i) {
      const pl = planets[i]
      const cr = canvas.getBoundingClientRect()
      projV.copy(pl.pos).project(camera)
      const x = cr.left + (projV.x * 0.5 + 0.5) * W
      const y = cr.top + (-projV.y * 0.5 + 0.5) * H
      const dist = camera.position.distanceTo(pl.pos)
      const r = Math.max(10, ((pl.size * pl.mesh.scale.x) / dist) * (H / 2) / halfTan())
      return { left: x - r, top: y - r, right: x + r, bottom: y + r, width: r * 2, height: r * 2 }
    },
    focus(i) {
      if (focused === i) return
      focused = i
      timeTarget = 0
      timeScale = 0
      setHover(-1)
      const pl = planets[i]
      // park between the moon and the planet (a little ahead of it in its orbit, slightly above):
      // we see its moonlit face against open space, with the bright moon out of frame
      const out = pl.pos.clone().setY(0).normalize()
      const tangent = new THREE.Vector3(-out.z, 0, out.x)
      tmp.copy(out).multiplyScalar(-0.72).addScaledVector(tangent, 0.6).add(new THREE.Vector3(0, 0.36, 0)).normalize()
      const d = pl.size * K * (mobile ? 6.2 : 5.2)
      const end = pl.pos.clone().addScaledVector(tmp, d)
      const dur = reduced ? 0 : 1.6
      gsap.to(cam.pos, { x: end.x, y: end.y, z: end.z, duration: dur, ease: 'expo.inOut' })
      gsap.to(cam.target, { x: pl.pos.x, y: pl.pos.y, z: pl.pos.z, duration: dur, ease: 'expo.inOut' })
      // shift the planet clear of the detail panel: right-side panel on desktop, bottom sheet below 900px
      const sheet = W < 900
      gsap.to(cam, { ox: sheet ? 0 : 0.2, oy: sheet ? 0.27 : 0, duration: dur, ease: 'expo.inOut' })
      labelsEl.classList.add('is-hidden')
      centerLabel.classList.add('is-hidden')
      onFocus?.(i)
    },
    blur() {
      if (focused === null) return
      focused = null
      const dur = reduced ? 0 : 1.4
      gsap.to(cam.pos, { x: home.pos.x, y: home.pos.y, z: home.pos.z, duration: dur, ease: 'expo.inOut' })
      gsap.to(cam.target, { x: home.target.x, y: home.target.y, z: home.target.z, duration: dur, ease: 'expo.inOut' })
      gsap.to(cam, {
        ox: 0,
        oy: 0,
        duration: dur,
        ease: 'expo.inOut',
        onComplete: () => {
          timeTarget = 1
          labelsEl.classList.remove('is-hidden')
          centerLabel.classList.remove('is-hidden')
        },
      })
      onFocus?.(null)
    },
    get focused() {
      return focused
    },
  }

  layout()
  window.addEventListener('resize', layout)

  let visible = false
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas)

  const v = new THREE.Vector3()
  const moonWorld = new THREE.Vector3()
  const clock = new THREE.Clock()
  const halfTan = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))

  function tick() {
    requestAnimationFrame(tick)
    if (!visible) return
    const dt = Math.min(clock.getDelta(), 0.05)
    const target = hovered >= 0 && focused === null ? 0.12 : timeTarget
    timeScale += (target - timeScale) * 0.06
    if (!reduced) {
      simT += dt * timeScale
      shared.uTime.value += dt
    }

    // camera (gentle parallax while browsing)
    const par = focused === null && !reduced ? 1 : 0
    camera.position.set(cam.pos.x + mouse.x * 0.8 * par, cam.pos.y + mouse.y * 0.5 * par, cam.pos.z)
    camera.lookAt(cam.target)
    if (cam.ox || cam.oy) camera.setViewOffset(W, H, W * cam.ox, H * cam.oy, W, H)
    else camera.clearViewOffset()
    camera.updateMatrixWorld()

    shared.uLightPos.value.set(0, 0, 0).applyMatrix4(camera.matrixWorldInverse)
    moon.rotation.y += dt * 0.04
    halo.quaternion.copy(camera.quaternion)
    halo.material.uniforms.uTime.value = shared.uTime.value

    // hover from the canvas
    if (focused === null && ndc.x < 5) {
      const hi = pickRay(ndc)
      if (!planets.some((p) => p.label.matches(':hover'))) setHover(hi)
    }

    // moon screen footprint for occlusion + centre label
    moonWorld.set(0, 0, 0).project(camera)
    const moonDist = camera.position.length()
    const moonPx = ((moon.scale.x / moonDist) * (H / 2)) / halfTan()
    const mx = (moonWorld.x * 0.5 + 0.5) * W
    const my = (-moonWorld.y * 0.5 + 0.5) * H
    centerLabel.style.transform = `translate3d(${mx}px, ${my + moonPx + 18}px, 0) translateX(-50%)`

    // positions: planets around the Celestial moon first, then moons around their planet (on tilted planes)
    for (const pl of planets) {
      if (pl.parent != null) continue
      const a = pl.phase + simT * pl.speed
      pl.pos.set(Math.cos(a) * pl.radius, 0, Math.sin(a) * pl.radius)
    }
    for (const pl of planets) {
      if (pl.parent == null) continue
      const host = planets[pl.parent]
      const a = pl.phase + simT * pl.speed
      const ci = Math.cos(pl.incline), si = Math.sin(pl.incline)
      const lx = Math.cos(a) * pl.radius, lz = Math.sin(a) * pl.radius
      pl.pos.set(host.pos.x + lx, host.pos.y + lz * si, host.pos.z + lz * ci)
      pl.orbit.position.copy(host.pos)
    }

    planets.forEach((pl, i) => {
      pl.mesh.position.copy(pl.pos)
      pl.hit.position.copy(pl.pos)
      pl.mesh.rotation.y += dt * (0.15 + i * 0.03)
      const on = i === hovered || i === focused ? 1 : 0
      pl.uniforms.uHover.value += (on - pl.uniforms.uHover.value) * 0.1
      const s = 1 + pl.uniforms.uHover.value * (focused === null ? 0.25 : 0)
      pl.mesh.scale.setScalar(s * K)
      pl.orbit.material.opacity += ((i === hovered ? 0.9 : 0.28) - pl.orbit.material.opacity) * 0.1
      pl.orbit.material.color.set(i === hovered ? 0xf2d58a : 0x4a64a8)

      // label below the planet
      v.copy(pl.pos).project(camera)
      const dist = camera.position.distanceTo(pl.pos)
      const rPx = ((pl.size * s * K) / dist) * (H / 2) / halfTan()
      const x = (v.x * 0.5 + 0.5) * W
      const y = (-v.y * 0.5 + 0.5) * H
      const behindMoon = dist > moonDist && Math.hypot(x - mx, y - my) < moonPx
      pl.label.style.transform = `translate3d(${x}px, ${y + rPx + 10}px, 0) translateX(-50%)`
      pl.label.classList.toggle('is-occluded', behindMoon || v.z > 1)
    })

    renderer.render(scene, camera)
  }
  tick()

  return api
}
