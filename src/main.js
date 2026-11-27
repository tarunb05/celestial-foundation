import './style.css'
import 'lenis/dist/lenis.css'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { projects, moments, intents, PHONE } from './data.js'
import { initHero } from './hero.js'
import { initOrbit } from './orbit.js'
import { initAsteroidCursor } from './cursor.js'

gsap.registerPlugin(ScrollTrigger)

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = window.matchMedia('(pointer: fine)').matches
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]

document.getElementById('year').textContent = new Date().getFullYear()

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}
const webgl = hasWebGL()
if (!webgl) document.documentElement.classList.add('no-webgl')

/* ---------------- Smooth scroll ---------------- */
let lenis = null
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')
    const el = id === '#top' ? document.body : $(id)
    if (!el) return
    e.preventDefault()
    lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.4 }) : el.scrollIntoView({ behavior: 'smooth' })
  })
)

/* ---------------- Loader ---------------- */
const manager = new THREE.LoadingManager()
const countEl = $('#loaderCount')
const fillEl = $('#loaderFill')
const shown = { v: 0 }
let loadedRatio = webgl ? 0 : 1
manager.onProgress = (_, loaded, total) => (loadedRatio = loaded / total)
manager.onLoad = () => (loadedRatio = 1)
const loaderTween = gsap.to(shown, {
  v: 100,
  duration: 1.6,
  ease: 'power2.inOut',
  onUpdate() {
    const v = Math.min(shown.v, 15 + loadedRatio * 85)
    countEl.textContent = Math.round(v)
    fillEl.style.transform = `translateY(${100 - v}%)`
  },
  onComplete: finishLoading,
})
function finishLoading() {
  if (loadedRatio < 1) {
    // wait for textures, but never hang longer than 4s
    const start = performance.now()
    const wait = () => (loadedRatio >= 1 || performance.now() - start > 4000 ? reveal() : requestAnimationFrame(wait))
    return wait()
  }
  reveal()
}
function reveal() {
  countEl.textContent = 100
  fillEl.style.transform = 'translateY(0%)'
  const tl = gsap.timeline()
  tl.to('#loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut', delay: 0.15 })
    .set('#loader', { display: 'none' })
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.2, stagger: 0.12, ease: 'expo.out' }, '-=0.5')
    .from('.hero__eyebrow, .hero__sub, .hero__actions, .hero__scroll, .nav', { opacity: 0, y: 20, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, '-=0.9')
}
if (reduced) loaderTween.progress(1)

/* ---------------- Hero ---------------- */
if (webgl) {
  const hero = initHero($('#heroCanvas'), { reduced })
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (s) => hero.setScroll(s.progress),
  })
}
gsap.to('.hero__inner', {
  yPercent: -25,
  opacity: 0,
  ease: 'none',
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
})

/* ---------------- Nav state ---------------- */
ScrollTrigger.create({
  start: 80,
  onToggle: (s) => $('#nav').classList.toggle('nav--solid', s.isActive),
})
// floating contact button appears once the hero CTAs are out of view
ScrollTrigger.create({
  start: () => $('#hero').offsetHeight * 0.6,
  end: 'max',
  onToggle: (s) => $('.fab').classList.toggle('fab--show', s.isActive),
})

/* ---------------- Marquee (scroll-velocity aware) ---------------- */
{
  const track = $('.marquee__track')
  let x = 0, boost = 0
  if (lenis) lenis.on('scroll', ({ velocity }) => (boost = velocity))
  gsap.ticker.add(() => {
    if (reduced) return
    x -= 0.6 + Math.abs(boost) * 0.25
    boost *= 0.92
    const half = track.scrollWidth / 2
    if (-x >= half) x += half
    track.style.transform = `translate3d(${x}px,0,0)`
  })
}

