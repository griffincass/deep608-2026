/* ============================================================
   CMDB or It Didn't Happen — Presentation Engine
   Click / keyboard / swipe navigation, GSAP animations
   ============================================================ */
(function () {
  'use strict';

  /* ── CONFIG ───────────────────────────────────────────── */
  const SLIDE_DUR  = 0.5;   // slide transition seconds
  const STEP_DUR   = 0.55;  // step reveal seconds
  const HINT_DELAY = 4000;  // ms before hint fades

  /* ── STATE ────────────────────────────────────────────── */
  const deck   = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const total  = slides.length;
  let cur  = 0;   // active slide index
  let step = 0;   // active step within slide
  let busy = false;

  /* ── DOM REFS ─────────────────────────────────────────── */
  const bar        = document.getElementById('progress-bar');
  const slideNum   = document.getElementById('slide-num');
  const stepTrack  = document.getElementById('step-track');
  const keyHint    = document.getElementById('key-hint');
  const controls   = document.getElementById('controls');
  const btnPrev    = document.getElementById('btn-prev');
  const btnNext    = document.getElementById('btn-next');
  const btnFs      = document.getElementById('btn-fs');
  const sideNav    = document.getElementById('side-nav');

  /* ── BOOT ─────────────────────────────────────────────── */
  buildSideNav();
  activateSlide(0, 'none');
  bindEvents();
  autoHideHint();

  /* ── SIDE NAV ─────────────────────────────────────────── */
  function buildSideNav() {
    slides.forEach(function (s, i) {
      var dot = document.createElement('button');
      dot.className = 'side-dot';
      dot.setAttribute('aria-label', 'Go to: ' + (s.dataset.sectionLabel || (i + 1)));
      dot.addEventListener('click', function (e) {
        e.stopPropagation();
        jumpTo(i);
      });
      sideNav.appendChild(dot);
    });
  }

  function updateSideNav() {
    sideNav.querySelectorAll('.side-dot').forEach(function (d, i) {
      d.classList.toggle('active', i === cur);
    });
  }

  /* ── SLIDE ACTIVATION ─────────────────────────────────── */
  // dir: 'none' | 'forward' | 'back'
  function activateSlide(idx, dir) {
    var oldSlide = slides[cur];
    var newSlide = slides[idx];
    cur  = idx;
    step = 0;

    // Ensure all step-elements start invisible on this slide
    resetSteps(newSlide);

    // Transition
    if (dir === 'none') {
      // Initial load — no animation
      newSlide.classList.add('active');
      gsap.set(newSlide, { opacity: 1, x: 0 });
      playEntrance(newSlide);
    } else {
      var xOut = dir === 'forward' ? -50 : 50;
      var xIn  = dir === 'forward' ?  50 : -50;

      // Exit old
      gsap.to(oldSlide, {
        opacity: 0, x: xOut,
        duration: SLIDE_DUR * 0.8,
        ease: 'power2.inOut',
        onComplete: function () {
          oldSlide.classList.remove('active');
          gsap.set(oldSlide, { opacity: 0, x: 0 });
        },
      });

      // Enter new
      newSlide.classList.add('active');
      gsap.fromTo(newSlide,
        { opacity: 0, x: xIn },
        {
          opacity: 1, x: 0,
          duration: SLIDE_DUR,
          ease: 'power2.out',
          onComplete: function () { busy = false; },
        }
      );

      playEntrance(newSlide);
    }

    updateUI();
  }

  // Reset all data-step>0 elements — remove from layout entirely
  function resetSteps(slide) {
    slide.querySelectorAll('[data-step]').forEach(function (el) {
      if (el.dataset.step !== '0') {
        gsap.killTweensOf(el);
        el.style.display = '';  // clear inline style → CSS display:none takes over
      }
    });
    // Reset bars
    slide.querySelectorAll('.bar-fill').forEach(function (b) {
      gsap.set(b, { width: '0%' });
    });
  }

  // Return the right display value to restore when revealing an element
  function getDisplay(el) {
    if (el.classList.contains('cis-item'))      return 'flex';
    if (el.classList.contains('stat-bar-item')) return 'flex';
    if (el.classList.contains('jenga-block'))   return 'flex';
    if (el.classList.contains('cp-arrow'))      return 'flex';
    if (el.classList.contains('pill'))          return 'inline-flex';
    if (el.classList.contains('trail-stop'))    return 'grid';
    return 'block';
  }

  // Animate entrance of step-0 (permanent) content
  function playEntrance(slide) {
    // Hero slide: word-split title
    if (slide.id === 's1') {
      playHeroEntrance();
      return;
    }

    // Collect permanent elements (no data-step or data-step="0")
    var permanent = Array.from(
      slide.querySelectorAll('.section-headline, .section-sub, .hero-eyebrow, #hero-subtitle, .hero-author')
    ).filter(function (el) { return !el.dataset.step || el.dataset.step === '0'; });

    if (permanent.length) {
      gsap.fromTo(permanent,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' }
      );
    }

    // S4: count-up the big stat on entrance
    if (slide.id === 's4') {
      var statEl = slide.querySelector('.count-up');
      if (statEl) doCountUp(statEl);
    }
  }

  /* ── HERO ENTRANCE ────────────────────────────────────── */
  function playHeroEntrance() {
    var titleEl = document.getElementById('hero-title');
    if (titleEl && !titleEl.querySelector('.hero-word')) {
      // Split into words on first entrance
      var words = titleEl.textContent.trim().split(' ');
      titleEl.innerHTML = words.map(function (w) {
        return '<span class="hero-word">' + w + '</span>';
      }).join(' ');
    }

    var tl = gsap.timeline();
    tl.from('.hero-word', { opacity: 0, y: 50, rotateX: -20, duration: 0.75, stagger: 0.1, ease: 'expo.out' })
      .from('#hero-subtitle',  { opacity: 0, y: 18, duration: 0.65, ease: 'power2.out' }, '-=0.3')
      .from('.hero-eyebrow',   { opacity: 0, duration: 0.5 }, '-=0.45')
      .from('.hero-author',    { opacity: 0, duration: 0.45 }, '-=0.35')
      .from('.scroll-arrow',   { opacity: 0, y: -8, duration: 0.4 }, '-=0.2');

    // Ambient title glow
    gsap.to('#hero-title', {
      textShadow: '0 0 80px rgba(212,160,23,0.5)',
      duration: 2.5, ease: 'power1.inOut', yoyo: true, repeat: -1,
    });
  }

  /* ── STEP REVEAL ──────────────────────────────────────── */
  function revealStep(slide, stepNum) {
    var els = Array.from(slide.querySelectorAll('[data-step="' + stepNum + '"]'));
    if (!els.length) return;

    els.forEach(function (el, i) {
      var delay = i * 0.07;
      var anim  = getAnimVars(el);
      var fromVars = Object.assign({ display: getDisplay(el) }, anim.from);

      gsap.fromTo(el, fromVars, {
        opacity: 1, x: 0, y: 0, scale: 1,
        duration: STEP_DUR,
        delay: delay,
        ease: anim.ease || 'power2.out',
      });

      // Bar fill
      if (el.classList.contains('stat-bar-item')) {
        var fill = el.querySelector('.bar-fill');
        if (fill) {
          gsap.to(fill, {
            width: (fill.dataset.width || 0) + '%',
            duration: 1.2,
            delay: delay + 0.1,
            ease: 'power2.out',
          });
        }
      }

      // Count-up on stats revealed in this step
      if (el.classList.contains('count-up')) {
        doCountUp(el);
      }
    });

    // Trail line grow when a trail-stop is revealed
    if (slide.id === 's17') {
      growTrailLine(slide, stepNum);
    }
  }

  /* ── ANIMATION PROFILES ───────────────────────────────── */
  function getAnimVars(el) {
    if (el.classList.contains('big-quote'))    return { from: { opacity: 0, y: 28 },            ease: 'power3.out' };
    if (el.classList.contains('big-punchline'))return { from: { opacity: 0, y: 20 },            ease: 'power2.out' };
    if (el.classList.contains('big-stat'))     return { from: { opacity: 0, scale: 0.72 },      ease: 'back.out(1.6)' };
    if (el.classList.contains('pill'))         return { from: { opacity: 0, scale: 0.75, y: 10 },ease: 'back.out(1.5)' };
    if (el.classList.contains('card'))         return { from: { opacity: 0, y: 28, scale: 0.95 },ease: 'power2.out' };
    if (el.classList.contains('tool-card'))    return { from: { opacity: 0, y: 24, scale: 0.95 },ease: 'power2.out' };
    if (el.classList.contains('cis-item'))     return { from: { opacity: 0, x: 48 },            ease: 'power3.out' };
    if (el.classList.contains('cis-tada'))     return { from: { opacity: 0, scale: 0.8 },       ease: 'back.out(1.8)' };
    if (el.classList.contains('cp-card'))      return { from: { opacity: 0, scale: 0.8, y: 16 },ease: 'back.out(1.4)' };
    if (el.classList.contains('cp-arrow'))     return { from: { opacity: 0, x: -12 },           ease: 'power2.out' };
    if (el.classList.contains('jenga-block'))  return { from: { opacity: 0, y: -45, scale: 0.95 },ease: 'back.out(1.3)' };
    if (el.classList.contains('trail-stop'))   return { from: { opacity: 0, x: -30 },           ease: 'power2.out' };
    if (el.classList.contains('testimonial'))  return { from: { opacity: 0, y: 26 },            ease: 'power2.out' };
    if (el.classList.contains('stat-bar-item'))return { from: { opacity: 0, x: -20 },           ease: 'power2.out' };
    if (el.classList.contains('board-template'))return { from: { opacity: 0, y: 18 },           ease: 'power2.out' };
    return { from: { opacity: 0, y: 20 } };
  }

  /* ── COUNT-UP ─────────────────────────────────────────── */
  function doCountUp(el) {
    var target = parseInt(el.dataset.target, 10);
    var suffix = el.dataset.suffix || '';
    var counter = { val: 0 };
    gsap.to(counter, {
      val: target, duration: 1.8, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(counter.val) + suffix; },
      onComplete: function () {
        gsap.fromTo(el,
          { textShadow: '0 0 0px transparent' },
          { textShadow: '0 0 50px rgba(212,160,23,0.55)', duration: 0.3, yoyo: true, repeat: 1 }
        );
      },
    });
  }

  /* ── TRAIL LINE ───────────────────────────────────────── */
  function growTrailLine(slide, revealedStep) {
    var line      = document.getElementById('trail-line');
    var stops     = Array.from(slide.querySelectorAll('.trail-stop'));
    var lastDot   = null;
    // Find the last stop that's now visible (step <= revealedStep)
    stops.forEach(function (stop) {
      if (parseInt(stop.dataset.step || 0, 10) <= revealedStep) lastDot = stop;
    });
    if (!line || !lastDot) return;

    var timeline = slide.querySelector('.trail-timeline');
    var tRect    = timeline.getBoundingClientRect();
    var dRect    = lastDot.getBoundingClientRect();
    var targetH  = dRect.top - tRect.top + 22;

    gsap.to(line, { height: Math.max(0, targetH) + 'px', duration: 0.6, ease: 'power2.out' });

    // Pop the dot
    var dot = lastDot.querySelector('.stop-dot');
    if (dot) gsap.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.5)', delay: 0.1 });
  }

  /* ── HIDE A STEP (go back within slide) ───────────────── */
  function hideStep(slide, stepNum) {
    var els = Array.from(slide.querySelectorAll('[data-step="' + stepNum + '"]'));
    gsap.to(els, {
      opacity: 0, y: 10, duration: 0.3, ease: 'power2.in',
      onComplete: function () {
        els.forEach(function (el) {
          el.style.display = ''; // CSS display:none retakes effect
        });
      },
    });

    // Shrink trail line if needed
    if (slide.id === 's17' && stepNum > 0) {
      growTrailLine(slide, stepNum - 1);
    }
  }

  /* ── JUMP TO SLIDE (side-nav / overview) ─────────────── */
  function jumpTo(idx) {
    if (busy || idx === cur) return;
    busy = true;
    var dir = idx > cur ? 'forward' : 'back';
    activateSlide(idx, dir);
  }

  /* ── ADVANCE / RETREAT ────────────────────────────────── */
  function advance() {
    if (busy) return;
    var maxStep = getMaxStep(slides[cur]);
    if (step < maxStep) {
      step++;
      revealStep(slides[cur], step);
      updateUI();
    } else if (cur < total - 1) {
      busy = true;
      activateSlide(cur + 1, 'forward');
    }
  }

  function retreat() {
    if (busy) return;
    if (step > 0) {
      hideStep(slides[cur], step);
      step--;
      updateUI();
    } else if (cur > 0) {
      busy = true;
      activateSlide(cur - 1, 'back');
    }
  }

  /* ── MAX STEP FOR A SLIDE ─────────────────────────────── */
  function getMaxStep(slide) {
    var max = 0;
    slide.querySelectorAll('[data-step]').forEach(function (el) {
      var s = parseInt(el.dataset.step, 10);
      if (s > max) max = s;
    });
    return max;
  }

  /* ── UI UPDATES ───────────────────────────────────────── */
  function updateUI() {
    // Progress bar
    var progress = total > 1 ? (cur / (total - 1)) * 100 : 100;
    bar.style.width = progress + '%';

    // Slide counter
    slideNum.textContent = (cur + 1) + ' / ' + total;

    // Step pips
    var maxS = getMaxStep(slides[cur]);
    stepTrack.innerHTML = '';
    if (maxS > 0) {
      for (var i = 1; i <= maxS; i++) {
        var pip = document.createElement('div');
        pip.className = 'step-pip' + (i < step ? ' done' : i === step ? ' current' : '');
        stepTrack.appendChild(pip);
      }
    }

    // Side nav
    updateSideNav();

    // Button states
    btnPrev.disabled = (cur === 0 && step === 0);
    btnNext.disabled = (cur === total - 1 && step === getMaxStep(slides[cur]));
  }

  /* ── AUTO-HIDE HINT ───────────────────────────────────── */
  function autoHideHint() {
    setTimeout(function () {
      if (keyHint) keyHint.classList.add('hidden');
    }, HINT_DELAY);
  }

  /* ── EVENT BINDINGS ───────────────────────────────────── */
  function bindEvents() {
    // Keyboard
    document.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter':
          e.preventDefault(); advance(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'Backspace': case 'PageUp':
          e.preventDefault(); retreat(); break;
        case 'f': case 'F':
          toggleFullscreen(); break;
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen(); break;
      }
    });

    // Click to advance (anywhere on deck)
    deck.addEventListener('click', function (e) {
      // Ignore clicks on interactive elements
      if (e.target.closest('button, a, input, [role="button"]')) return;
      advance();
    });

    // Control buttons
    btnPrev.addEventListener('click', function (e) { e.stopPropagation(); retreat(); });
    btnNext.addEventListener('click', function (e) { e.stopPropagation(); advance(); });
    btnFs.addEventListener('click',   function (e) { e.stopPropagation(); toggleFullscreen(); });

    // Touch / swipe
    var touchStartX = 0;
    var touchStartY = 0;
    deck.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx < 0) advance(); else retreat();
      }
    }, { passive: true });

    // Auto-hide controls when mouse is idle
    var hideTimer;
    document.addEventListener('mousemove', function () {
      controls.classList.remove('hide');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!document.fullscreenElement) return;
        controls.classList.add('hide');
      }, 3000);
    });
  }

  /* ── FULLSCREEN ───────────────────────────────────────── */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen();
    }
  }

})();
