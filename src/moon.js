import * as THREE from 'three'

export const noiseGLSL = /* glsl */ `
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
  float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*snoise(p); p*=2.03; a*=.5; } return s; }
`

/**
 * Bake an equirectangular moon map once (rgb = albedo, a = height), styled after the
 * foundation's logo: cream disc, flat beige "maria" blobs, soft craters, faint brush strokes.
 */
export function bakeMoonTexture(renderer, seed = 0) {
  const rt = new THREE.WebGLRenderTarget(2048, 1024, { depthBuffer: false })
  rt.texture.wrapS = THREE.RepeatWrapping
  rt.texture.colorSpace = THREE.NoColorSpace
  const mat = new THREE.ShaderMaterial({
    blending: THREE.NoBlending,
    uniforms: { uSeed: { value: seed } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uSeed; varying vec2 vUv;
      ${noiseGLSL}
      vec3 hash3(vec3 p){
        p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
        return fract(sin(p)*43758.5453);
      }
      float craters(vec3 p){
        vec3 i = floor(p), f = fract(p); float h = 0.;
        for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){
          vec3 g = vec3(float(x),float(y),float(z));
          vec3 o = hash3(i + g);
          if (o.z > 0.45) continue;
          vec3 r = g + o - f;
          float rad = 0.18 + 0.22 * o.x;
          float q = length(r) / rad;
          float bowl = 1. - smoothstep(0., 1., q);
          float rim = exp(-pow((q - 1.) * 4., 2.));
          h += -bowl * bowl * 0.7 + rim * 0.35;
        }
        return h;
      }
      void main(){
        float lon = (vUv.x - .5) * 6.2831853;
        float lat = (vUv.y - .5) * 3.1415927;
        vec3 p = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon)) + uSeed;
        vec3 w = p * 1.4 + vec3(snoise(p * 1.1), snoise(p * 1.1 + 4.1), snoise(p * 1.1 + 8.7)) * .45;
        float m = snoise(w) * .62 + snoise(w * 2.1) * .28 + snoise(w * 4.3) * .1;   // few octaves = rounded blobs
        float maria = smoothstep(.05, .11, m);                    // crisp, flat blobs like the logo
        float c = craters(p * 4.) + craters(p * 8.5 + 3.) * .45;
        float grain = snoise(p * 26.) * .3;
        vec3 cream = vec3(.996, .962, .87);
        vec3 beige = vec3(.9, .845, .675);
        vec3 col = mix(cream, beige, maria);
        col *= .965 + .035 * smoothstep(-.4, .3, c);
        col *= .97 + .03 * grain;
        // faint horizontal brush strokes from the logo illustration
        float stroke = smoothstep(.93, 1., sin(p.y * 150. + snoise(p * 2.5) * 5.)) * smoothstep(.1, .6, snoise(vec3(p.y * 22., p.x * 1.5, p.z * 1.5)));
        col = mix(col, col * .955, stroke);
        float h = .55 - maria * .1 + c * .14 + grain * .04;
        gl_FragColor = vec4(col, clamp(h, 0., 1.));
      }`,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  const scene = new THREE.Scene()
  scene.add(quad)
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const prev = renderer.getRenderTarget()
  renderer.setRenderTarget(rt)
  renderer.render(scene, cam)
  renderer.setRenderTarget(prev)
  mat.dispose()
  quad.geometry.dispose()
  return rt.texture
}

/** Moon surface. uFull = 1 renders it fully lit (the "sun" of the solar system). */
export function createMoonMaterial(map, { full = 0, bump = 0.035 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uLight: { value: new THREE.Vector3(-0.6, 0.5, 0.8).normalize() },
      uFull: { value: full },
      uBump: { value: bump },
    },
    vertexShader: /* glsl */ `
      varying vec3 vObj; varying vec3 vN; varying vec3 vViewPos;
      void main(){
        vObj = position;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uLight; uniform float uFull; uniform float uBump;
      varying vec3 vObj; varying vec3 vN; varying vec3 vViewPos;
      void main(){
        vec3 p = normalize(vObj);
        vec2 uv = vec2(atan(p.z, p.x) / 6.2831853 + .5, asin(clamp(p.y, -1., 1.)) / 3.1415927 + .5);
        vec4 tex = texture2D(uMap, uv);
        // bump from baked height (screen-space derivatives)
        vec3 n = normalize(vN);
        vec3 dpx = dFdx(vViewPos), dpy = dFdy(vViewPos);
        float dhx = dFdx(tex.a) * uBump, dhy = dFdy(tex.a) * uBump;
        vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
        float det = dot(dpx, r1);
        vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
        vec3 bn = normalize(abs(det) * n - grad);
        vec3 V = normalize(-vViewPos);
        float fres = 1. - max(dot(n, V), 0.);
        vec3 L = normalize(uLight);
        float diff = smoothstep(-.3, .75, dot(bn, L));
        float relief = clamp(.92 + dot(bn - n, L) * 1.8, .78, 1.12);   // keeps craters readable when full-lit
        vec3 night = mix(vec3(.03, .06, .2), tex.rgb * .32, .45);       // navy earthshine
        vec3 lit = mix(night, tex.rgb * relief, mix(diff, 1., uFull));
        lit *= 1. - pow(fres, 3.) * .25 * uFull;                        // limb darkening
        lit += vec3(1., .94, .86) * pow(fres, 2.5) * .3 * mix(diff, .8, uFull);
        gl_FragColor = vec4(lit, 1.);
      }`,
  })
}

/** Soft additive halo, used behind moons. */
export function createGlow(color = new THREE.Color(1, 0.93, 0.86), strength = 0.42) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: color }, uStrength: { value: strength } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
      void main(){
        float d = distance(vUv, vec2(.5));
        float g = pow(smoothstep(.5, .12, d), 1.6) * (uStrength + .04 * sin(uTime * .8));
        gl_FragColor = vec4(uColor * g, g);
      }`,
  })
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
}
