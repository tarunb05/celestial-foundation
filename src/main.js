import './style.css'
import 'lenis/dist/lenis.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { projects, intents, PHONE } from './data.js'
import { initHero } from './hero.js'
import { initSystem, planetNumber } from './system.js'
import { initAsteroidCursor } from './cursor.js'
import { initGalaxy } from './galaxy.js'

gsap.registerPlugin(ScrollTrigger)

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = window.matchMedia('(pointer: fine)').matches
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]

$('#year').textContent = new Date().getFullYear()

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
const scrollToEl = (el, opts = {}) => (lenis ? lenis.scrollTo(el, { duration: 1.4, ...opts }) : el.scrollIntoView({ behavior: 'smooth' }))
let systemApi = null // the solar system, once created
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    // inside a planet the page scroll is paused: leave the planet first so the nav can move the page
    if (systemApi && systemApi.focused !== null) systemApi.blur()
    lenis?.start()
    const id = a.getAttribute('href')
    const el = id === '#top' ? document.body : $(id)
    if (!el) return
    e.preventDefault()
    scrollToEl(el)
  })
)

let heroApi = null // set once the hero scene exists; the loader exit flies its camera in

/* ---------------- Loader → logo reveal ---------------- */
{
  const countEl = $('#loaderCount')
  const fillEl = $('#loaderFill')
  gsap.set('#loaderName span', { yPercent: 110 })
  const galaxy = initGalaxy($('#loaderSky'), { reduced, center: $('#loaderMoon') })
  gsap.fromTo(galaxy.state, { zoom: 0.7 }, { zoom: 0.85, duration: 2.2, ease: 'power3.out' }) // sky drifts in while loading
  // A reload in the same browser session gets a quick intro; the first visit gets the full (but brisker) show.
  let seen = false
  try {
    seen = sessionStorage.getItem('cf-intro-seen') === '1'
    sessionStorage.setItem('cf-intro-seen', '1')
  } catch {}
  const SPEED = reduced ? 1 : seen ? 2.4 : 1.35 // timeline speed-up for the logo reveal + warp
  // only wait for what the intro shows (fonts + logo), not every image on the page
  const ready = Promise.all([document.fonts.ready, $('#loaderLogo').decode().catch(() => {})])
  let isReady = false
  ready.then(() => (isReady = true))
  setTimeout(() => (isReady = true), seen ? 1200 : 2500) // never hang

  const shown = { v: 0 }
  gsap.to(shown, {
    v: 100,
    duration: reduced ? 0.01 : seen ? 0.35 : 0.9,
    ease: 'power2.inOut',
    onUpdate() {
      const v = isReady ? shown.v : Math.min(shown.v, 90)
      countEl.textContent = Math.round(v)
      fillEl.style.transform = `translateY(${100 - v}%)`
    },
    onComplete() {
      const go = () => (isReady ? revealLogo() : requestAnimationFrame(go))
      go()
    },
  })

  function revealLogo() {
    countEl.textContent = 100
    fillEl.style.transform = 'translateY(0%)'
    const tl = gsap.timeline()
    tl.to('#loaderCountWrap', { opacity: 0, y: 10, duration: 0.3 })
      .to('#loaderMoon', { scale: 1.9, duration: 0.9, ease: 'expo.inOut' }, '<')
      .to(galaxy.state, { zoom: 1.1, duration: 1.8, ease: 'expo.inOut' }, '<') // the sky surges in with the logo
      .fromTo('#loaderLogo', { opacity: 0, scale: 0.6, rotate: -25 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.9, ease: 'expo.out' }, '-=0.45')
      .to('#loaderFill', { opacity: 0, duration: 0.4 }, '<0.2')
      .fromTo('#loaderName span', { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'expo.out' }, '<')
      // exit: warp forward through the stars, pass through the logo circle, arrive at the hero moon
      .addLabel('warp', reduced ? '+=0' : '+=0.7')
      .to(galaxy.state, { zoom: 6, warp: 1, duration: 1.3, ease: 'expo.in' }, 'warp')
      .to('#loaderName, #loaderCountWrap', { opacity: 0, duration: 0.35 }, 'warp')
      .to('#loaderMoon', { scale: 26, opacity: 0, duration: 1.25, ease: 'expo.in' }, 'warp+=0.1')
      .to('#loader', { opacity: 0, duration: 0.55, ease: 'power2.out' }, 'warp+=1.05')
      .fromTo(heroApi ? heroApi.intro : {}, { p: 1 }, { p: 0, duration: 2.2, ease: 'expo.out' }, 'warp+=0.95')
      .set('#loader', { display: 'none', onComplete: () => galaxy.stop() }, 'warp+=1.65')
      .from('.hero__title .line > span', { yPercent: 110, duration: 1.2, stagger: 0.12, ease: 'expo.out' }, 'warp+=1.5')
      .from('.hero__eyebrow, .hero__sub, .hero__actions, .hero__scroll, .nav', { opacity: 0, y: 20, duration: 0.9, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform' }, 'warp+=1.8')
    tl.timeScale(SPEED)
    if (reduced) tl.progress(1)
  }
}

/* ---------------- Hero ---------------- */
if (webgl) {
  const hero = initHero($('#heroCanvas'), { reduced })
  heroApi = hero
  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => hero.setScroll(s.progress) })
}
gsap.to('.hero__inner', { yPercent: -25, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })

