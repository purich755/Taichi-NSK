/* «Здесь нет стен»: горизонтальная лента (нативный scroll-snap + drag с инерцией поверх),
   курсор-круг «Тянуть», лайтбокс через GSAP Flip из места фото. */
(function () {
  'use strict';
  var html = document.documentElement;
  var reel = document.getElementById('reel');
  if (!reel) return;
  var RM = html.classList.contains('rm');
  var hasG = !!window.gsap;
  var cursor = document.querySelector('.reel-cursor');
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ——— drag с инерцией (только мышь; пальцем — нативный свайп) ———
  var drag = null, moved = false, inertia = 0;
  reel.addEventListener('dragstart', function (e) { e.preventDefault(); });
  reel.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    e.preventDefault(); // иначе браузер начинает тащить саму картинку
    cancelAnimationFrame(inertia);
    drag = { x: e.clientX, left: reel.scrollLeft, lastX: e.clientX, lastT: performance.now(), v: 0 };
    moved = false;
    if (cursor) cursor.classList.add('is-down');
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 5) { moved = true; reel.classList.add('is-drag'); }
    if (!moved) return;
    reel.scrollLeft = drag.left - dx;
    var now = performance.now(), dt = Math.max(1, now - drag.lastT);
    drag.v = (e.clientX - drag.lastX) / dt * 16;
    drag.lastX = e.clientX; drag.lastT = now;
  });
  window.addEventListener('pointerup', function () {
    if (!drag) return;
    var v = drag.v; drag = null;
    if (cursor) cursor.classList.remove('is-down');
    if (!moved) return;
    (function glide() {
      v *= .92;
      reel.scrollLeft -= v;
      if (Math.abs(v) > .4) inertia = requestAnimationFrame(glide);
      else reel.classList.remove('is-drag');
    })();
  });
  // после перетаскивания клик по кадру не открывает лайтбокс
  reel.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);

  // ——— курсор «Тянуть» ———
  if (cursor && fine && !RM) {
    var cx = 0, cy = 0, tx = 0, ty = 0, on = false, raf = 0;
    var loop = function () {
      cx += (tx - cx) * .14; cy += (ty - cy) * .14;
      cursor.style.translate = cx + 'px ' + cy + 'px';
      raf = on || Math.abs(tx - cx) > .5 ? requestAnimationFrame(loop) : 0;
    };
    reel.addEventListener('pointerenter', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on && !raf) { cx = tx; cy = ty; }
      on = true; cursor.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    reel.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; });
    reel.addEventListener('pointerleave', function () { on = false; cursor.classList.remove('is-on'); });
  } else if (cursor) cursor.remove();

  // ——— лайтбокс ———
  var lb = document.getElementById('lb');
  var img = lb.querySelector('.lb-img');
  var countB = lb.querySelector('.lb-count b');
  var countAll = lb.querySelector('.lb-count');
  var cap = lb.querySelector('.lb-cap');
  var ui = lb.querySelectorAll('.lb-count, .lb-cap, .lb-btn, .lb-close');
  var shots = Array.prototype.slice.call(reel.querySelectorAll('.shot-btn'));
  var cur = -1, opener = null, busy = false;
  var webp = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
  countAll.lastChild.textContent = ' / ' + ('0' + shots.length).slice(-2);

  function src(btn) { return btn.getAttribute('data-full') + (webp ? '.webp' : '.jpg'); }
  function fit(btn) {
    var w = +btn.getAttribute('data-w'), h = +btn.getAttribute('data-h');
    var mob = innerWidth < 761;
    var maxW = innerWidth - (mob ? 24 : 200), maxH = innerHeight - (mob ? 170 : 150);
    var k = Math.min(maxW / w, maxH / h);
    var W = Math.round(w * k), H = Math.round(h * k);
    return { left: Math.round((innerWidth - W) / 2), top: Math.round((innerHeight - H) / 2 - (mob ? 30 : 0)), width: W, height: H };
  }
  function place(r) { img.style.left = r.left + 'px'; img.style.top = r.top + 'px'; img.style.width = r.width + 'px'; img.style.height = r.height + 'px'; }
  function label(i) {
    countB.textContent = ('0' + (i + 1)).slice(-2);
    var alt = shots[i].querySelector('img').alt;
    cap.textContent = alt; img.alt = alt;
  }

  function open(i) {
    if (busy) return;
    cur = i; opener = shots[i];
    var thumb = opener.querySelector('img');
    img.src = src(opener);
    label(i);
    lb.hidden = false;
    place(fit(opener));
    if (window.TC && TC.lenis) TC.lenis.stop();
    document.addEventListener('keydown', onKey);
    if (!hasG || RM || !window.Flip) { lb.style.background = 'rgba(19,21,19,1)'; lb.querySelector('.lb-close').focus(); return; }
    busy = true;
    thumb.setAttribute('data-flip-id', 'lb'); img.setAttribute('data-flip-id', 'lb');
    var state = Flip.getState(thumb);
    gsap.set(ui, { opacity: 0 });
    Flip.from(state, { targets: img, duration: .7, ease: 'expo.inOut', scale: false, onComplete: function () { busy = false; thumb.removeAttribute('data-flip-id'); } });
    gsap.to(lb, { backgroundColor: 'rgba(19,21,19,1)', duration: .6, ease: 'sine.inOut' });
    gsap.to(ui, { opacity: 1, duration: .8, delay: .45 });
    lb.querySelector('.lb-close').focus({ preventScroll: true });
  }

  function close() {
    if (busy || lb.hidden) return;
    document.removeEventListener('keydown', onKey);
    var target = shots[cur].querySelector('img');
    var finish = function () {
      lb.hidden = true; busy = false;
      if (hasG) gsap.set(img, { clearProps: 'transform,x,y' });
      lb.style.background = '';
      if (window.TC && TC.lenis) TC.lenis.start();
      if (opener) opener.focus({ preventScroll: true });
    };
    if (!hasG || RM || !window.Flip) return finish();
    busy = true;
    // кадр мог уйти из ленты — докручиваем ленту, чтобы было куда вернуться
    var b = shots[cur].parentElement; reel.scrollLeft = b.offsetLeft - (reel.clientWidth - b.offsetWidth) / 2;
    gsap.to(ui, { opacity: 0, duration: .3 });
    gsap.to(lb, { backgroundColor: 'rgba(19,21,19,0)', duration: .6, delay: .1, ease: 'sine.inOut' });
    Flip.fit(img, target, { duration: .7, ease: 'expo.inOut', scale: false, onComplete: finish });
  }

  function go(d) {
    if (busy) return;
    var n = (cur + d + shots.length) % shots.length;
    if (!hasG || RM) { cur = n; img.src = src(shots[n]); place(fit(shots[n])); label(n); return; }
    busy = true;
    gsap.to(img, { opacity: 0, x: -d * 30, duration: .45, ease: 'sine.in', onComplete: function () {
      cur = n; opener = shots[n];
      var pre = new Image();
      pre.onload = pre.onerror = function () {
        pre.onload = pre.onerror = null;
        img.src = pre.src; place(fit(shots[n])); label(n);
        gsap.fromTo(img, { opacity: 0, x: d * 30 }, { opacity: 1, x: 0, duration: .7, ease: 'sine.out', onComplete: function () { busy = false; } });
      };
      pre.src = src(shots[n]);
    } });
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      // фокус не выходит из диалога
      var f = lb.querySelectorAll('button');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  shots.forEach(function (b, i) { b.addEventListener('click', function () { open(i); }); });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { go(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { go(1); });
  // клик по фону закрывает; свайп листает
  var sw = null;
  lb.addEventListener('pointerdown', function (e) { sw = { x: e.clientX, y: e.clientY, t: e.target }; });
  lb.addEventListener('pointerup', function (e) {
    if (!sw) return;
    var dx = e.clientX - sw.x, dy = e.clientY - sw.y, t = sw.t; sw = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return go(dx < 0 ? 1 : -1);
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && t === lb) close();
  });
  window.addEventListener('resize', function () { if (!lb.hidden && !busy) place(fit(shots[cur])); });
})();
