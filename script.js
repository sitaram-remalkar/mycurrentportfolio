// "In Focus" — progressive enhancement only. The page works fully without this file.
(function () {
  'use strict';
  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Theme toggle ---------- */
  var themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    var isDark = function () {
      return root.dataset.theme ? root.dataset.theme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    var syncTheme = function () { themeBtn.setAttribute('aria-pressed', String(isDark())); };
    themeBtn.hidden = false;
    syncTheme();
    themeBtn.addEventListener('click', function () {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      syncTheme();
    });
  }

  /* ---------- Count-up numbers ---------- */
  function countUp() {
    document.querySelectorAll('.count').forEach(function (el) {
      var to = parseInt(el.dataset.to, 10);
      if (reduceMotion || !to) { el.textContent = to; return; }
      var start = null, dur = 1100;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }

  /* ---------- Hero: focus pull ---------- */
  var hero = document.querySelector('.hero');
  var afText = document.querySelector('.af-text');
  if (hero && !reduceMotion) {
    hero.querySelectorAll('.headline .w').forEach(function (w, i) { w.style.setProperty('--i', i); });
    hero.classList.add('animate');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.add('pulling'); });
    });
    setTimeout(function () {
      hero.classList.add('locked');
      if (afText) afText.textContent = 'AF · LOCK';
      countUp();
    }, 1500);
    setTimeout(function () { hero.classList.add('done'); }, 2600);
  }

  /* ---------- Scroll reveal (rack focus) ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }
  // Never leave content hidden if someone jumps straight to a section.
  window.addEventListener('hashchange', function () {
    var t = document.querySelector(location.hash);
    if (t && t.classList.contains('reveal')) t.classList.add('in');
  });

  /* ---------- Current section in nav ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-list a'));
  if ('IntersectionObserver' in window && links.length) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var no = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map[e.target.id];
        if (a && e.isIntersecting) {
          links.forEach(function (l) { l.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) no.observe(el); });
  }

  /* ---------- AF ring follows keyboard focus ---------- */
  var ring = document.querySelector('.af-ring');
  var usingKeyboard = false;
  document.addEventListener('keydown', function (e) { if (e.key === 'Tab') usingKeyboard = true; });
  document.addEventListener('mousedown', function () { usingKeyboard = false; if (ring) ring.classList.remove('on'); });
  function placeRing(el) {
    if (!ring || !el || el === body || el.id === 'main') return;
    var r = el.getBoundingClientRect(), pad = 7;
    ring.style.left = (r.left + window.scrollX - pad) + 'px';
    ring.style.top = (r.top + window.scrollY - pad) + 'px';
    ring.style.width = (r.width + pad * 2) + 'px';
    ring.style.height = (r.height + pad * 2) + 'px';
    ring.classList.add('on');
  }
  document.addEventListener('focusin', function (e) { if (usingKeyboard) placeRing(e.target); });
  document.addEventListener('focusout', function () { if (ring) ring.classList.remove('on'); });

  /* ---------- View-as dock ---------- */
  var dock = document.querySelector('.dock');
  if (!dock) return;
  var toggle = dock.querySelector('.dock-toggle');
  var panel = dock.querySelector('.dock-panel');
  var note = dock.querySelector('.dock-note');
  var current = dock.querySelector('.dock-current');
  var page = document.getElementById('page');
  dock.hidden = false;

  var notes = {
    'default': "You're seeing the page as most sighted mouse users do.",
    'low-vision': 'Simulating blurred vision. Large type, strong contrast and generous spacing keep this page readable even now.',
    'colour-blind': 'Simulating deuteranopia (red–green colour blindness, about 1 in 12 men). No information here relies on colour alone.',
    'keyboard': 'The mouse is hidden. Press Tab to move through the page — the numbers show the order, and the blue brackets follow your focus.',
    'screen-reader': 'Showing what a screen reader announces: landmarks (orange) and the heading outline (purple) that people use to navigate.'
  };
  var labels = { 'default': 'Default', 'low-vision': 'Low vision', 'colour-blind': 'Colour blind', 'keyboard': 'Keyboard', 'screen-reader': 'Screen reader' };

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) { var c = panel.querySelector('input:checked'); if (c) c.focus(); }
  }
  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  document.querySelectorAll('[data-open-dock]').forEach(function (b) {
    b.addEventListener('click', function () { setOpen(true); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });

  /* keyboard mode: number every focusable element in tab order */
  var badges = [];
  function clearBadges() { badges.forEach(function (b) { b.remove(); }); badges = []; }
  function drawTabBadges() {
    clearBadges();
    var focusables = page.querySelectorAll('a[href], button:not([hidden]), [tabindex="0"]');
    var n = 0;
    focusables.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      n += 1;
      var b = document.createElement('span');
      b.className = 'tab-badge'; b.setAttribute('aria-hidden', 'true'); b.textContent = n;
      b.style.left = (r.left + window.scrollX - 10) + 'px';
      b.style.top = (r.top + window.scrollY - 10) + 'px';
      body.appendChild(b); badges.push(b);
    });
  }

  /* screen-reader mode: label landmarks, headings and images */
  var srBadges = [];
  function clearSr() { srBadges.forEach(function (b) { b.remove(); }); srBadges = []; }
  function addSr(target, text, cls) {
    var b = document.createElement('span');
    b.className = 'sr-badge' + (cls ? ' ' + cls : ''); b.setAttribute('aria-hidden', 'true'); b.textContent = text;
    target.insertBefore(b, target.firstChild); srBadges.push(b);
  }
  function drawSr() {
    clearSr();
    page.querySelectorAll('[data-sr]').forEach(function (el) {
      var host = el.querySelector('.wrap') || el;
      addSr(host, el.dataset.sr + ' landmark', 'land');
    });
    page.querySelectorAll('h1, h2, h3').forEach(function (h) { addSr(h, 'heading ' + h.tagName.slice(1)); });
    page.querySelectorAll('[role="img"][aria-label], img[alt]').forEach(function (img) {
      var fig = img.closest('figure');
      var cap = fig ? fig.querySelector('figcaption') : null;
      if (cap) addSr(cap, 'image: "' + (img.getAttribute('aria-label') || img.alt) + '"');
    });
  }

  var mode = 'default';
  function applySim(next) {
    mode = next;
    clearBadges(); clearSr();
    if (mode === 'default') body.removeAttribute('data-sim'); else body.dataset.sim = mode;
    if (mode === 'keyboard') drawTabBadges();
    if (mode === 'screen-reader') drawSr();
    if (mode === 'low-vision' || mode === 'screen-reader') {
      // show the effect on content, not on an empty hero background
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
    note.textContent = notes[mode];
    current.textContent = labels[mode];
  }
  panel.addEventListener('change', function (e) { if (e.target.name === 'sim') applySim(e.target.value); });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (mode === 'keyboard') drawTabBadges(); }, 150);
  });
})();
