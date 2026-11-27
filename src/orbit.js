import * as THREE from 'three'

export function initOrbit(canvas, projects, { manager, onActive, onHover, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)

  const N = projects.length
  const STEP = (Math.PI * 2) / N
  const R = 4.2
  const PW = 1.9, PH = PW * 16 / 9 * 0.82

  const loader = new THREE.TextureLoader(manager)
  const group = new THREE.Group()
  group.rotation.x = 0.03
  scene.add(group)

  const shared = { uTime: { value: 0 }, uVel: { value: 0 } }
  const meshes = projects.map((p, i) => {
    const tex = loader.load(p.img, (t) => {
      mat.uniforms.uImgAspect.value = t.image.width / t.image.height
    })
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        ...shared,
        uTex: { value: tex },
        uImgAspect: { value: 9 / 16 },
        uPlaneAspect: { value: PW / PH },
        uActive: { value: 0 },
        uHover: { value: 0 },
      },
      vertexShader: /* glsl */ `
        uniform float uVel; uniform float uTime; uniform float uActive;
        varying vec2 vUv;
        void main(){
          vUv = uv;
          vec3 p = position;
          p.z -= p.x * p.x * 0.12;                         // cylindrical curve
          p.z += sin(p.y * 2.2 + uTime * 2.) * uVel * 0.18; // ripple with motion
          p *= 1. + uActive * 0.06;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; uniform float uImgAspect; uniform float uPlaneAspect;
        uniform float uActive; uniform float uHover; uniform float uVel;
        varying vec2 vUv;
        float roundBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
        void main(){
          // cover-fit
          vec2 uv = vUv - .5;
          if (uImgAspect > uPlaneAspect) uv.x *= uPlaneAspect / uImgAspect; else uv.y *= uImgAspect / uPlaneAspect;
          uv *= 1. - uHover * 0.06;
          uv += .5;
          float shift = uVel * 0.02;
          vec3 col = vec3(
            texture2D(uTex, uv + vec2(shift, 0.)).r,
            texture2D(uTex, uv).g,
            texture2D(uTex, uv - vec2(shift, 0.)).b);
          // brand duotone for inactive cards: deep teal -> cream
          float l = dot(col, vec3(.299,.587,.114));
          vec3 duo = mix(vec3(0.075,0.267,0.353), vec3(0.996,0.957,0.91), smoothstep(.05,.95,l));
          col = mix(duo, col, uActive);
          // corners
          float d = roundBox((vUv - .5) * vec2(uPlaneAspect, 1.), vec2(uPlaneAspect, 1.) * .5, .05);
          float a = 1. - smoothstep(0., .004, d);
          // crimson inner frame on active
          float frame = smoothstep(-.012, -.006, d) * uActive;
          col = mix(col, vec3(0.592,0.027,0.278), frame);
          gl_FragColor = vec4(col, a * (0.55 + 0.45 * uActive));
        }`,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH, 32, 32), mat)
    const a = i * STEP
    mesh.position.set(Math.sin(a) * R, 0, Math.cos(a) * R)
    mesh.rotation.y = a
    mesh.userData.index = i
    group.add(mesh)
    return mesh
  })

  // faint orbit line
  const orbitPts = []
  for (let i = 0; i <= 200; i++) {
    const a = (i / 200) * Math.PI * 2
    orbitPts.push(new THREE.Vector3(Math.sin(a) * R, -PH / 2 - 0.25, Math.cos(a) * R))
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPts), new THREE.LineBasicMaterial({ color: 0x446878, transparent: true, opacity: 0.7 })))

  // dust
  const dustGeo = new THREE.BufferGeometry()
  const dp = new Float32Array(600 * 3)
  for (let i = 0; i < 600; i++) {
    const a = Math.random() * Math.PI * 2, r = R + (Math.random() - 0.5) * 3
    dp.set([Math.sin(a) * r, (Math.random() - 0.5) * 6, Math.cos(a) * r], i * 3)
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3))
  group.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xfef4e8, size: 0.02, transparent: true, opacity: 0.6 })))

  let target = 0, current = 0, active = -1, hovered = -1
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2(9, 9)

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  })
  canvas.addEventListener('pointerleave', () => ndc.set(9, 9))
  canvas.addEventListener('click', () => {
    if (hovered >= 0) {
      if (hovered === active) window.open(projects[hovered].link, '_blank', 'noopener')
      else orbit.onSelect?.(hovered)
    }
  })

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const mobile = w < 900
    // frame the front card: centre-right on desktop, upper half on mobile
    const dist = mobile ? 12.5 : 8.4
    group.position.x = mobile ? 0 : 0.6
    group.position.y = mobile ? 0.8 : -0.1
    camera.position.set(mobile ? 0 : -0.7, 0.45, R + dist)
    camera.lookAt(mobile ? 0 : -0.7, 0, R)
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  let visible = false
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas)

  const clock = new THREE.Clock()
  function tick() {
    requestAnimationFrame(tick)
    if (!visible) return
    const dt = Math.min(clock.getDelta(), 0.05)
    shared.uTime.value += reduced ? 0 : dt
    const prev = current
    current += (target - current) * (reduced ? 1 : 0.08)
    const vel = current - prev
    shared.uVel.value += (Math.max(-1, Math.min(1, vel * 6)) - shared.uVel.value) * 0.15
    group.rotation.y = -current * STEP

    const idx = ((Math.round(current) % N) + N) % N
    if (idx !== active) {
      active = idx
      onActive(idx)
    }

    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(meshes)[0]
    const h = hit ? hit.object.userData.index : -1
    if (h !== hovered) {
      hovered = h
      canvas.style.cursor = h >= 0 ? 'pointer' : ''
      onHover(h, h === active)
    }

    meshes.forEach((m, i) => {
      const u = m.material.uniforms
      u.uActive.value += ((i === active ? 1 : 0) - u.uActive.value) * 0.08
      u.uHover.value += ((i === hovered ? 1 : 0) - u.uHover.value) * 0.1
    })
    renderer.render(scene, camera)
  }
  tick()

  const orbit = {
    /** position in "card units" (0 .. N-1) */
    set(v) {
      target = v
    },
    onSelect: null,
  }
  return orbit
}
