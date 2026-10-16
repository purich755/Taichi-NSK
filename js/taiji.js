/* «Одно движение»: круг тайцзи пишется кистью по скроллу.
   Внешняя окружность → S-линия → две точки и поворот на 180° → круг сжимается в печать.
   Секция высотой 320vh (220vh на мобиле), сцена внутри — position: sticky. */
(function () {
  'use strict';
  var html = document.documentElement;
  var sec = document.getElementById('taiji');
  if (!sec || html.classList.contains('rm') || !window.gsap || !window.ScrollTrigger) return;

  var q = function (s) { return sec.querySelectorAll(s); };
  var phases = q('.phase'), dots = q('.taiji-dots i');
  var cur = 0;
  function setPhase(i) {
    if (i === cur) return;
    gsap.to(phases[cur], { opacity: 0, y: -14, duration: .9, ease: 'sine.inOut', overwrite: true });
    gsap.fromTo(phases[i], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2, ease: 'sine.out', delay: .25, overwrite: true });
    phases.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
    dots.forEach(function (d, k) { d.classList.toggle('is-on', k <= i); });
    cur = i;
  }
  gsap.set(phases, { opacity: 0 });
  gsap.set(phases[0], { opacity: 1 });

  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1.4,
      onUpdate: function (st) {
        // фазу считаем от прогресса — onUpdate при scrub отстаёт от tl.time()
        var p = st.progress;
        setPhase(p < .34 ? 0 : p < .62 ? 1 : 2);
      }
    }
  });
  // 一 Сознание — внешняя окружность
  tl.set(q('.tj-c'), { opacity: 1 }, .2)
    .to(q('.tj-c'), { strokeDashoffset: 0, duration: 3, ease: 'sine.inOut' }, .2)
    .set(q('.tj-s'), { opacity: 1 }, 3.4)
    // 二 Дыхание — S-линия
    .to(q('.tj-s'), { strokeDashoffset: 0, duration: 2.6, ease: 'sine.inOut' }, 3.4)
    // 三 Движение — две точки и поворот
    .set(q('.tj-d1, .tj-d2'), { opacity: 1 }, 6.2)
    .to(q('.tj-d1, .tj-d2'), { strokeDashoffset: 0, duration: .9, stagger: .3, ease: 'sine.inOut' }, 6.2)
    .to(q('.tj-dot'), { opacity: 1, duration: .6 }, 6.9)
    .to(q('.tj-rot'), { rotation: 180, svgOrigin: '300 300', duration: 2.4, ease: 'sine.inOut' }, 6.6)
    // утро светлеет
    .fromTo(sec, { backgroundColor: '#F1F1EC' }, { backgroundColor: '#D6E0E1', duration: 9 }, 0)
    // круг сжимается в красную печать
    .to(q('.taiji-svg'), { scale: .2, opacity: 0, duration: 1, ease: 'power2.in', transformOrigin: '50% 50%' }, 9.2)
    .fromTo(q('.taiji-seal'), { opacity: 0, scale: 1.6, rotate: -10 }, { opacity: 1, scale: 1, rotate: -3, duration: .8, ease: 'back.out(2)' }, 9.85)
    .to({}, { duration: .6 });
})();
