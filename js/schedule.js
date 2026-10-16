/* Неделя, «ближайшая практика», отсчёт, погода.
   Всё по времени Новосибирска (Asia/Novosibirsk), а не по часам посетителя.
   Для проверки можно подменить время: ?now=2026-10-20T08:23 (это новосибирское время). */
(function () {
  'use strict';
  var TZ = 'Asia/Novosibirsk';
  var DAYS = [1, 2, 3, 4];           // Вт—Пт (0 = Пн)
  var START = 8 * 60, END = 9 * 60;  // 08:00—09:00
  var WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

  var override = null;
  try {
    var q = new URLSearchParams(location.search).get('now');
    var m = q && q.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (m) override = { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], at: Date.now() };
  } catch (e) {}

  function nskNow() {
    if (override) {
      // подменённое время идёт вместе с настоящим
      var shift = Math.floor((Date.now() - override.at) / 60000);
      var base = Date.UTC(override.y, override.mo - 1, override.d, override.h, override.mi) + shift * 60000;
      var t = new Date(base);
      return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), wd: (t.getUTCDay() + 6) % 7 };
    }
    var p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, h: (+p.hour) % 24, mi: +p.minute, wd: WD[p.weekday] };
  }

  // ближайшее занятие: { live, left } или { offset (дней), minutes (до начала) }
  function nextPractice(n) {
    var mins = n.h * 60 + n.mi;
    if (DAYS.indexOf(n.wd) >= 0) {
      if (mins < START) return { offset: 0, minutes: START - mins };
      if (mins < END) return { live: true, left: END - mins };
    }
    for (var k = 1; k <= 7; k++) {
      if (DAYS.indexOf((n.wd + k) % 7) >= 0) return { offset: k, minutes: k * 1440 + START - mins };
    }
  }

  function dateLabel(n, offset) {
    var t = new Date(Date.UTC(n.y, n.mo - 1, n.d + offset));
    return new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(t);
  }

  function plural(v, one, few, many) {
    var a = v % 10, b = v % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  function pad(v) { return (v < 10 ? '0' : '') + v; }

  function render() {
    var n = nskNow();
    var np = nextPractice(n);

    // неделя
    document.querySelectorAll('.day').forEach(function (el) {
      var d = +el.getAttribute('data-d');
      el.classList.toggle('is-today', d === n.wd);
      var dot = el.querySelector('.day-live');
      if (np.live && d === n.wd) {
        if (!dot) { dot = document.createElement('span'); dot.className = 'day-live'; dot.setAttribute('aria-hidden', 'true'); el.querySelector('.day-track').appendChild(dot); }
      } else if (dot) dot.remove();
    });
    var live = document.querySelector('.week-live');
    if (live) live.hidden = !np.live;

    // финал
    var title = document.querySelector('[data-next-title]');
    var count = document.querySelector('[data-next-count]');
    if (!title) return;
    if (np.live) {
      title.innerHTML = 'Практика идёт <em>прямо сейчас</em>';
      count.textContent = 'До 09:00 — ' + np.left + ' ' + plural(np.left, 'минута', 'минуты', 'минут');
    } else {
      var label = np.offset === 0 ? 'сегодня, ' + dateLabel(n, 0).split(', ')[1] : dateLabel(n, np.offset);
      var parts = label.split(', ');
      title.innerHTML = 'Ближайшая практика —<br> <em>' + parts[0] + ', <span class="nw">' + parts.slice(1).join(', ') + ', 08:00</span></em>';
      var dd = Math.floor(np.minutes / 1440), hh = Math.floor((np.minutes % 1440) / 60), mm = np.minutes % 60;
      count.textContent = 'До начала ' + (dd ? dd + ' д ' : '') + (dd || hh ? hh + ' ч ' : '') + pad(mm) + ' м';
    }
  }

  render();
  // раз в минуту, ровно по смене минуты
  setTimeout(function () { render(); setInterval(render, 60000); }, (60 - new Date().getSeconds()) * 1000 + 50);

  // ——— погода на площадке (Open-Meteo, без ключа) ———
  function wxWord(c) {
    if (c === 0 || c === 1) return 'ясно';
    if (c === 2) return 'облачно';
    if (c === 3) return 'пасмурно';
    if (c === 45 || c === 48) return 'туман';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'дождь';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'снег';
    if (c >= 95) return 'гроза';
    return '';
  }
  function loadWeather() {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    fetch('https://api.open-meteo.com/v1/forecast?latitude=55.0621&longitude=82.9010&current=temperature_2m,weather_code&timezone=Asia%2FNovosibirsk', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var t = Math.round(j.current.temperature_2m), w = wxWord(j.current.weather_code);
        if (!isFinite(t)) return;
        var temp = (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + '°';
        var text = 'Сейчас на площадке: ' + temp + (w ? ', ' + w : '');
        document.querySelectorAll('[data-weather]').forEach(function (el) {
          el.querySelector('span').textContent = text;
          el.hidden = false;
        });
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      })
      .catch(function () { clearTimeout(timer); });
  }
  if (document.readyState === 'complete') loadWeather(); else window.addEventListener('load', loadWeather);

  window.TC = window.TC || {};
  window.TC.nskNow = nskNow;
  window.TC.nextPractice = nextPractice;
  window.TC.renderSchedule = render;
})();
