import * as THREE from 'three'
import { noiseGLSL, bakeMoonTexture, createMoonMaterial, createGlow } from './moon.js'

export function initHero(canvas, { reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220)
  camera.position.set(0, 0.4, 9)

  const uniforms = { uTime: { value: 0 }, uScroll: { value: 0 }, uMoonX: { value: 2.4 } }

  // ---------- Moon (logo-styled, rising out of the waves) ----------
  const moonGroup = new THREE.Group()
  scene.add(moonGroup)
  const moonMat = createMoonMaterial(bakeMoonTexture(renderer, 0.0), { bump: 0.03 })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.75, 128, 128), moonMat)
  moon.rotation.set(0.25, -0.6, 0.1)
  moonGroup.add(moon)

  const glow = createGlow(undefined, 0.38)
  glow.scale.setScalar(10)
  glow.position.z = -1
  moonGroup.add(glow)

  // thin crimson orbit + satellite
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.0055, 8, 240), new THREE.MeshBasicMaterial({ color: 0xf2d58a, transparent: true, opacity: 0.75 }))
  ring.rotation.set(1.3, 0.2, 0)
  moonGroup.add(ring)
  const satellite = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfcf1d0 }))
  moonGroup.add(satellite)

  // ---------- Particle sea, with moonlight glinting on the crests ----------
  const W = 240, H = 100
  const pos = new Float32Array(W * H * 3)
  let k = 0
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      pos[k++] = (i / (W - 1) - 0.5) * 28
      pos[k++] = 0
      pos[k++] = (j / (H - 1)) * -15 + 4.5
    }
  }
  const seaGeo = new THREE.BufferGeometry()
  seaGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const seaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...uniforms, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPixel; uniform float uMoonX;
      varying float vH; varying float vD; varying float vGlint;
      ${noiseGLSL}
      void main(){
        vec3 p = position;
        float t = uTime * .45;
        float h = sin(p.x * .55 + t * 1.6) * .28 + sin(p.z * .9 - t * 1.2) * .22 + snoise(vec3(p.x * .18, p.z * .25, t * .35)) * .55;
        p.y += h;
        vH = h;
        // moonlight path: brighter crests in a band below the moon, fading with distance
        float band = exp(-pow((p.x - uMoonX) / (1.2 + (4.5 - p.z) * .12), 2.));
        vGlint = band * smoothstep(.05, .6, h);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vD = -mv.z;
        gl_PointSize = uPixel * (2.3 + h * 1.6 + vGlint * 2.) * (9. / vD);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vH; varying float vD; varying float vGlint;
      void main(){
        if (length(gl_PointCoord - .5) > .5) discard;
        vec3 slate = vec3(.2, .32, .62);
        vec3 cream = vec3(.988, .945, .816);
        vec3 col = mix(slate, cream, smoothstep(.1, .8, vH) * .8 + vGlint);
        float fade = smoothstep(23., 6., vD);
        gl_FragColor = vec4(col, clamp(.45 + vH * .7 + vGlint, .18, 1.) * fade);
      }`,
  })
  const sea = new THREE.Points(seaGeo, seaMat)
  scene.add(sea)

  // ---------- Stars ----------
  const starCount = 1400
  const sPos = new Float32Array(starCount * 3)
  const sSeed = new Float32Array(starCount)
  for (let i = 0; i < starCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 60
    sPos[i * 3 + 1] = Math.random() * 22 - 3
    sPos[i * 3 + 2] = -10 - Math.random() * 30
    sSeed[i] = Math.random()
  }
  const sGeo = new THREE.BufferGeometry()
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1))
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...uniforms, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPixel; attribute float aSeed; varying float vA;
      void main(){
        vA = .35 + .65 * (.5 + .5 * sin(uTime * (.6 + aSeed * 2.) + aSeed * 40.));
        gl_PointSize = uPixel * (1. + aSeed * 2.2);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor = vec4(vec3(.996,.957,.91), vA*smoothstep(.5,.0,d)); }`,
  })
  scene.add(new THREE.Points(sGeo, starMat))

  // ---------- Fly-through stars (only visible during the intro zoom) ----------
  const flyCount = 1600
  const fPos = new Float32Array(flyCount * 3)
  for (let i = 0; i < flyCount; i++) {
    fPos[i * 3] = (Math.random() - 0.5) * 30
    fPos[i * 3 + 1] = (Math.random() - 0.5) * 18
    fPos[i * 3 + 2] = 6 + Math.random() * 60
  }
  const fGeo = new THREE.BufferGeometry()
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3))
  const flyMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPixel: { value: renderer.getPixelRatio() }, uIntro: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uPixel; varying float vD;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        vD = -mv.z;
        gl_PointSize = uPixel * clamp(28. / vD, 1., 9.);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uIntro; varying float vD;
      void main(){
        float d = length(gl_PointCoord - .5);
        if (d > .5 || vD < .2) discard;
        gl_FragColor = vec4(vec3(.86, .91, 1.), smoothstep(.5, 0., d) * smoothstep(0., .25, uIntro) * smoothstep(.2, 2.5, vD));
      }`,
  })
  scene.add(new THREE.Points(fGeo, flyMat))
  const intro = { p: reduced ? 0 : 1 } // 1 = far out in the stars, 0 = arrived at the moon

  // ---------- Interaction ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2
  })

  let baseZ = 9
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const m = w < 700
    baseZ = m ? 13 : 9
    camera.position.z = baseZ
    moonGroup.position.set(m ? 0.4 : 2.5, m ? 2.6 : 0.15, 0)
    moonGroup.scale.setScalar(m ? 0.72 : 1)
    sea.position.y = m ? -3.2 : -1.75
    uniforms.uMoonX.value = moonGroup.position.x
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  let visible = true
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas)

  const light = new THREE.Vector3()
  const clock = new THREE.Clock()
  function tick() {
    requestAnimationFrame(tick)
    if (!visible) return
    const dt = clock.getDelta()
    if (!reduced) uniforms.uTime.value += dt
    const t = uniforms.uTime.value
    mouse.x += (mouse.tx - mouse.x) * 0.05
    mouse.y += (mouse.ty - mouse.y) * 0.05
    camera.position.x = mouse.x * 0.5
    camera.position.y = 0.4 - mouse.y * 0.3 + uniforms.uScroll.value * 1.5
    // intro: start ~60 units back in the stars, dolly in and settle on the usual framing
    const ip = intro.p
    camera.position.z = baseZ + ip * ip * 60
    const look = new THREE.Vector3(0, uniforms.uScroll.value * 1.2, 0).lerp(moonGroup.position, Math.min(1, ip * 1.4))
    camera.lookAt(look)
    flyMat.uniforms.uIntro.value = ip
    // the light swings with the cursor so the craters catch it
    light.set(-0.55 - mouse.x * 0.6, 0.45 - mouse.y * 0.5, 0.75).normalize()
    moonMat.uniforms.uLight.value.copy(light)
    moon.rotation.y = -0.6 + t * 0.03
    glow.material.uniforms.uTime.value = t
    ring.rotation.z = t * 0.1
    satellite.position.set(Math.cos(t * 0.6) * 2.65, Math.sin(t * 0.6) * 2.65, 0).applyEuler(ring.rotation)
    renderer.render(scene, camera)
  }
  tick()

  return {
    intro,
    setScroll(p) {
      uniforms.uScroll.value = p
    },
  }
}
