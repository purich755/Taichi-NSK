// Клик-тесты интерактива: node tools/interact.mjs [--w 1440]
import { chromium } from 'playwright-core';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i === -1 ? d : process.argv[i + 1]; };
const W = +arg('w', '1440'), H = W < 700 ? 844 : 900;
const BASE = arg('url', 'http://localhost:8090/');
const b = await chromium.launch({ channel: 'chrome', headless: true });
let ok = 0, fail = 0;
const check = (name, cond, info = '') => { cond ? ok++ : fail++; console.log((cond ? '✓ ' : '✗ ') + name + (info ? '  — ' + info : '')); };

async function open(q = '', opts = {}) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, locale: 'ru-RU', ...opts });
  const p = await ctx.newPage();
  p.errors = []; p.reqs = [];
  p.on('pageerror', (e) => p.errors.push('PAGEERROR ' + e.message));
  p.on('console', (m) => m.type() === 'error' && p.errors.push(m.text()));
  p.on('request', (r) => p.reqs.push(r.url()));
  p.on('requestfailed', (r) => p.errors.push('FAILED ' + r.url().slice(0, 90) + ' ' + (r.failure() || {}).errorText));
  await p.addInitScript(() => { try { sessionStorage.setItem('tc-intro', '1'); } catch (e) {} });
  if (opts.block) await p.route(opts.block, (r) => r.abort());
  await p.goto(BASE + q, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  return p;
}
const go = (p, sel, off = 0) => p.evaluate(([s, o]) => { const el = s === 'max' ? null : document.querySelector(s); const l = window.__lenis; const y = el ? el.getBoundingClientRect().top + scrollY - o : document.documentElement.scrollHeight; l ? l.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }, [sel, off]).then(() => p.waitForTimeout(700));
const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim(), sel);
const center = async (p, sel) => { const bb = await p.locator(sel).first().boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };

// ——— основная страница ———
const p = await open();
check('шкала часа вверху = 08:00', (await text(p, '.hour-now b')) === '08:00', await text(p, '.hour-now b'));
await go(p, 'max'); await p.waitForTimeout(600);
check('шкала часа в футере = 09:00', (await text(p, '.hour-now b')) === '09:00', await text(p, '.hour-now b'));
const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
check('нет горизонтального скролла', ov.sw <= ov.iw, `${ov.sw}/${ov.iw}`);

// оглавление
await go(p, '#practice', 60);
const [tx, ty] = await center(p, '.toc-row:nth-child(3) .toc-btn');
await p.mouse.move(tx, ty); await p.mouse.click(tx, ty); await p.waitForTimeout(1100);
check('строка оглавления раскрыта', await p.evaluate(() => document.querySelector('.toc-row:nth-child(3)').classList.contains('is-open') && document.querySelector('.toc-row:nth-child(3) .toc-body').offsetHeight > 20));

// шар дыхания — мышью
await go(p, '#breath', 40);
for (let i = 0; i < 3; i++) {
  const [bx, by] = await center(p, '.breath-ball');
  await p.mouse.move(bx, by); await p.mouse.down(); await p.waitForTimeout(1500);
  if (i === 0) {
    const sc = await p.evaluate(() => document.querySelector('.breath-core').style.transform);
    check('вдох: шар растёт', /scale\(0\.[5-9]|scale\(1/.test(sc), sc);
  }
  await p.mouse.up(); await p.waitForTimeout(400);
}
check('счётчик 03 / 03', (await text(p, '.breath-count')) === 'Цикл 03 / 03', await text(p, '.breath-count'));
await p.waitForTimeout(2000);
check('после трёх циклов — приглашение', await p.evaluate(() => !document.querySelector('.breath-done').hidden));

// лайтбокс
await go(p, '#place', 0);
await p.evaluate(() => { document.getElementById('reel').scrollLeft = 0; });
await p.waitForTimeout(300);
const N = W < 700 ? 1 : 2, pad = (n) => ('0' + n).slice(-2);
const [sx, sy] = await center(p, '.shot:nth-child(' + N + ') .shot-btn');
await p.mouse.click(sx, sy); await p.waitForTimeout(1200);
check('лайтбокс открыт', await p.evaluate(() => !document.getElementById('lb').hidden));
check('счётчик ' + pad(N) + ' / 07', (await text(p, '.lb-count')) === pad(N) + ' / 07', await text(p, '.lb-count'));
const lbr = await p.evaluate(() => { const r = document.querySelector('.lb-img').getBoundingClientRect(); return [r.width, r.height, document.querySelector('.lb-img').currentSrc]; });
check('кадр развернулся на экран', lbr[0] > W * 0.4, JSON.stringify(lbr));
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500);
check('стрелка → ' + pad(N + 1), (await text(p, '.lb-count')) === pad(N + 1) + ' / 07', await text(p, '.lb-count'));
await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
check('Esc закрывает', await p.evaluate(() => document.getElementById('lb').hidden));

// ссылки
const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
check('телефон tel:+79529295251', links.includes('tel:+79529295251'));
check('VK', links.includes('https://vk.ru/taichicigun'));
check('MAX', links.includes('https://max.ru/join/BBegHoh3Ic6uSTUgzTVF4EPd4f7bDFWa5desrRKIV_M'));
check('Яндекс Карты', links.includes('https://yandex.ru/maps/org/taytszitsyuan/139964930337/'));
const missing = await p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h !== '#top' && !document.querySelector(h)));
check('все якоря ведут на секции', missing.length === 0, missing.join(','));
check('нет запросов к avatars.mds.yandex.net', !p.reqs.some((u) => u.includes('avatars.mds.yandex.net')));
check('без ошибок консоли', p.errors.length === 0, p.errors.join(' | '));
await p.context().close();

