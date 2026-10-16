/* Hero: еле заметная дымка + след туши за курсором с инерцией.
   Точка догоняет мышь (lerp 0.08), капли гаснут за ~1.2 с. На тач-устройствах — только медленная дымка.
   Рисуем, только пока hero виден. */
(function () {
  'use strict';
  var html = document.documentElement;
  if (html.classList.contains('rm')) return;
  var cv = document.getElementById('ink');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var hero = cv.parentElement;
  var touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var W = 0, H = 0, visible = true, raf = 0, last = 0;

  var mouse = { x: -1, y: -1, in: false };
  var pen = { x: 0, y: 0, vx: 0, vy: 0, init: false };
  var drops = [];
  var mist = [];

  function resize() {
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!mist.length) seedMist();
  }
  function seedMist() {
    var n = touch ? 7 : 9;
    for (var i = 0; i < n; i++) {
      mist.push({
        x: Math.random(), y: .2 + Math.random() * .8,
        r: .22 + Math.random() * .3,
        sp: (.004 + Math.random() * .008) * (Math.random() < .5 ? -1 : 1),
        ph: Math.random() * Math.PI * 2,
        a: .035 + Math.random() * .035
      });
    }
  }

  if (!touch) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.in = true;
      if (!pen.init) { pen.x = mouse.x; pen.y = mouse.y; pen.init = true; }
    });
    hero.addEventListener('pointerleave', function () { mouse.in = false; });
  }

  function frame(t) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    var dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    ctx.clearRect(0, 0, W, H);

    // дымка: большие мягкие пятна тумана, дышат в ритме 4/6
    var breath = .5 - .5 * Math.cos((t / 1000) * (Math.PI * 2 / 10));
    for (var i = 0; i < mist.length; i++) {
      var m = mist[i];
      m.x += m.sp * dt; if (m.x < -.4) m.x = 1.4; if (m.x > 1.4) m.x = -.4;
      var cx = m.x * W, cy = (m.y + Math.sin(t / 7000 + m.ph) * .03) * H, rr = m.r * Math.max(W, H) * (.92 + breath * .1);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, 'rgba(176, 192, 194,' + (m.a * (.8 + breath * .4)) + ')');
      g.addColorStop(1, 'rgba(176, 192, 194, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }

    // перо туши
    if (pen.init) {
      var px = pen.x, py = pen.y;
      if (mouse.in) {
        pen.x += (mouse.x - pen.x) * .08;
        pen.y += (mouse.y - pen.y) * .08;
      }
      var dx = pen.x - px, dy = pen.y - py, sp = Math.sqrt(dx * dx + dy * dy);
      if (sp > .25) {
        var steps = Math.min(8, Math.ceil(sp / 3));
        for (var s = 1; s <= steps; s++) {
          drops.push({ x: px + dx * s / steps, y: py + dy * s / steps, r: Math.min(9, 1.4 + sp * .32), life: 1, j: (Math.random() - .5) * .8 });
        }
      }
    }
    for (var k = drops.length - 1; k >= 0; k--) {
      var d = drops[k];
      d.life -= dt / 1.2;
      if (d.life <= 0) { drops.splice(k, 1); continue; }
      var a = d.life * d.life * .32;
      var rad = d.r * (1 + (1 - d.life) * .9);
      ctx.fillStyle = 'rgba(19, 21, 19,' + a + ')';
      ctx.beginPath();
      ctx.ellipse(d.x + d.j * (1 - d.life) * 6, d.y, rad, rad * .82, d.j, 0, Math.PI * 2);
      ctx.fill();
    }
    if (drops.length > 900) drops.splice(0, drops.length - 900);
  }

  resize();
  window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    }).observe(hero);
  }
  raf = requestAnimationFrame(frame);
})();