/* ---------------- Word reveal ---------------- */
$$('[data-reveal-words]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/)
  el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ')
  gsap.fromTo(
    $$('.w', el),
    { opacity: 0.14 },
    { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } }
  )
})
gsap.utils.toArray('.pillar, .way').forEach((el, i) => {
  gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', delay: (i % 3) * 0.1, scrollTrigger: { trigger: el, start: 'top 88%' } })
})
gsap.utils.toArray('.projects__head h2, .moments__head h2, .involved__title').forEach((el) => {
  gsap.from(el, { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
})

/* ---------------- Projects ---------------- */
const list = $('#projectsList')
list.innerHTML = projects
  .map(
    (p, i) => `<li class="plist">
      <a href="${p.link}" target="_blank" rel="noopener">
        <img src="${p.img}" alt="${p.title}" loading="lazy" />
        <span class="plist__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="plist__meta">${p.date} · ${p.place}</span>
        <span class="plist__title">${p.title}</span>
        <span class="plist__desc">${p.desc}</span>
      </a></li>`
  )
  .join('')
$('#pTotal').textContent = String(projects.length).padStart(2, '0')

const detail = { count: $('#pCount'), meta: $('#pMeta'), title: $('#pTitle'), desc: $('#pDesc'), link: $('#pLink') }
function showProject(i) {
  const p = projects[i]
  const els = [detail.meta, detail.title, detail.desc, detail.link]
  gsap.killTweensOf(els)
  gsap.to(els, {
    opacity: 0,
    y: -14,
    duration: 0.22,
    stagger: 0.03,
    ease: 'power2.in',
    onComplete() {
      detail.count.textContent = String(i + 1).padStart(2, '0')
      detail.meta.textContent = `${p.date} — ${p.place} · ${p.partner}`
      detail.title.textContent = p.title
      detail.desc.textContent = p.desc
      detail.link.href = p.link
      gsap.fromTo(els, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' })
    },
  })
}

if (webgl) {
  const N = projects.length
  const orbit = initOrbit($('#orbitCanvas'), projects, {
    manager,
    reduced,
    onActive: showProject,
    onHover: (i, isActive) => setCursor(i >= 0 ? (isActive ? 'View ↗' : 'Focus') : ''),
  })
  const st = ScrollTrigger.create({
    trigger: '#projectsPin',
    start: 'top top',
    end: () => `+=${window.innerHeight * (N - 1) * 0.75}`,
    pin: true,
    scrub: true,
    snap: reduced ? false : { snapTo: 1 / (N - 1), duration: { min: 0.2, max: 0.6 }, delay: 0.08, ease: 'power2.inOut' },
    onUpdate: (s) => {
      orbit.set(s.progress * (N - 1))
      $('#pBar').style.transform = `scaleX(${s.progress})`
    },
  })
  const scrollToIndex = (i) => {
    const y = st.start + (st.end - st.start) * (i / (N - 1))
    lenis ? lenis.scrollTo(y, { duration: 1.1 }) : window.scrollTo({ top: y, behavior: 'smooth' })
  }
  orbit.onSelect = scrollToIndex

  // drag to orbit
  const cv = $('#orbitCanvas')
  let dragging = false, sx = 0, sy = 0
  cv.addEventListener('pointerdown', (e) => {
    dragging = true
    sx = e.clientX
    sy = window.scrollY
  })
  window.addEventListener('pointerup', () => (dragging = false))
  window.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerType === 'touch') return
    const dx = sx - e.clientX
    const y = Math.max(st.start, Math.min(st.end, sy + dx * 2.2))
    lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)
  })
  // keyboard
  window.addEventListener('keydown', (e) => {
    if (!st.isActive) return
    const cur = Math.round(st.progress * (N - 1))
    if (e.key === 'ArrowRight') scrollToIndex(Math.min(N - 1, cur + 1))
    if (e.key === 'ArrowLeft') scrollToIndex(Math.max(0, cur - 1))
  })
} else {
  showProject(0)
}