// ——— пробел ———
const k = await open();
await go(k, '#breath', 40);
await k.evaluate(() => document.activeElement && document.activeElement.blur());
const y0 = await k.evaluate(() => scrollY);
await k.keyboard.down('Space'); await k.waitForTimeout(1500);
const ksc = await k.evaluate(() => document.querySelector('.breath-core').style.transform);
await k.keyboard.up('Space'); await k.waitForTimeout(300);
check('пробел: вдох, страница не прыгнула', /scale\(0\.[5-9]|scale\(1/.test(ksc) && Math.abs((await k.evaluate(() => scrollY)) - y0) < 4, ksc);
check('пробел засчитал цикл', (await text(k, '.breath-count')) === 'Цикл 02 / 03', await text(k, '.breath-count'));
await k.context().close();

// ——— тач ———
const t = await open('', { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
await go(t, '#breath', 40);
await t.evaluate(() => { const b = document.querySelector('.breath-ball'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true, button: 0 })); });
await t.waitForTimeout(1500);
const tsc = await t.evaluate(() => document.querySelector('.breath-core').style.transform);
await t.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' })));
await t.waitForTimeout(300);
check('тач: вдох и цикл', /scale\(0\.[5-9]|scale\(1/.test(tsc) && (await text(t, '.breath-count')) === 'Цикл 02 / 03', tsc);
await t.context().close();

// ——— «ближайшая практика» с подменой времени ———
const cases = [
  ['2026-10-20T07:30', /сегодня, 20 октября, 08:00/, /До начала 30 м/, false, 1],
  ['2026-10-20T08:37', /прямо сейчас/, /До 09:00 — 23 минуты/, true, 1],
  ['2026-10-23T08:59', /прямо сейчас/, /1 минута/, true, 4],
  ['2026-10-16T09:10', /вторник, 20 октября, 08:00/, /До начала 3 д 22 ч 50 м/, false, 4],
  ['2026-10-18T12:00', /вторник, 20 октября, 08:00/, /До начала 1 д 20 ч 00 м/, false, 6],
  ['2026-10-19T23:59', /вторник, 20 октября, 08:00/, /До начала 8 ч 01 м/, false, 0],
  ['2026-12-31T10:00', /пятница, 1 января, 08:00/, /До начала 22 ч 00 м/, false, 3],
];
for (const [now, re1, re2, live, wd] of cases) {
  const s = await open('?now=' + now);
  const title = await text(s, '[data-next-title]'), cnt = await text(s, '[data-next-count]');
  const st = await s.evaluate(() => ({ live: !document.querySelector('.week-live').hidden, today: [...document.querySelectorAll('.day')].findIndex((d) => d.classList.contains('is-today')), dot: !!document.querySelector('.day-live') }));
  check(`${now}: ${title} / ${cnt}`, re1.test(title) && re2.test(cnt) && st.live === live && st.dot === live && st.today === wd, JSON.stringify(st));
  await s.context().close();
}

// ——— без сети к погоде и карте ———
const off = await open('', { block: /open-meteo|yandex\.ru\/map-widget/ });
check('без погоды чип скрыт', await off.evaluate(() => [...document.querySelectorAll('[data-weather]')].every((e) => e.hidden)));
const mapH = await off.evaluate(() => document.querySelector('.map-frame').getBoundingClientRect().height);
check('рамка карты держит размер', mapH > 150, String(mapH));
check('без сети — без ошибок страницы', !off.errors.some((e) => e.startsWith('PAGEERROR')), off.errors.join(' | '));
await off.context().close();

// ——— reduced motion ———
const rm = await open('', { reducedMotion: 'reduce' });
const rs = await rm.evaluate(() => ({ w: getComputedStyle(document.querySelector('.manifest-text .w')).opacity, tj: document.querySelector('.taiji').offsetHeight < innerHeight * 2.5, dot: getComputedStyle(document.querySelector('.tj-dot')).opacity, lenis: !!window.__lenis, hint: document.querySelector('.breath-live').textContent }));
check('reduced: всё видно сразу, без pin и Lenis', rs.w === '1' && rs.tj && rs.dot === '1' && !rs.lenis && /четыре/.test(rs.hint), JSON.stringify(rs));
check('reduced: без ошибок', rm.errors.length === 0, rm.errors.join(' | '));
await rm.context().close();

console.log(`\nитог: ${ok} ✓, ${fail} ✗`);
await b.close();
