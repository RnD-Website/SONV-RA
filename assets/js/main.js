/* =========================================================================
   SONVÉRA — motion system
   GSAP + ScrollTrigger reproduce the reference's Taptop SCROLL_TRANSFORM
   timelines (each section = sticky camera, timeline 0–100 keyframes mapped
   to the section's scroll length, "smoothing" → scrub). Lenis 1.3.8 handles
   smooth scrolling with the reference settings, Swiper drives the adaptive
   sliders, and LottieFiles' <lottie-player> renders the sound curve.
   ========================================================================= */
(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isDesktop = () => window.innerWidth >= 992;

  // CSS cubic-bezier → GSAP ease (exact reference curves)
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t;
    const sy = t => ((ay * t + by) * t + cy) * t;
    const dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return p => {
      if (p <= 0) return 0; if (p >= 1) return 1;
      let t = p;
      for (let i = 0; i < 8; i++) { const e = sx(t) - p; const d = dx(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; }
      return sy(Math.min(1, Math.max(0, t)));
    };
  }
  const EASE = bezier(.25, .1, .25, 1);          // Taptop default
  const EASE_INOUT = bezier(.785, .135, .15, .86); // app section

  // Feed the bundled Lottie data to every player (works over http and file://)
  const lottieData = window.SONVERA_LOTTIE;
  customElements.whenDefined('lottie-player').then(() => {
    document.querySelectorAll('lottie-player').forEach(p => {
      if (!p.getAttribute('src') && lottieData) p.load(JSON.parse(JSON.stringify(lottieData)));
    });
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* =======================================================================
     DYNAMIC CONTENT (phone UIs, timeline, adaptive clones)
     ======================================================================= */
  const statusBar = '<div class="phone__island"></div><div class="phone__status"><span>9:41</span><span>●●● ▮</span></div>';
  const tabs = on => `<div class="phone__tabs">${['Home', 'Sound', 'Controls', 'Settings'].map((t, i) => `<span class="${i === on ? 'on' : ''}"><i></i>${t}</span>`).join('')}</div>`;
  const screens = {
    pair: `<div class="phone"><div class="phone__screen">${statusBar}
      <div class="phone__hero"><h5>Connected</h5><p>SONVÉRA · Ice Blue</p></div>
      <div class="phone__body">
        <div class="p-card"><div class="p-buds"><img src="assets/img/case-open.webp" alt=""></div></div>
        <div class="p-card"><div class="p-card__t">Battery</div><div class="p-card__s">Updated just now</div>
          <div class="p-bat">
            <div class="p-bat__row"><span>Left</span><span class="p-bat__bar"><i style="width:92%"></i></span><span>92%</span></div>
            <div class="p-bat__row"><span>Right</span><span class="p-bat__bar"><i style="width:88%"></i></span><span>88%</span></div>
            <div class="p-bat__row"><span>Case</span><span class="p-bat__bar"><i style="width:76%"></i></span><span>76%</span></div>
          </div></div>
      </div>${tabs(0)}</div></div>`,
    touch: `<div class="phone"><div class="phone__screen">${statusBar}
      <div class="phone__hero"><h5>Touch controls</h5><p>Customise each earbud</p></div>
      <div class="phone__body">
        <div class="p-card"><div class="p-list">
          <div class="p-list__row"><span class="p-list__ico">1×</span><div><b>Tap</b><span>Play / pause</span></div></div>
          <div class="p-list__row"><span class="p-list__ico">2×</span><div><b>Double-tap</b><span>Next track</span></div></div>
          <div class="p-list__row"><span class="p-list__ico">3×</span><div><b>Triple-tap</b><span>Previous track</span></div></div>
          <div class="p-list__row"><span class="p-list__ico">◉</span><div><b>Press and hold</b><span>Noise control</span></div></div>
        </div></div>
        <div class="p-card"><div class="p-card__t">Ear detection</div><div class="p-card__s">Pause when you take an earbud out</div></div>
      </div>${tabs(2)}</div></div>`,
    battery: `<div class="phone"><div class="phone__screen">${statusBar}
      <div class="phone__hero"><h5>Sound</h5><p>Adaptive EQ is on</p></div>
      <div class="phone__body">
        <div class="p-card"><div class="p-card__t">Noise control</div>
          <div class="p-seg"><span class="on">ANC</span><span>Adaptive</span><span>Aware</span></div></div>
        <div class="p-card"><div class="p-card__t">Equaliser</div><div class="p-card__s">Balanced</div>
          <div class="p-eq">${[44, 62, 80, 58, 70, 92, 66, 50, 38].map(h => `<i style="height:${h}%"></i>`).join('')}</div></div>
        <div class="p-card"><div class="p-ring"><span class="p-ring__c"><b>82</b></span><div><div class="p-card__t">Case battery</div><div class="p-card__s">About 3 full charges left</div></div></div></div>
      </div>${tabs(1)}</div></div>`
  };
  $$('[data-screen]').forEach(el => { el.innerHTML = screens[el.dataset.screen]; });

  // Desktop day timeline (06:00 → 14:00, 30-minute steps of 24vw)
  const timeline = $('#timeline');
  if (timeline) {
    const icons = { 6: 'sun', 7: 'run', 8: 'train', 9: 'cup', 10: 'bike', 11: 'train', 12: 'cup', 13: 'sun', 14: 'moon' };
    const markers = { 9: 'eq', 11: 'anc', 13: 'spatial' };
    let html = '';
    for (let i = 0; i <= 16; i++) {
      const x = 2 + i * 24, mins = 6 * 60 + i * 30, h = Math.floor(mins / 60), m = mins % 60;
      const full = m === 0;
      html += `<div class="tl__seg" style="left:${x}vw"><span class="tl__time">${String(h).padStart(2, '0')}:${m ? '30' : '00'}</span>${full && icons[h] ? `<svg class="tl__icon"><use href="#i-${icons[h]}"/></svg>` : ''}</div>`;
      if (i < 16) html += `<div class="tl__ticks" style="left:${x + 2.2}vw;width:${24 - 4.4}vw">${'<i></i>'.repeat(11)}</div>`;
      if (full && markers[h]) html += `<div class="tl__marker" style="left:${x}vw"><span class="tl__marker-line"></span><span class="tl__marker-circle"><svg><use href="#i-${markers[h]}"/></svg></span></div>`;
    }
    timeline.innerHTML = html;
  }

  // Adaptive clones (single source of truth for copy)
  const nAd = $('.numbers-adaptive__cards');
  if (nAd) $$('.numbers__card').forEach(c => nAd.appendChild(c.cloneNode(true)));
  const sAd = $('.steps-adaptive__cards');
  if (sAd) $$('.steps .steps__card').forEach(c => sAd.appendChild(c.cloneNode(true)));
  const rAd = $('.reviews-adaptive__slider .swiper-wrapper');
  if (rAd) {
    const imgs = $$('.reviews__panel img'), cards = $$('.reviews__card');
    cards.forEach((c, i) => {
      const slide = document.createElement('div'); slide.className = 'swiper-slide';
      slide.innerHTML = `<div class="ra-slide"><img src="${imgs[i].getAttribute('src')}" alt="${imgs[i].alt}" style="object-position:${imgs[i].style.objectPosition || '50% 50%'}"></div>`;
      slide.firstChild.appendChild(c.cloneNode(true));
      rAd.appendChild(slide);
    });
  }

  /* =======================================================================
     LENIS (reference settings: lerp .05, wheelMultiplier 1)
     ======================================================================= */
  const lenis = new Lenis({ lerp: 0.05, wheelMultiplier: 1, gestureOrientation: 'vertical', smoothWheel: true, anchors: false });
  window.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* =======================================================================
     HEADER
     ======================================================================= */
  const header = $('#header');
  let lastY = 0;
  function updateHeader() {
    const y = window.scrollY, vh = window.innerHeight;
    let dark;
    if (isDesktop()) dark = y > vh * 0.35;
    else {
      const cov = $('.cover-adaptive').getBoundingClientRect();
      dark = cov.bottom < header.offsetHeight + 10;
    }
    header.classList.toggle('is-dark', dark);
    const rev = isDesktop() ? $('#reviews') : $('.reviews-adaptive');
    const overReviews = rev && rev.getBoundingClientRect().top <= vh * 0.09;
    if (overReviews || (y > 100 && y > lastY + 1)) header.classList.add('is-hidden');
    else if (y < lastY - 1 || y <= 100) header.classList.remove('is-hidden');
    lastY = y;
  }
  lenis.on('scroll', updateHeader);
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Menu: hover expand on desktop (reference HOVER trigger), popup on adaptive
  const menu = $('#menu'), menuHead = $('.menu__head', menu), popupMenu = $('#menuPopup');
  const setMenu = open => { menu.classList.toggle('is-open', open); menuHead.setAttribute('aria-expanded', open); };
  menu.addEventListener('mouseenter', () => isDesktop() && setMenu(true));
  menu.addEventListener('mouseleave', () => isDesktop() && setMenu(false));
  menuHead.addEventListener('click', () => {
    if (isDesktop()) setMenu(!menu.classList.contains('is-open'));
    else { popupMenu.classList.add('is-open'); popupMenu.setAttribute('aria-hidden', 'false'); lenis.stop(); }
  });
  const closeMobileMenu = () => { popupMenu.classList.remove('is-open'); popupMenu.setAttribute('aria-hidden', 'true'); lenis.start(); };
  $('.menu-adaptive__close').addEventListener('click', closeMobileMenu);
  popupMenu.addEventListener('click', e => { if (e.target === popupMenu) closeMobileMenu(); });

  // Anchor navigation through Lenis
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('js-preorder')) return;
    const id = a.getAttribute('href').slice(1);
    e.preventDefault();
    if (popupMenu.classList.contains('is-open')) closeMobileMenu();
    setMenu(false);
    if (id === 'top' || !id) { lenis.scrollTo(0, { duration: 1.6 }); return; }
    let target = document.getElementById(id);
    if (!target) return;
    // desktop scenes: land where the section's content is fully on screen
    const offsets = { numbers: 0.98, metrics: 0.2, app: 0.3, steps: 0.45, advantages: 0 };
    if (isDesktop() && id in offsets) {
      const st = target.offsetTop + (target.offsetHeight - window.innerHeight) * offsets[id];
      lenis.scrollTo(st, { duration: 1.8 });
    } else lenis.scrollTo(target, { duration: 1.6, offset: -10 });
  });

  /* =======================================================================
     PRE-ORDER POP-UP
     ======================================================================= */
  const popup = $('#popup'), form = $('.pop-up__form', popup), input = $('.pop-up__input', popup);
  const openPopup = () => { popup.classList.add('is-open'); popup.setAttribute('aria-hidden', 'false'); lenis.stop(); setTimeout(() => input.focus({ preventScroll: true }), 300); };
  const closePopup = () => { popup.classList.remove('is-open'); popup.setAttribute('aria-hidden', 'true'); lenis.start(); };
  document.addEventListener('click', e => {
    if (e.target.closest('.js-preorder')) { e.preventDefault(); if (popupMenu.classList.contains('is-open')) closeMobileMenu(); openPopup(); }
    if (e.target.closest('[data-close]')) closePopup();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePopup(); closeMobileMenu(); setMenu(false); } });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    input.classList.toggle('is-error', !ok);
    if (ok) form.classList.add('is-success');
  });

  /* =======================================================================
     SCENE BUILDER — mirrors Taptop SCROLL_TRANSFORM
     timeline length 100 = keyframes, trigger top→bottom, scrub = smoothing
     ======================================================================= */
  function scene(trigger, scrub = 1, extra = {}) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger, start: 'top top', end: 'bottom bottom', scrub, invalidateOnRefresh: true, ...extra }
    });
    tl.set({}, {}, 100);
    return tl;
  }
  const seg = (tl, target, vars, a, b) => tl.to(target, { duration: b - a, ...vars }, a);

  /* =======================================================================
     DESKTOP ( ≥ 992px )
     ======================================================================= */
  const mm = gsap.matchMedia();

  mm.add('(min-width: 992px)', () => {
    const mask = $('.cover__mask'), media = $('.cover__media'), content = $('.cover__content');
    const lockMs = 3000;

    /* ---------- page-load intro (APPEAR_ON_SCREEN) ---------- */
    lenis.stop(); document.documentElement.style.overflow = 'hidden';
    const unlock = setTimeout(() => { document.documentElement.style.overflow = ''; lenis.start(); }, lockMs);

    gsap.set(mask, { width: '0.83vw', height: '0.56vw', borderRadius: '0.28vw' });
    gsap.set('.cover__title .mask__line', { yPercent: 110 });
    gsap.set('.cover__subtitle .mask__line', { yPercent: 100 });
    gsap.set('.pre-order-button__wrapper .pre-order-button', { yPercent: 100, opacity: 0 });
    gsap.set('.header__container', { yPercent: -200, opacity: 0 });

    const intro = gsap.timeline({ onComplete: buildScroll });
    intro
      .to(mask, { width: '23.61vw', height: '15.69vw', borderRadius: '69.44vw', duration: .8, ease: EASE }, 0)
      .to(mask, { width: '97.92vw', height: '96.5vh', borderRadius: '2.43vw', duration: 1.2, ease: EASE }, .8)
      .to('.header__container', { yPercent: 0, opacity: 1, duration: .8, ease: EASE }, 1.8)
      .to('.cover__title .mask__line', { yPercent: 0, duration: .8, ease: EASE }, 2)
      .to('.cover__subtitle .mask__line', { yPercent: 0, duration: .8, ease: EASE }, 2.4)
      .to('.pre-order-button__wrapper .pre-order-button', { yPercent: 0, opacity: 1, duration: .8, ease: EASE }, 2.5);

    // lottie handle
    const lp = $('.metrics__lottie');
    let lottieFrames = 0;
    const lottieReady = () => { try { lottieFrames = lp.getLottie().totalFrames; } catch (e) { } };
    lp.addEventListener('ready', lottieReady); lottieReady();

    const triggers = [];
    let built = false;
    function buildScroll() {
      if (built) return; built = true;

      /* ---------- 01+02 INTRO: cover (0–200vh) + route (115–415vh) ---------- */
      const C = k => k * 2, R = k => 115 + k * 3;
      const t = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.intro', start: 'top top', end: 'bottom bottom', scrub: 1.2, invalidateOnRefresh: true } });
      t.set({}, {}, 415);
      const blur = { v: 0 }, blurEls = $$('.cover__title, .cover__subtitle, .pre-order-button__wrapper');
      const applyBlur = () => blurEls.forEach(el => { el.style.filter = blur.v > .05 ? `blur(${blur.v}px)` : ''; });
      // cover
      t.to(content, { opacity: 0, duration: C(40) - C(10) }, C(10));
      t.to(content, { x: '-13.26vw', y: '12.69vh', duration: C(55) - C(25), ease: EASE }, C(25));
      t.to(blur, { v: 20, duration: C(50) - C(20), onUpdate: applyBlur }, C(20));
      t.to(blur, { v: 0, duration: C(70) - C(50), onUpdate: applyBlur }, C(50));
      t.to(mask, { borderRadius: '69.44vw', duration: C(70), ease: EASE }, 0);
      t.to(mask, { width: '23.61vw', height: '15.63vw', duration: C(55) - C(25) }, C(25));
      t.to(media, { scale: .4, x: '-5vw', duration: C(55) - C(25) }, C(25));
      t.to('.cover', { x: '-98.7vw', duration: R(80) - R(25) }, R(25));
      // route rows
      t.fromTo('.route__row', { opacity: 0 }, { opacity: 1, duration: 3, immediateRender: false }, R(0));
      t.fromTo('.route__device', { opacity: 0 }, { opacity: 1, duration: 3, immediateRender: false }, R(0));
      gsap.set(['.route__row--top', '.route__row--bottom'], { x: '-100vw' });
      gsap.set(['.route__row--middle', '.route__device'], { x: '135.69vw' });
      t.to(['.route__row--top', '.route__row--bottom'], { x: '-62.85vw', duration: R(25) - R(5) }, R(5));
      t.to(['.route__row--top', '.route__row--bottom'], { x: '84.99vw', duration: R(80) - R(25) }, R(25));
      t.to(['.route__row--top', '.route__row--bottom'], { x: '147vw', duration: R(96) - R(80) }, R(80));
      t.to(['.route__row--middle', '.route__device'], { x: '98.7vw', duration: R(25) - R(5) }, R(5));
      t.to(['.route__row--middle', '.route__device'], { x: 0, duration: R(80) - R(25) }, R(25));
      t.to('.route__row--middle', { x: '-62vw', duration: R(96) - R(80), ease: 'power1.inOut' }, R(80));
      triggers.push(t.scrollTrigger);

      /* ---------- 03 NUMBERS ---------- */
      const n = scene('.numbers', 1.2);
      seg(n, '.numbers', { opacity: 1 }, 1, 2);
      seg(n, '.intro__camera', { opacity: 0 }, 2, 3);
      seg(n, '.numbers__container', { backgroundColor: 'rgba(244,247,250,1)', ease: 'power1.inOut' }, 3, 50);
      seg(n, '.numbers__wrapper', { x: '-38.2vw', ease: 'power1.inOut' }, 3, 25);
      seg(n, '.numbers__wrapper', { x: () => -$('.numbers__cards-wrapper').offsetLeft, ease: 'power1.inOut' }, 25, 100);
      seg(n, '.numbers__device-image', { x: '38.2vw' }, 3, 25);
      seg(n, '.numbers__device-image', { rotation: -80 }, 25, 55);
      triggers.push(n.scrollTrigger);

      /* ---------- 04 ADVANTAGES ---------- */
      const a = scene('.advantages', 1);
      const P = $$('.advantages__panel'), G = $$('.advantages__gap'), Pimg = P.map(p => p.querySelector('img'));
      const FULL = '96.29vh', RED = '94.435vh', GAP = '1.855vh';
      gsap.set(Pimg, { top: 0, bottom: 'auto' });
      // offsetTop is measured from .advantages__camera (includes the wrapper's top padding),
      // so subtract the first panel's offset to pin each image to the top of the mask
      const pin = () => P.forEach((p, i) => { Pimg[i].style.transform = `translate3d(0,${P[0].offsetTop - p.offsetTop}px,0)`; });
      a.eventCallback('onUpdate', pin);
      seg(a, '.advantages', { backgroundColor: '#FFFFFF', ease: 'power1.inOut' }, 0, 10);
      seg(a, P[0], { height: RED }, 0, 5); seg(a, G[0], { height: GAP }, 0, 5);
      seg(a, P[0], { height: 0 }, 5, 45); seg(a, P[1], { height: RED }, 5, 45);
      seg(a, P[1], { height: FULL }, 45, 50); seg(a, G[0], { height: 0 }, 45, 50);
      seg(a, P[1], { height: RED }, 50, 55); seg(a, G[1], { height: GAP }, 50, 55);
      seg(a, P[1], { height: 0 }, 55, 95); seg(a, P[2], { height: RED }, 55, 95);
      seg(a, P[2], { height: FULL }, 95, 100); seg(a, G[1], { height: 0 }, 95, 100);
      // tabs + marker
      const T = $$('.advantages__tab'), mk = $('.advantages__marker');
      const tabY = i => T[i].offsetTop - T[0].offsetTop;
      const on = { scale: 1.143, x: '1.8vw', color: '#142D46' }, off = { scale: 1, x: 0, color: '#72818F' };
      gsap.set(T[0], on); gsap.set([T[1], T[2]], off);
      seg(a, T[0], { ...off, ease: EASE }, 30, 36); seg(a, T[1], { ...on, ease: EASE }, 30, 36);
      seg(a, mk, { y: () => tabY(1), ease: 'power1.inOut' }, 30, 36);
      seg(a, T[1], { ...off, ease: EASE }, 73, 81); seg(a, T[2], { ...on, ease: EASE }, 73, 81);
      seg(a, mk, { y: () => tabY(2), ease: 'power1.inOut' }, 73, 81);
      // descriptions
      const D = $$('.advantages__description');
      gsap.set([D[1], D[2]], { opacity: 0, y: '2.4vh' });
      seg(a, D[0], { opacity: 0, ease: 'power1.inOut' }, 26, 32);
      seg(a, D[1], { opacity: 1, y: 0, ease: EASE }, 35, 43);
      seg(a, D[1], { opacity: 0, ease: 'power1.inOut' }, 69, 77);
      seg(a, D[2], { opacity: 1, y: 0, ease: EASE }, 77, 87);
      triggers.push(a.scrollTrigger);
      // tab click → scroll to tab position (reference: 0 / .5 / 1 of section)
      T.forEach((tab, i) => tab.onclick = () => {
        const s = $('.advantages'); const len = s.offsetHeight - innerHeight;
        lenis.scrollTo(s.offsetTop + [0.0, 0.5, 1.0][i] * len, { duration: 1.2, easing: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 });
      });

      /* ---------- 05 METRICS ---------- */
      const m = scene('.metrics', 1, {
        onUpdate: self => { if (lottieFrames) lp.seek(Math.round(self.progress * (lottieFrames - 1))); },
        onEnter: () => gsap.to(['.metrics__pointer-wrapper', '.metrics__timeline', '.metrics__lottie-camera'], { opacity: 1, duration: .8, ease: 'power1.inOut' })
      });
      seg(m, '.metrics__titles', { x: '-300vw', ease: 'power1.inOut' }, 0, 75);
      seg(m, '.metrics__timeline', { x: '-288vw', ease: 'power1.inOut' }, 0, 75);
      seg(m, ['.metrics__titles', '.metrics__timeline', '.metrics__pointer-wrapper'], { y: '-100vh', ease: 'power1.inOut' }, 75, 100);
      seg(m, '.metrics__lottie-camera', { autoAlpha: 0, ease: 'power1.inOut' }, 75, 100);
      const MD = $$('.metrics__description');
      [[22, 28, 32, 34], [37, 43, 46, 48], [52, 60, 75, 100]].forEach(([i0, i1, o0, o1], i) => {
        gsap.set($$('.mask__line', MD[i]), { yPercent: 100 });
        seg(m, $$('.mask__line', MD[i]), { yPercent: 0, ease: 'power1.inOut' }, i0, i1);
        seg(m, MD[i], { opacity: 0, ease: 'power1.inOut' }, o0, o1);
      });
      triggers.push(m.scrollTrigger);

      /* ---------- 06 APP ---------- */
      const ap = scene('.app', 2);
      seg(ap, '.app', { backgroundColor: 'rgba(244,247,250,1)', ease: 'power1.inOut' }, 1, 17);
      gsap.set('.app__left-content', { xPercent: -110 }); gsap.set('.app__right-content', { xPercent: 110 });
      seg(ap, '.app__left-content', { xPercent: 0, ease: EASE_INOUT }, 0, 20);
      seg(ap, '.app__right-content', { xPercent: 0, ease: EASE_INOUT }, 0, 20);
      seg(ap, '.app__left-content', { xPercent: -110, ease: EASE_INOUT }, 80, 100);
      seg(ap, '.app__right-content', { xPercent: 110, ease: EASE_INOUT }, 80, 100);
      const I = $$('.app__image'), Cd = $$('.app__card');
      gsap.set([I[1], I[2], Cd[1], Cd[2]], { y: '100vh' });
      seg(ap, I[0], { scale: .9, ease: EASE_INOUT }, 35, 50); seg(ap, I[0], { opacity: 0, ease: 'power1.inOut' }, 35, 45);
      seg(ap, I[1], { y: 0, ease: EASE_INOUT }, 30, 50);
      seg(ap, I[1], { scale: .9, ease: EASE_INOUT }, 55, 70); seg(ap, I[1], { opacity: 0, ease: 'power1.inOut' }, 55, 65);
      seg(ap, I[2], { y: 0, ease: EASE_INOUT }, 50, 70);
      seg(ap, Cd[1], { y: 0, ease: EASE_INOUT }, 30, 50);
      seg(ap, Cd[2], { y: 0, ease: EASE_INOUT }, 50, 70);
      triggers.push(ap.scrollTrigger);

      /* ---------- 07 STEPS ---------- */
      const s = scene('.steps', 2);
      gsap.set('.steps__title', { yPercent: 100 });
      seg(s, '.steps__title', { yPercent: 0, ease: 'power1.out' }, 0, 15);
      const SC = $$('.steps .steps__card');
      [[120, -110], [150, -170], [90, -140]].forEach(([from, to], i) => {
        gsap.set(SC[i], { y: from + 'vh' });
        seg(s, SC[i], { y: '4.07vh', ease: 'power1.out' }, 15, 50);
        seg(s, SC[i], { y: to + 'vh', ease: 'power1.inOut' }, 50, 95);
      });
      triggers.push(s.scrollTrigger);

      /* ---------- 08 REVIEWS ---------- */
      const r = scene('.reviews', 2);
      const RP = $$('.reviews__panel'), RG = $$('.reviews__gap'), RI = RP.map(p => p.querySelector('img'));
      gsap.set(RI, { top: 0, bottom: 'auto' });
      r.eventCallback('onUpdate', () => RP.forEach((p, i) => { RI[i].style.transform = `translate3d(0,${-p.offsetTop}px,0)`; }));
      seg(r, '.reviews', { backgroundColor: 'rgba(255,255,255,1)', ease: 'power1.inOut' }, 5, 10);
      gsap.set('.reviews__wrapper', { y: '100vh' });
      seg(r, '.reviews__wrapper', { y: 0, ease: 'power1.inOut' }, 0, 15);
      seg(r, RP[0], { height: '94.45vh' }, 19, 20); seg(r, RG[0], { height: '1.85vh' }, 19, 20);
      seg(r, RP[0], { height: 0 }, 20, 40); seg(r, RP[1], { height: '94.45vh' }, 20, 40);
      seg(r, RP[1], { height: '96.3vh' }, 40, 41); seg(r, RG[0], { height: 0 }, 40, 41);
      seg(r, RP[1], { height: '94.45vh' }, 46, 47); seg(r, RG[1], { height: '1.85vh' }, 46, 47);
      seg(r, RP[1], { height: 0 }, 47, 67); seg(r, RP[2], { height: '94.45vh' }, 47, 67);
      seg(r, RP[2], { height: '96.3vh' }, 67, 68); seg(r, RG[1], { height: 0 }, 67, 68);
      seg(r, '.reviews__main-mask', { height: 0 }, 73, 98);
      const RC = $$('.reviews__card');
      gsap.set(RC[0], { y: '70vh' }); gsap.set([RC[1], RC[2]], { y: '120vh' });
      seg(r, RC[0], { y: 0, ease: 'power1.inOut' }, 0, 20); seg(r, RC[0], { y: '-95.59vh', ease: 'power1.inOut' }, 20, 41);
      seg(r, RC[1], { y: 0, ease: 'power1.inOut' }, 20, 46); seg(r, RC[1], { y: '-95.59vh', ease: 'power1.inOut' }, 46, 67);
      seg(r, RC[2], { y: 0, ease: 'power1.inOut' }, 47, 73); seg(r, RC[2], { y: '-95.59vh', ease: 'power1.inOut' }, 73, 98);
      triggers.push(r.scrollTrigger);
      // footer wrapper rises with the last part of reviews (smoothing 3)
      const rf = scene('.reviews', 3);
      gsap.set('.footer__wrapper', { y: '60vh' });
      seg(rf, '.footer__wrapper', { y: 0, ease: EASE }, 70, 100);
      triggers.push(rf.scrollTrigger);

      /* ---------- 09/10 FOOTER ---------- */
      const fp = gsap.timeline({ scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'top top', scrub: 2 } });
      fp.set({}, {}, 100);
      fp.fromTo('.footer__pompa', { rotation: -50 }, { rotation: -32, duration: 60, ease: 'power1.inOut' }, 20);
      const fb = gsap.timeline({ scrollTrigger: { trigger: '.footer', start: 'top 50%', end: 'top top', scrub: 2.5 } });
      fb.set({}, {}, 100);
      fb.fromTo('.footer__bg', { scale: 1, y: '10vh' }, { scale: 1.2, y: '-8vh', duration: 80, ease: 'power1.inOut' }, 0);
      triggers.push(fp.scrollTrigger, fb.scrollTrigger);

      ScrollTrigger.refresh();
    }

    return () => {
      clearTimeout(unlock); document.documentElement.style.overflow = ''; lenis.start();
      intro.kill();
      gsap.set(['.cover__mask', '.cover__media', '.cover__content', '.cover', '.route__row', '.route__device', '.numbers', '.intro__camera'], { clearProps: 'all' });
    };
  });

  /* =======================================================================
     ADAPTIVE ( ≤ 991px )
     ======================================================================= */
  mm.add('(max-width: 991px)', () => {
    // load reveal
    const lt = gsap.timeline({ delay: .2 });
    lt.from('.cover-adaptive__card', { scale: .94, borderRadius: '30vw', duration: 1.1, ease: EASE })
      .from('.cover-adaptive__title', { y: 40, opacity: 0, duration: .8, ease: EASE }, .5)
      .from('.cover-adaptive__subtitle', { y: 30, opacity: 0, duration: .8, ease: EASE }, .7)
      .from('.cover-adaptive__button', { y: 30, opacity: 0, duration: .8, ease: EASE }, .8)
      .from('.header__container', { y: -30, opacity: 0, duration: .8, ease: EASE }, .6);

    // route rows drift (alternating directions)
    $$('.route-adaptive__row').forEach((row, i) => {
      gsap.fromTo(row, { x: i % 2 ? '-8vw' : '8vw' }, { x: i % 2 ? '8vw' : '-8vw', ease: 'none', scrollTrigger: { trigger: '.route-adaptive', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });

    // device rotation (numbers) + footer device
    gsap.fromTo('.numbers-adaptive__device', { rotation: 0, y: 0 }, { rotation: -16, y: '-4vw', ease: 'none', scrollTrigger: { trigger: '.numbers-adaptive__device', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    gsap.fromTo('.footer-adaptive__device', { rotation: -24 }, { rotation: -10, ease: 'none', scrollTrigger: { trigger: '.footer-adaptive', start: 'top bottom', end: 'bottom bottom', scrub: 1.5 } });

    // generic reveals
    const rv = $$('.numbers-adaptive__title, .numbers-adaptive .numbers__card, .advantages-adaptive > .h3, .app-adaptive > .h3, .app-adaptive__phone, .steps-adaptive > .h3, .steps-adaptive .steps__card, .footer-adaptive__title');
    rv.forEach(el => gsap.from(el, { y: 50, opacity: 0, duration: .9, ease: EASE, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

    // sliders
    const sw = [];
    sw.push(new Swiper('.advantages-adaptive__slider', { slidesPerView: 1.12, spaceBetween: 8, speed: 600, breakpoints: { 768: { slidesPerView: 1.6, spaceBetween: 10 } } }));
    sw.push(new Swiper('.app-adaptive__slider', { slidesPerView: 1.12, spaceBetween: 8, speed: 600, breakpoints: { 768: { slidesPerView: 2.2, spaceBetween: 10 } } }));
    sw.push(new Swiper('.reviews-adaptive__slider', { slidesPerView: 1, spaceBetween: 8, speed: 700, pagination: { el: '.reviews-adaptive__bullets', clickable: true } }));

    const ml = $('.metrics-adaptive__lottie'), mTime = $('#mTime'), mIcon = $('.metrics-adaptive__ticon use');
    const times = [['07:00', 'sun'], ['09:00', 'eq'], ['11:00', 'anc'], ['13:00', 'spatial']];
    const fr = { v: 0 };
    const seekTo = idx => {
      let total = 0; try { total = ml.getLottie().totalFrames; } catch (e) { return; }
      gsap.to(fr, { v: (total - 1) * idx / 3, duration: .9, ease: 'power2.inOut', onUpdate: () => ml.seek(Math.round(fr.v)) });
    };
    sw.push(new Swiper('.metrics-adaptive__slider', {
      slidesPerView: 1, speed: 700, pagination: { el: '.metrics-adaptive__pagination', clickable: true },
      on: { slideChange(s) { const i = s.activeIndex; mTime.textContent = times[i][0]; mIcon.setAttribute('href', '#i-' + times[i][1]); seekTo(i); } }
    }));
    ml.addEventListener('ready', () => ml.seek(0));

    return () => { sw.forEach(s => s.destroy(true, true)); };
  });

  /* ---------- refresh once assets settle ---------- */
  window.addEventListener('load', () => { ScrollTrigger.refresh(); updateHeader(); });
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