/* ---------------- Moments strip ---------------- */
{
  const track = $('#stripTrack')
  const items = [...moments, ...moments]
  track.innerHTML = items
    .map(
      (m, i) => `<figure class="moment ${i % 2 ? 'moment--low' : ''}">
        <div class="moment__img"><img src="${m.img}" alt="${m.caption}" loading="lazy" draggable="false" /></div>
        <figcaption>${m.caption}</figcaption></figure>`
    )
    .join('')
  let x = 0, vel = 0, drag = false, lastX = 0, skew = 0
  const strip = $('#strip')
  strip.addEventListener('pointerdown', (e) => {
    drag = true
    lastX = e.clientX
    strip.classList.add('is-drag')
  })
  window.addEventListener('pointerup', () => {
    drag = false
    strip.classList.remove('is-drag')
  })
  window.addEventListener('pointermove', (e) => {
    if (!drag) return
    vel = e.clientX - lastX
    lastX = e.clientX
  })
  let scrollBoost = 0
  if (lenis) lenis.on('scroll', ({ velocity }) => (scrollBoost = velocity))
  gsap.ticker.add(() => {
    if (reduced) return
    if (!drag) vel *= 0.94
    x += vel - 0.5 - scrollBoost * 0.4
    scrollBoost *= 0.9
    const half = track.scrollWidth / 2
    if (x <= -half) x += half
    if (x > 0) x -= half
    skew += (Math.max(-12, Math.min(12, (vel - scrollBoost * 0.4) * 0.6)) - skew) * 0.1
    track.style.transform = `translate3d(${x}px,0,0)`
    track.style.setProperty('--skew', `${skew}deg`)
  })
  strip.addEventListener('pointerenter', () => setCursor('Drag'))
  strip.addEventListener('pointerleave', () => setCursor(''))
}

/* ---------------- Asteroid cursor ---------------- */
const cursor = $('#cursor')
const cursorLabel = $('#cursorLabel')
const useAsteroid = finePointer && !reduced && 'showPopover' in HTMLElement.prototype
let asteroid = null
function setCursor(label) {
  if (!useAsteroid) return
  cursorLabel.textContent = label
  cursor.classList.toggle('cursor--label', !!label)
}
if (useAsteroid) {
  asteroid = initAsteroidCursor()
  document.documentElement.classList.add('has-asteroid')
  // label chip rides just below-right of the asteroid
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' })
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' })
  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX)
    yTo(e.clientY)
  })
  $$('a, button, .strip, #orbitCanvas').forEach((el) => {
    el.addEventListener('pointerenter', () => asteroid.setHover(true))
    el.addEventListener('pointerleave', () => asteroid.setHover(false))
  })
} else {
  cursor.style.display = 'none'
}

/* ---------------- Magnetic buttons ---------------- */
if (finePointer && !reduced) {
  $$('.btn, .fab').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4 })
    })
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }))
  })
}

/* ---------------- Contact dialog ---------------- */
const dialog = $('#contact')
function setIntent(key) {
  const it = intents[key] || intents.collab
  $$('.contact__tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.intent === key))
  $('#contactBlurb').textContent = it.blurb
  $('#contactWa').href = `https://wa.me/${PHONE}?text=${encodeURIComponent(it.msg)}`
  $('#contactForm').style.display = key === 'volunteer' ? '' : 'none'
}
$$('[data-open-contact]').forEach((b) =>
  b.addEventListener('click', () => {
    setIntent(b.dataset.openContact || 'collab')
    dialog.showModal()
    asteroid?.raise()
    lenis?.stop()
    gsap.fromTo(dialog, { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' })
  })
)
$$('.contact__tabs [role=tab]').forEach((b) => b.addEventListener('click', () => setIntent(b.dataset.intent)))
$('#contactClose').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', (e) => e.target === dialog && dialog.close())
dialog.addEventListener('close', () => lenis?.start())

window.addEventListener('load', () => ScrollTrigger.refresh())
