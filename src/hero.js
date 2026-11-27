import * as THREE from 'three'

const noise = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`

export function initHero(canvas, { reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0.4, 9)

  const uniforms = { uTime: { value: 0 }, uScroll: { value: 0 } }

  // ---------- Moon ----------
  const moonGroup = new THREE.Group()
  scene.add(moonGroup)
  const moonMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying vec3 vView;
      void main(){
        vN = normalize(normalMatrix * normal);
        vP = position;
        vec4 mv = modelViewMatrix * vec4(position,1.);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vN; varying vec3 vP; varying vec3 vView;
      ${noise}
      void main(){
        vec3 p = vP * 1.1;
        float n = snoise(p*1.2 + vec3(0., uTime*0.02, 0.))*0.6 + snoise(p*3.2)*0.3 + snoise(p*9.)*0.1;
        vec3 cream = vec3(0.996, 0.957, 0.910);
        vec3 maria = vec3(0.86, 0.80, 0.66);
        vec3 col = mix(cream, maria, smoothstep(0.05, 0.45, n));
        vec3 L = normalize(vec3(-0.6, 0.5, 0.8));
        float diff = clamp(dot(vN, L), 0., 1.);
        col *= 0.35 + 0.75 * diff;
        float fres = pow(1. - max(dot(vN, vView), 0.), 2.5);
        col += vec3(1.0, 0.92, 0.85) * fres * 0.35;
        gl_FragColor = vec4(col, 1.);
      }`,
  })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.55, 96, 96), moonMat)
  moonGroup.add(moon)

  // Glow halo
  const glowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        float d = distance(vUv, vec2(.5));
        float g = smoothstep(.5, .16, d) * (0.42 + 0.05*sin(uTime*0.8));
        gl_FragColor = vec4(vec3(0.996,0.93,0.86)*g, g);
      }`,
  })
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), glowMat)
  glow.position.z = -0.5
  moonGroup.add(glow)

  // Crimson orbit ring
  const ringGeo = new THREE.TorusGeometry(2.45, 0.006, 8, 200)
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x970747, transparent: true, opacity: 0.85 }))
  ring.rotation.set(1.25, 0.15, 0)
  moonGroup.add(ring)
  const satellite = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff3d7f }))
  moonGroup.add(satellite)

  // ---------- Particle sea (the waves from the logo) ----------
  const W = 220, H = 90
  const seaGeo = new THREE.BufferGeometry()
  const pos = new Float32Array(W * H * 3)
  let k = 0
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      pos[k++] = (i / (W - 1) - 0.5) * 26
      pos[k++] = 0
      pos[k++] = (j / (H - 1)) * -14 + 4
    }
  }
  seaGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const seaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...uniforms, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPixel;
      varying float vH; varying float vD;
      ${noise}
      void main(){
        vec3 p = position;
        float t = uTime * 0.45;
        float h = sin(p.x*0.55 + t*1.6)*0.28 + sin(p.z*0.9 - t*1.2)*0.22 + snoise(vec3(p.x*0.18, p.z*0.25, t*0.35))*0.55;
        p.y += h;
        vH = h;
        vec4 mv = modelViewMatrix * vec4(p,1.);
        vD = -mv.z;
        gl_PointSize = uPixel * (2.4 + h*1.6) * (9. / vD);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vH; varying float vD;
      void main(){
        vec2 c = gl_PointCoord - .5;
        if(length(c) > .5) discard;
        vec3 slate = vec3(0.267,0.408,0.471);
        vec3 cream = vec3(0.996,0.957,0.910);
        vec3 col = mix(slate, cream, smoothstep(0.1, 0.8, vH));
        float fade = smoothstep(22., 6., vD);
        gl_FragColor = vec4(col, clamp(0.5 + vH*0.7, 0.2, 1.) * fade);
      }`,
  })
  const sea = new THREE.Points(seaGeo, seaMat)
  sea.position.y = -1.9
  scene.add(sea)

  // ---------- Stars ----------
  const starCount = 1400
  const sGeo = new THREE.BufferGeometry()
  const sPos = new Float32Array(starCount * 3)
  const sSeed = new Float32Array(starCount)
  for (let i = 0; i < starCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 60
    sPos[i * 3 + 1] = Math.random() * 22 - 3
    sPos[i * 3 + 2] = -10 - Math.random() * 30
    sSeed[i] = Math.random()
  }
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1))
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...uniforms, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPixel; attribute float aSeed; varying float vA;
      void main(){
        vA = 0.35 + 0.65 * (0.5 + 0.5*sin(uTime*(0.6+aSeed*2.) + aSeed*40.));
        vec4 mv = modelViewMatrix * vec4(position,1.);
        gl_PointSize = uPixel * (1. + aSeed*2.2);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor = vec4(vec3(0.996,0.957,0.91), vA*smoothstep(.5,.0,d)); }`,
  })
  scene.add(new THREE.Points(sGeo, starMat))

  // ---------- Interaction ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2
  })

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // keep the moon framed on narrow screens
    const m = w < 700
    camera.position.z = m ? 13 : 9
    moonGroup.position.set(m ? 0.4 : 2.6, m ? 3.1 : 0.9, 0)
    moonGroup.scale.setScalar(m ? 0.72 : 1)
    sea.position.y = m ? -3.4 : -1.9
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  let visible = true
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas)

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
    camera.lookAt(0, uniforms.uScroll.value * 1.2, 0)
    moon.rotation.y = t * 0.05
    ring.rotation.z = t * 0.1
    const a = t * 0.6
    const r = 2.45
    const v = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0).applyEuler(ring.rotation)
    satellite.position.copy(v)
    renderer.render(scene, camera)
  }
  tick()

  return {
    setScroll(p) {
      uniforms.uScroll.value = p
    },
  }
}
