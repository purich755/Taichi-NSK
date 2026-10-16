/* «Подышите с нами»: удержание — вдох (шар растёт и светлеет, 4 с), отпускание — выдох (6 с).
   Мышь, палец, пробел (когда секция на экране или шар в фокусе). Три цикла — и приглашение на площадку. */
(function () {
  'use strict';
  var html = document.documentElement;
  var sec = document.getElementById('breath');
  if (!sec) return;
  var ball = sec.querySelector('.breath-ball');
  var core = sec.querySelector('.breath-core');
  var word = sec.querySelector('.breath-word');
  var live = sec.querySelector('.breath-live');
  var countEl = sec.querySelector('.breath-count b');
  var done = sec.querySelector('.breath-done');
  var RM = html.classList.contains('rm');
  var TOTAL = 3;

  if (RM || !window.gsap) {
    // статичная подсказка вместо интерактива
    word.textContent = 'вдох · 4 / выдох · 6';
    live.textContent = 'Вдох на четыре счёта, выдох на шесть. Три раза.';
    return;
  }

  var st = { v: 0 };
  var MIN = .42;
  function draw() {
    var v = st.v;
    core.style.transform = 'scale(' + (MIN + (1 - MIN) * v).toFixed(4) + ')';
    core.style.filter = 'brightness(' + (.62 + .5 * v).toFixed(3) + ')';
  }
  draw();

  var holding = false, t0 = 0, cycles = 0, tw = null;
  function say(t) { live.textContent = t; }

  function inhale() {
    if (holding) return;
    holding = true; t0 = performance.now();
    if (tw) tw.kill();
    tw = gsap.to(st, { v: 1, duration: Math.max(.6, 4 * (1 - st.v)), ease: 'power2.out', onUpdate: draw });
    word.textContent = 'вдох';
    say('Вдох… медленно, до конца.');
    ball.classList.add('is-in');
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
  }
  function exhale() {
    if (!holding) return;
    holding = false;
    var held = performance.now() - t0;
    if (tw) tw.kill();
    tw = gsap.to(st, { v: 0, duration: Math.max(.8, 6 * st.v), ease: 'sine.inOut', onUpdate: draw });
    ball.classList.remove('is-in');
    word.textContent = 'выдох';
    if (held > 1200 && cycles < TOTAL) {
      cycles++;
      countEl.textContent = '0' + Math.min(TOTAL, cycles + 1);
      if (cycles >= TOTAL) {
        countEl.textContent = '03';
        say('Выдох. Три цикла.');
        setTimeout(function () {
          done.hidden = false;
          gsap.fromTo(done, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out' });
        }, 1600);
      } else say('Выдох… длиннее, чем вдох.');
    } else if (held <= 1200) {
      say('Чуть дольше — вдох длится около четырёх секунд.');
    }
  }

  ball.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    inhale();
  });
  window.addEventListener('pointerup', exhale);
  window.addEventListener('pointercancel', exhale);
  window.addEventListener('blur', exhale);
  ball.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // клавиатура: пробел/Enter на шаре, пробел — когда секция в центре экрана
  var inView = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }, { rootMargin: '-35% 0px -35% 0px' }).observe(sec.querySelector('.breath-stage'));
  }
  function keyOk(e) {
    if (e.target === ball) return e.code === 'Space' || e.key === 'Enter';
    if (e.code !== 'Space' || !inView) return false;
    return !e.target.closest || !e.target.closest('a, button, input, textarea, select, [contenteditable]');
  }
  window.addEventListener('keydown', function (e) {
    if (!keyOk(e)) return;
    e.preventDefault();
    if (!e.repeat) inhale();
  });
  window.addEventListener('keyup', function (e) {
    if (e.target === ball ? (e.code === 'Space' || e.key === 'Enter') : (e.code === 'Space' && holding)) { e.preventDefault(); exhale(); }
  });
  // Enter у кнопки ещё и «кликает» — гасим, чтобы не было лишних событий
  ball.addEventListener('click', function (e) { e.preventDefault(); });

  // подсказка: при первом появлении шар один раз «дышит» сам
  if (window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', once: true,
      onEnter: function () {
        if (holding) return;
        tw = gsap.timeline()
          .to(st, { v: .35, duration: 4, ease: 'power2.out', onUpdate: draw })
          .to(st, { v: 0, duration: 6, ease: 'sine.inOut', onUpdate: draw });
      }
    });
  }
})();
