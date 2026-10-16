/* Lenis, ScrollTrigger, общие появления, шкала часа, шапка, интро «Вдох», hero,
   манифест, оглавление практик, печать в стоимости, путь до площадки. */
(function () {
  'use strict';
  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  var TC = window.TC = window.TC || {};

  function endIntro() {
    html.classList.remove('intro');
    try { sessionStorage.setItem('tc-intro', '1'); } catch (e) {}
    document.dispatchEvent(new Event('tc:ready'));
  }

  // без GSAP (CDN недоступен) — просто показываем страницу как есть
  if (!window.gsap || !window.ScrollTrigger) {
    html.classList.add('rm');
    endIntro();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);
  if (!RM) html.classList.add('anim');

  // ——— Lenis: намеренно мягкий скролл ———
  var lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  TC.lenis = window.__lenis = lenis;
  TC.scrollTo = function (target) {
    if (lenis) lenis.scrollTo(target, { duration: 2.2, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
    else {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
      else window.scrollTo(0, 0);
    }
  };

  // якоря
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var el = id === '#top' ? document.body : document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    TC.scrollTo(id === '#top' ? 0 : el);
    if (history.replaceState) history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
  });

  // ——— шапка: прячется вниз, появляется вверх ———
  var hdr = document.getElementById('hdr');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (s) {
      var y = s.scroll();
      hdr.classList.toggle('is-scrolled', y > 20);
      if (menuOpen) return;
      if (y < 120) hdr.classList.remove('is-hidden');
      else if (s.direction === 1) hdr.classList.add('is-hidden');
      else hdr.classList.remove('is-hidden');
      document.body.classList.toggle('hdr-off', hdr.classList.contains('is-hidden'));
    }
  });
  // фокус с клавиатуры всегда возвращает шапку
  hdr.addEventListener('focusin', function () { hdr.classList.remove('is-hidden'); });

  // мобильное меню
  var burger = document.querySelector('.hdr-burger');
  var menu = document.getElementById('menu');
  var menuOpen = false;
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false; menu.hidden = true; burger.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', function () {
    if (menuOpen) return closeMenu();
    menuOpen = true; menu.hidden = false; burger.setAttribute('aria-expanded', 'true');
    hdr.classList.remove('is-hidden');
    if (lenis) lenis.stop();
    gsap.fromTo(menu.querySelectorAll('nav a, .btn, .menu-tel'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: .06, ease: 'power3.out' });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', function () { if (innerWidth >= 1024) closeMenu(); });

  // ——— шкала часа: 08:00 вверху страницы, 09:00 в футере ———
  var hour = document.getElementById('hour');
  var fill = hour.querySelector('.hour-fill');
  var now = hour.querySelector('.hour-now');
  var nowText = now.querySelector('b');
  var track = hour.querySelector('.hour-track');
  var lastMin = -1, trackLen = 0, vertical = true;
  function measure() {
    vertical = innerWidth >= 1024;
    trackLen = vertical ? track.offsetHeight : track.offsetWidth;
  }
  function fmt(m) { return '0' + Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function setTime(p) {
    if (p > .985) p = 1; // у самого низа — ровно 09:00
    var m = 8 * 60 + Math.round(p * 60);
    if (vertical) {
      fill.style.transform = 'scaleY(' + p + ')';
      now.style.transform = 'translateY(' + (p * trackLen - 6) + 'px)';
    } else {
      fill.style.transform = 'scaleX(' + p + ')';
      now.style.transform = '';
    }
    if (m !== lastMin) { lastMin = m; nowText.textContent = fmt(m); }
    hour.classList.toggle('at-start', p < .03);
    hour.classList.toggle('at-end', p > .97);
  }
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { setTime(s.progress); }, onRefresh: function (s) { setTime(s.progress); } });

  // минуты в подписях секций — где на шкале часа стоит секция
  function stampMinutes() {
    var max = ScrollTrigger.maxScroll(window) || 1;
    document.querySelectorAll('[data-minute]').forEach(function (el) {
      var sec = el.closest('section, footer');
      if (!sec || sec.id === 'hero') return;
      var top = sec.getBoundingClientRect().top + window.scrollY;
      var p = Math.min(1, Math.max(0, top / max));
      el.textContent = fmt(8 * 60 + Math.round(p * 60));
    });
  }
  ScrollTrigger.addEventListener('refresh', stampMinutes);

  // шкала светлеет над тёмными секциями
  document.querySelectorAll('.dark').forEach(function (sec) {
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: document.body, className: 'on-dark' } });
  });

  // ——— общие появления: медленнее обычного ———
  if (!RM) {
    var rv = gsap.utils.toArray('[data-rv]').filter(function (el) { return !el.closest('.hero'); });
    ScrollTrigger.batch(rv, {
      start: 'top 88%', once: true,
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: .12, overwrite: true }); }
    });
  }

  // ——— манифест: слова проявляются по одному ———
  var mtext = document.querySelector('[data-words]');
  if (mtext) {
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { var s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.classList.contains('mark')) {
          ch.classList.add('w');
        }
      });
    })(mtext);
    if (!RM) {
      var words = mtext.querySelectorAll('.w');
      var tl = gsap.timeline({ scrollTrigger: { trigger: mtext, start: 'top 75%', end: 'bottom 40%', scrub: 1.2 } });
      tl.to(words, { opacity: 1, ease: 'none', stagger: .1, duration: .3 });
      mtext.querySelectorAll('.mark').forEach(function (mk) {
        var idx = Array.prototype.indexOf.call(words, mk);
        tl.set(mk.querySelector('path'), { opacity: 1 }, idx * .1 + .15)
          .to(mk.querySelector('path'), { strokeDashoffset: 0, ease: 'sine.inOut', duration: .5 }, idx * .1 + .15);
      });
    }
  }

  // ——— оглавление практик: hover / тап раскрывает строку ———
  var toc = document.querySelector('.toc');
  if (toc) {
    var rows = toc.querySelectorAll('.toc-row');
    var hoverable = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var openRow = null;
    function setOpen(row) {
      if (row === openRow) return;
      rows.forEach(function (r) {
        var on = r === row;
        r.classList.toggle('is-open', on);
        r.querySelector('.toc-btn').setAttribute('aria-expanded', on ? 'true' : 'false');
        var body = r.querySelector('.toc-body');
        if (RM) { body.style.height = on ? 'auto' : '0px'; return; }
        gsap.to(body, { height: on ? 'auto' : 0, duration: on ? .9 : .7, ease: on ? 'expo.out' : 'power3.inOut', overwrite: true });
      });
      toc.classList.toggle('has-open', !!row);
      openRow = row;
    }
    rows.forEach(function (r) {
      var btn = r.querySelector('.toc-btn');
      // с мышью строку уже раскрыл hover — клик её не схлопывает
      btn.addEventListener('click', function () { setOpen(hoverable ? r : openRow === r ? null : r); });
      if (hoverable) r.addEventListener('mouseenter', function () { setOpen(r); });
    });
    if (hoverable) toc.addEventListener('mouseleave', function () { setOpen(null); });
    if (RM) rows.forEach(function (r) { r.querySelector('.toc-body').style.height = '0px'; });
  }

  // ——— учитель: раскрытие круглой маски (триггер — фигура, а не элемент с clip-path) ———
  var ring = document.querySelector('.teacher-ring');
  if (ring && !RM) {
    gsap.to(ring, { clipPath: 'circle(50% at 50% 50%)', duration: 2.4, ease: 'power2.inOut', scrollTrigger: { trigger: '.teacher-photo', start: 'top 78%', once: true } });
    gsap.fromTo('.teacher-ring img', { scale: 1.18 }, { scale: 1.04, duration: 3.2, ease: 'power2.out', scrollTrigger: { trigger: '.teacher-photo', start: 'top 78%', once: true } });
    gsap.from('.teacher-seal', { opacity: 0, scale: 1.4, rotate: -10, duration: 1.2, ease: 'back.out(2)', delay: 1.6, scrollTrigger: { trigger: '.teacher-photo', start: 'top 78%', once: true } });
  }

  // ——— стоимость: печать впечатывается ———
  if (!RM) {
    gsap.fromTo('.stamp', { scale: 1.4, rotate: -8, opacity: 0 }, { scale: 1, rotate: -3, opacity: 1, duration: 1.3, ease: 'back.out(2)', scrollTrigger: { trigger: '.price-seal', start: 'top 80%', once: true } });
  }

  // ——— путь до площадки: пунктир рисуется со скроллом ———
  var sline = document.querySelector('.steps-line');
  if (sline && !RM) {
    var mqMob = matchMedia('(max-width: 760px)');
    gsap.fromTo(sline, { clipPath: function () { return mqMob.matches ? 'inset(0% 0% 100% 0%)' : 'inset(0% 100% 0% 0%)'; } }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: '.steps-wrap', start: 'top 75%', end: 'bottom 55%', scrub: 1.2, invalidateOnRefresh: true }
    });
  }

  // ——— hero ———
  function heroIn() {
    if (RM) return;
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.hero-title .ln > span', { y: 0, color: '#131513', duration: 2.4, stagger: .22, ease: 'power2.out' }, 0)
      .to('.hero-label', { color: '#5B5F59', duration: 1.6 }, .2)
      .to('.hero-sub', { color: '#5B5F59', duration: 1.8 }, .6)
      .to('.hero-fact', { color: '#131513', duration: 1.8 }, .8)
      .from('.hero-act', { y: 18, duration: 1.6 }, .7)
      .to('.chars .brush', { strokeDashoffset: 0, duration: 2.4, stagger: .35, ease: 'power2.inOut' }, .3);
  }

  // ——— 00 · интро «Вдох» ———
  var intro = document.getElementById('intro');
  if (html.classList.contains('intro')) {
    var ringEl = intro.querySelector('.intro-ring');
    var preSeal = intro.querySelector('.intro-seal');
    var wIn = intro.querySelector('[data-w="in"]'), wOut = intro.querySelector('[data-w="out"]');
    var hdrSeal = document.querySelector('.hdr-seal');
    if (lenis) lenis.stop();
    var done = false;
    var finish = function () {
      if (done) return; done = true;
      if (lenis) lenis.start();
      endIntro();
      heroIn();
    };
    var itl = gsap.timeline({ onComplete: finish });
    itl.to(wIn, { opacity: 1, duration: .3 }, 0)
      .to(ringEl, { scale: 1, duration: .8, ease: 'sine.inOut' }, 0)
      .to(wIn, { opacity: 0, duration: .25 }, .7)
      .to(wOut, { opacity: 1, duration: .3 }, .8)
      .to(ringEl, { scale: .22, duration: .75, ease: 'sine.inOut' }, .8)
      .to(ringEl, { opacity: 0, duration: .2 }, 1.45)
      .to(preSeal, { opacity: 1, duration: .2 }, 1.4)
      .to(wOut, { opacity: 0, duration: .2 }, 1.45)
      .add(function () {
        // печать улетает в логотип шапки
        if (window.Flip && hdrSeal) Flip.fit(preSeal, hdrSeal, { duration: .6, ease: 'power3.inOut', scale: true });
      }, 1.6)
      .to(intro, { backgroundColor: 'rgba(241,241,236,0)', duration: .6, ease: 'sine.inOut' }, 1.6)
      .to(intro.querySelector('.intro-skip'), { opacity: 0, duration: .3 }, 1.5)
      .to({}, { duration: .01 }, 2.2);
    intro.addEventListener('click', function () { itl.progress(1); });
  } else {
    endIntro();
    // ждём первый кадр, чтобы стартовые состояния успели примениться
    requestAnimationFrame(heroIn);
  }

  // пересчёт после шрифтов и картинок
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
