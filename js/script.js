/* ==========================================================================
   DEEP 608 — Presentation Engine
   Navigation, GSAP step animations, count-ups, trail line
   Rebuilt from scratch
   ========================================================================== */
(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────── */
  var SLIDE_DUR  = 0.55;
  var STEP_DUR   = 0.5;
  var HINT_DELAY = 4000;

  /* ── STATE ──────────────────────────────────────────────────────────── */
  var deck   = document.getElementById('deck');
  var slides = Array.from(deck.querySelectorAll('.slide'));
  var total  = slides.length;
  var cur    = 0;
  var step   = 0;
  var busy   = false;

  /* ── DOM ────────────────────────────────────────────────────────────── */
  var bar       = document.getElementById('progress-bar');
  var slideNum  = document.getElementById('slide-num');
  var stepTrack = document.getElementById('step-track');
  var keyHint   = document.getElementById('key-hint');
  var controls  = document.getElementById('controls');
  var btnPrev   = document.getElementById('btn-prev');
  var btnNext   = document.getElementById('btn-next');
  var btnFs     = document.getElementById('btn-fs');
  var sideNav   = document.getElementById('side-nav');

  /* ── BOOT ───────────────────────────────────────────────────────────── */
  buildSideNav();
  activate(0, 'none');
  bind();
  setTimeout(function () { if (keyHint) keyHint.classList.add('hidden'); }, HINT_DELAY);

  /* ── SIDE NAV ───────────────────────────────────────────────────────── */
  function buildSideNav() {
    slides.forEach(function (s, i) {
      var dot = document.createElement('button');
      dot.className = 'side-dot';
      dot.setAttribute('aria-label', 'Go to: ' + (s.dataset.sectionLabel || (i + 1)));
      dot.addEventListener('click', function (e) { e.stopPropagation(); jumpTo(i); });
      sideNav.appendChild(dot);
    });
  }

  function syncSideNav() {
    sideNav.querySelectorAll('.side-dot').forEach(function (d, i) {
      d.classList.toggle('active', i === cur);
    });
  }

  /* ── SLIDE ACTIVATION ───────────────────────────────────────────────── */
  function activate(idx, dir) {
    var oldSlide = slides[cur];
    var newSlide = slides[idx];
    cur  = idx;
    step = 0;

    resetSteps(newSlide);

    if (dir === 'none') {
      newSlide.classList.add('active');
      gsap.set(newSlide, { opacity: 1, x: 0 });
      entrance(newSlide);
    } else {
      var xOut = dir === 'fwd' ? -60 : 60;
      var xIn  = dir === 'fwd' ?  60 : -60;

      gsap.to(oldSlide, {
        opacity: 0, x: xOut,
        duration: SLIDE_DUR * 0.7,
        ease: 'power2.inOut',
        onComplete: function () {
          oldSlide.classList.remove('active');
          gsap.set(oldSlide, { opacity: 0, x: 0 });
        }
      });

      newSlide.classList.add('active');
      gsap.fromTo(newSlide,
        { opacity: 0, x: xIn },
        { opacity: 1, x: 0, duration: SLIDE_DUR, ease: 'power2.out',
          onComplete: function () { busy = false; }
        }
      );

      entrance(newSlide);
    }

    updateUI();
  }

  /* ── RESET STEPS ────────────────────────────────────────────────────── */
  function resetSteps(slide) {
    slide.querySelectorAll('[data-step]').forEach(function (el) {
      if (el.dataset.step !== '0') {
        gsap.killTweensOf(el);
        el.style.display = '';
      }
    });
    slide.querySelectorAll('.bar-fill').forEach(function (b) {
      gsap.set(b, { width: '0%' });
    });
  }

  /* ── ENTRANCE ANIMATION ─────────────────────────────────────────────── */
  function entrance(slide) {
    // Hero: special word-split animation
    if (slide.classList.contains('slide--hero')) {
      heroEntrance();
      return;
    }

    // Closing slide: animate title and body
    if (slide.classList.contains('slide--closing')) {
      var closingEls = Array.from(
        slide.querySelectorAll('.closing__title, .closing__body')
      );
      if (closingEls.length) {
        gsap.fromTo(closingEls,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.65, stagger: 0.12, ease: 'power2.out' }
        );
      }
      return;
    }

    // Standard slides: animate permanent headline/subhead
    var permanent = Array.from(
      slide.querySelectorAll('.headline, .subhead, .hero__eyebrow, .hero__subtitle, .hero__author')
    ).filter(function (el) { return !el.dataset.step || el.dataset.step === '0'; });

    if (permanent.length) {
      gsap.fromTo(permanent,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out' }
      );
    }

    // S4: count-up on entrance
    var s4stat = slide.querySelector('.big-stat.count-up:not([data-step])') ||
                 (slide === slides[3] ? slide.querySelector('.count-up') : null);
    if (slide === slides[3] && s4stat) countUp(s4stat);
  }

  /* ── HERO ENTRANCE ──────────────────────────────────────────────────── */
  function heroEntrance() {
    var titleEl = document.getElementById('hero-title');
    if (titleEl && !titleEl.querySelector('.hero-word')) {
      var words = titleEl.textContent.trim().split(' ');
      titleEl.innerHTML = words.map(function (w) {
        return '<span class="hero-word">' + w + '</span>';
      }).join(' ');
    }

    var tl = gsap.timeline();
    tl.from('.hero-word', { opacity: 0, y: 60, rotateX: -25, duration: 0.8, stagger: 0.08, ease: 'expo.out' })
      .from('.hero__subtitle', { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      .from('.hero__eyebrow', { opacity: 0, duration: 0.5 }, '-=0.4')
      .from('.hero__author', { opacity: 0, duration: 0.45 }, '-=0.3')
      .from('.hero__arrow', { opacity: 0, y: -10, duration: 0.4 }, '-=0.2');

    gsap.to('#hero-title', {
      textShadow: '0 0 100px rgba(226,168,18,0.45)',
      duration: 3, ease: 'power1.inOut', yoyo: true, repeat: -1
    });
  }

  /* ── STEP REVEAL ────────────────────────────────────────────────────── */
  function reveal(slide, num) {
    var els = Array.from(slide.querySelectorAll('[data-step="' + num + '"]'));
    if (!els.length) return;

    els.forEach(function (el, i) {
      var delay = i * 0.06;
      var anim  = animFor(el);
      gsap.fromTo(el,
        Object.assign({ display: displayFor(el) }, anim.from),
        { opacity: 1, x: 0, y: 0, scale: 1, duration: STEP_DUR, delay: delay, ease: anim.ease || 'power2.out' }
      );

      // Bar fills
      if (el.classList.contains('stat-bar-item')) {
        var fill = el.querySelector('.bar-fill');
        if (fill) gsap.to(fill, { width: (fill.dataset.width || 0) + '%', duration: 1.2, delay: delay + 0.1, ease: 'power2.out' });
      }

      // Count-ups
      if (el.classList.contains('count-up')) countUp(el);
    });

    // Trail line
    if (slide.querySelector('.trail')) growTrail(slide, num);
  }

  /* ── ANIMATION PROFILES ─────────────────────────────────────────────── */
  function animFor(el) {
    if (el.classList.contains('quote'))         return { from: { opacity: 0, y: 30 },           ease: 'power3.out' };
    if (el.classList.contains('punchline'))     return { from: { opacity: 0, y: 22 },           ease: 'power2.out' };
    if (el.classList.contains('big-stat'))      return { from: { opacity: 0, scale: 0.7 },      ease: 'back.out(1.6)' };
    if (el.classList.contains('pill'))          return { from: { opacity: 0, scale: 0.75, y: 10 }, ease: 'back.out(1.5)' };
    if (el.classList.contains('card'))          return { from: { opacity: 0, y: 28, scale: 0.96 }, ease: 'power2.out' };
    if (el.classList.contains('tool-card'))     return { from: { opacity: 0, y: 26, scale: 0.96 }, ease: 'power2.out' };
    if (el.classList.contains('cis-item'))      return { from: { opacity: 0, x: 50 },           ease: 'power3.out' };
    if (el.classList.contains('cis-reveal'))    return { from: { opacity: 0, scale: 0.8 },      ease: 'back.out(1.8)' };
    if (el.classList.contains('cp-card'))       return { from: { opacity: 0, scale: 0.8, y: 18 }, ease: 'back.out(1.4)' };
    if (el.classList.contains('cp-arrow'))      return { from: { opacity: 0, x: -14 },          ease: 'power2.out' };
    if (el.classList.contains('jenga__block'))  return { from: { opacity: 0, y: -50, scale: 0.95 }, ease: 'back.out(1.3)' };
    if (el.classList.contains('trail__stop'))   return { from: { opacity: 0, x: -35 },          ease: 'power2.out' };
    if (el.classList.contains('testimonial'))   return { from: { opacity: 0, y: 28 },           ease: 'power2.out' };
    if (el.classList.contains('stat-bar-item')) return { from: { opacity: 0, x: -22 },          ease: 'power2.out' };
    if (el.classList.contains('board-box'))     return { from: { opacity: 0, y: 20 },           ease: 'power2.out' };
    return { from: { opacity: 0, y: 22 } };
  }

  function displayFor(el) {
    if (el.classList.contains('cis-item'))      return 'flex';
    if (el.classList.contains('stat-bar-item')) return 'flex';
    if (el.classList.contains('jenga__block'))  return 'flex';
    if (el.classList.contains('cp-arrow'))      return 'flex';
    if (el.classList.contains('pill'))          return 'inline-flex';
    if (el.classList.contains('trail__stop'))   return 'grid';
    return 'block';
  }

  /* ── COUNT-UP ───────────────────────────────────────────────────────── */
  function countUp(el) {
    var target = parseInt(el.dataset.target, 10);
    var suffix = el.dataset.suffix || '';
    var counter = { val: 0 };
    gsap.to(counter, {
      val: target, duration: 2, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(counter.val) + suffix; },
      onComplete: function () {
        gsap.fromTo(el,
          { textShadow: '0 0 0px transparent' },
          { textShadow: '0 0 60px rgba(226,168,18,0.5)', duration: 0.35, yoyo: true, repeat: 1 }
        );
      }
    });
  }

  /* ── TRAIL LINE ─────────────────────────────────────────────────────── */
  function growTrail(slide, revealedStep) {
    var line = document.getElementById('trail-line');
    var stops = Array.from(slide.querySelectorAll('.trail__stop'));
    var last = null;
    stops.forEach(function (s) {
      if (parseInt(s.dataset.step || 0, 10) <= revealedStep) last = s;
    });
    if (!line || !last) return;

    var timeline = slide.querySelector('.trail');
    var tR = timeline.getBoundingClientRect();
    var dR = last.getBoundingClientRect();
    var h  = dR.top - tR.top + 22;

    gsap.to(line, { height: Math.max(0, h) + 'px', duration: 0.6, ease: 'power2.out' });

    var dot = last.querySelector('.trail__dot');
    if (dot) gsap.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.5)', delay: 0.1 });
  }

  /* ── HIDE STEP ──────────────────────────────────────────────────────── */
  function hide(slide, num) {
    var els = Array.from(slide.querySelectorAll('[data-step="' + num + '"]'));
    gsap.to(els, {
      opacity: 0, y: 12, duration: 0.25, ease: 'power2.in',
      onComplete: function () { els.forEach(function (el) { el.style.display = ''; }); }
    });
    if (slide.querySelector('.trail') && num > 0) growTrail(slide, num - 1);
  }

  /* ── NAVIGATION ─────────────────────────────────────────────────────── */
  function maxStep(slide) {
    var m = 0;
    slide.querySelectorAll('[data-step]').forEach(function (el) {
      var s = parseInt(el.dataset.step, 10);
      if (s > m) m = s;
    });
    return m;
  }

  function advance() {
    if (busy) return;
    var ms = maxStep(slides[cur]);
    if (step < ms) {
      step++;
      reveal(slides[cur], step);
      updateUI();
    } else if (cur < total - 1) {
      busy = true;
      activate(cur + 1, 'fwd');
    }
  }

  function retreat() {
    if (busy) return;
    if (step > 0) {
      hide(slides[cur], step);
      step--;
      updateUI();
    } else if (cur > 0) {
      busy = true;
      activate(cur - 1, 'back');
    }
  }

  function jumpTo(idx) {
    if (busy || idx === cur) return;
    busy = true;
    activate(idx, idx > cur ? 'fwd' : 'back');
  }

  /* ── UI UPDATE ──────────────────────────────────────────────────────── */
  function updateUI() {
    var pct = total > 1 ? (cur / (total - 1)) * 100 : 100;
    bar.style.width = pct + '%';

    var n = String(cur + 1);
    slideNum.textContent = (n.length < 2 ? '0' + n : n) + ' / ' + (total < 10 ? '0' + total : total);

    var ms = maxStep(slides[cur]);
    stepTrack.innerHTML = '';
    if (ms > 0) {
      for (var i = 1; i <= ms; i++) {
        var pip = document.createElement('div');
        pip.className = 'step-pip' + (i < step ? ' done' : i === step ? ' current' : '');
        stepTrack.appendChild(pip);
      }
    }

    syncSideNav();
    btnPrev.disabled = (cur === 0 && step === 0);
    btnNext.disabled = (cur === total - 1 && step === maxStep(slides[cur]));
  }

  /* ── EVENTS ─────────────────────────────────────────────────────────── */
  function bind() {
    document.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter':
          e.preventDefault(); advance(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'Backspace': case 'PageUp':
          e.preventDefault(); retreat(); break;
        case 'f': case 'F':
          toggleFS(); break;
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen(); break;
      }
    });

    deck.addEventListener('click', function (e) {
      if (e.target.closest('button, a, input, [role="button"]')) return;
      advance();
    });

    btnPrev.addEventListener('click', function (e) { e.stopPropagation(); retreat(); });
    btnNext.addEventListener('click', function (e) { e.stopPropagation(); advance(); });
    btnFs.addEventListener('click', function (e) { e.stopPropagation(); toggleFS(); });

    // Touch
    var tx = 0, ty = 0;
    deck.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx < 0) advance(); else retreat();
      }
    }, { passive: true });

    // Auto-hide controls in fullscreen
    var ht;
    document.addEventListener('mousemove', function () {
      controls.classList.remove('hide');
      clearTimeout(ht);
      ht = setTimeout(function () {
        if (document.fullscreenElement) controls.classList.add('hide');
      }, 3000);
    });
  }

  function toggleFS() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen();
    }
  }

})();