/* ---------------- Nav ---------------- */
ScrollTrigger.create({ start: 80, onToggle: (s) => $('#nav').classList.toggle('nav--solid', s.isActive) })

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

/* ---------------- Reveals ---------------- */
// count-up numbers ("1,800+") when they scroll into view: the number grows as it counts,
// overshoots a touch, then settles back with a little bounce
$$('[data-count]').forEach((el) => {
  const end = +el.dataset.count
  const n = { v: 0 }
  gsap.set(el, { display: 'inline-block', transformOrigin: 'left center' })
  if (!reduced) el.textContent = '0+'
  const tl = gsap.timeline({ paused: true })
  tl.fromTo(el, { scale: 0.45, opacity: 0.2 }, { scale: 1.18, opacity: 1, duration: 1.6, ease: 'power2.out' }, 0)
    .to(n, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = `${Math.round(n.v).toLocaleString('en-IN')}+`) }, 0)
    .to(el, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.45)' }, 1.6)
  if (reduced) tl.progress(1)
  else ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => tl.play() })
})
$$('[data-reveal-words]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/)
  el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ')
  gsap.fromTo($$('.w', el), { opacity: 0.14 }, { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } })
})
gsap.utils.toArray('.pillar, .way').forEach((el, i) => {
  gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', delay: (i % 3) * 0.1, scrollTrigger: { trigger: el, start: 'top 88%' } })
})
gsap.utils.toArray('.work__head h2, .involved__title').forEach((el) => {
  gsap.from(el, { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
})

/* ---------------- Our work: solar system ---------------- */
const pad = (n) => String(n).padStart(2, '0')
const panel = $('#planet')
function fillPanel(i) {
  const p = projects[i]
  const join = (...parts) => parts.filter(Boolean).join(' · ') // skip empty fields (no date / partner yet)
  $('#plEyebrow').textContent = join(p.moonOf != null ? `Moon of ${projects[p.moonOf].title}` : `Planet ${pad(planetNumber(projects, i))}`, p.date)
  $('#plTitle').textContent = p.title
  $('#plMeta').textContent = join(p.place, p.partner)
  $('#plDesc').textContent = p.desc
  $('#plImpact').innerHTML = p.impact
    .map((s) => `<div class="stat ${s.value == null ? 'stat--empty' : ''}"><span class="stat__num">${s.value ?? '—'}</span><span class="stat__label">${s.label}</span></div>`)
    .join('')
  $('#plDid').innerHTML = p.did.map((d) => `<li>${d}</li>`).join('')
  $('#plGallery').innerHTML = p.gallery.map((src) => `<a href="${p.link || src}" target="_blank" rel="noopener"><img src="${src}" alt="${p.title}" loading="lazy" /></a>`).join('')
  $('#plGallery').dataset.count = p.gallery.length
  $('#plLink').href = p.link || '#'
  $('#plLink').hidden = !p.link // no Instagram post yet → no button
  // placeholder orbits: no photos or Instagram link yet, just an invitation to get in touch
  panel.classList.toggle('planet--placeholder', !!p.placeholder)
  if (p.placeholder) $('#plGallery').innerHTML = ''
  panel.scrollTop = 0
}

$('#workList').innerHTML = projects
  .map(
    (p, i) => `<li class="wlist"><a href="${p.link || p.gallery[0] || '#work'}" target="_blank" rel="noopener">
      <img src="${p.gallery[0] || '/img/logo.png'}" alt="${p.title}" loading="lazy" />
      <span class="wlist__num">${pad(i + 1)}</span>
      <span class="wlist__meta">${[p.date, p.place].filter(Boolean).join(' · ')}</span>
      <span class="wlist__title">${p.title}</span>
      <span class="wlist__desc">${p.did.join(' · ')}</span></a></li>`
  )
  .join('')

if (webgl) {
  const system = initSystem($('#systemCanvas'), projects, {
    labelsEl: $('#systemLabels'),
    centerLabel: $('#systemCenter'),
    reduced,
    onHover: (i) => {
      setCursor(i >= 0 ? 'Land' : '')
      // the asteroid crashes into the hovered planet/moon and its pieces orbit it (tracking it as it moves)
      if (i >= 0) asteroid?.setSnap({ isConnected: true, getBoundingClientRect: () => system.screenRect(i) })
      else asteroid?.setSnap(null, true)
    },
    onFocus: (i) => {
      if (i === null) {
        panel.classList.remove('is-open')
        panel.setAttribute('aria-hidden', 'true')
        $('#work').classList.remove('is-focused')
        lenis?.start()
        return
      }
      fillPanel(i)
      $('#work').classList.add('is-focused')
      // bring the whole section into view, then hold the page still while exploring
      if (lenis) lenis.scrollTo('#work', { duration: 0.7, onComplete: () => system.focused !== null && lenis.stop() })
      else $('#work').scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => {
        panel.classList.add('is-open')
        panel.setAttribute('aria-hidden', 'false')
        gsap.fromTo($$('.planet > *', panel), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' })
      }, reduced ? 0 : 900)
    },
  })
  systemApi = system
  $('#planetBack').addEventListener('click', () => system.blur())
  // if the page gets scrolled away while a planet is open, return to the orbit view
  new IntersectionObserver(([e]) => !e.isIntersecting && system.focused !== null && system.blur(), { threshold: 0.35 }).observe($('#work'))
  window.addEventListener('keydown', (e) => e.key === 'Escape' && system.focused !== null && !$('#contact').open && system.blur())
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
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' })
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' })
  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX)
    yTo(e.clientY)
  })
  // crash into controls (buttons, links, planet labels, cards); the 3D canvas just enlarges it
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('a, button, [role=tab]')
    if (el) {
      const r = el.getBoundingClientRect()
      const small = r.width < 1100 && r.height < 460 // buttons, links, labels and the get-involved cards
      asteroid.setSnap(small ? el : null, true)
    } else asteroid.setSnap(null, !!e.target.closest('#systemCanvas'))
  })
} else {
  cursor.style.display = 'none'
}

/* ---------------- Magnetic buttons ---------------- */
if (finePointer && !reduced) {
  $$('.btn').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4 })
    })
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }))
  })
}

/* ---------------- Contact dialog ---------------- */
const dialog = $('#contact')
let wasStopped = false
function setIntent(key) {
  const it = intents[key] || intents.collab
  $$('.contact__tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.intent === key))
  $('#contactBlurb').textContent = it.blurb
  $('#contactWa').href = `https://wa.me/${PHONE}?text=${encodeURIComponent(it.msg)}`
}
$$('[data-open-contact]').forEach((b) =>
  b.addEventListener('click', () => {
    setIntent(b.dataset.openContact || 'collab')
    dialog.showModal()
    asteroid?.raise()
    wasStopped = lenis?.isStopped
    lenis?.stop()
    gsap.fromTo(dialog, { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' })
  })
)
$$('.contact__tabs [role=tab]').forEach((b) => b.addEventListener('click', () => setIntent(b.dataset.intent)))
$('#contactClose').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', (e) => e.target === dialog && dialog.close())
dialog.addEventListener('close', () => !wasStopped && lenis?.start())

window.addEventListener('load', () => ScrollTrigger.refresh())
