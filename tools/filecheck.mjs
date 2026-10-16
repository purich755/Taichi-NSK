// Открытие двойным кликом (file://): ошибки, картинки, шрифты, анимации
import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(pathToFileURL(path.resolve('index.html')).href, { waitUntil: 'load' });
await p.waitForTimeout(3500);
const r = await p.evaluate(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.__lenis ? __lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
  await new Promise((r) => setTimeout(r, 1500));
  const imgs = [...document.images];
  return { broken: imgs.filter((i) => i.complete && !i.naturalWidth).map((i) => i.currentSrc || i.src), total: imgs.length, gsap: !!window.gsap, lenis: !!window.__lenis, intro: document.documentElement.classList.contains('intro') };
});
console.log(JSON.stringify(r), errs.length ? errs : 'ошибок нет');
await b.close();
