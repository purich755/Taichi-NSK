// Статичная карта у площадки из тайлов OpenStreetMap (z17): склейка → кроп по центру площадки →
// тушь на бересте (ч/б, тёмные линии к --ink, светлое к --bereste).
// Iframe Яндекса не используем: виджет с org_id подмешивает звёзды рейтинга и стороннюю рекламу.
//   node tools/build-map.mjs
import sharp from 'sharp';
import fs from 'node:fs';
const LAT = 55.062143, LON = 82.901035, Z = 17, W = 1600, H = 1100;
const n = 2 ** Z;
const fx = ((LON + 180) / 360) * n;
const fy = ((1 - Math.log(Math.tan((LAT * Math.PI) / 180) + 1 / Math.cos((LAT * Math.PI) / 180)) / Math.PI) / 2) * n;
const px = fx * 256, py = fy * 256;               // площадка в мировых пикселях
const x0 = Math.floor((px - W / 2) / 256), y0 = Math.floor((py - H / 2) / 256);
const x1 = Math.floor((px + W / 2) / 256), y1 = Math.floor((py + H / 2) / 256);
fs.mkdirSync('raw/osm', { recursive: true });
const comps = [];
for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
  const f = `raw/osm/${Z}-${x}-${y}.png`;
  if (!fs.existsSync(f)) {
    const r = await fetch(`https://tile.openstreetmap.org/${Z}/${x}/${y}.png`, { headers: { 'User-Agent': 'taichi-nsk demo static map (one-off build)' } });
    if (!r.ok) throw new Error(`tile ${x},${y}: ${r.status}`);
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    await new Promise((r) => setTimeout(r, 150));
  }
  comps.push({ input: f, left: (x - x0) * 256, top: (y - y0) * 256 });
}
const big = await sharp({ create: { width: (x1 - x0 + 1) * 256, height: (y1 - y0 + 1) * 256, channels: 3, background: '#fff' } }).composite(comps).png().toBuffer();
const left = Math.round(px - W / 2 - x0 * 256), top = Math.round(py - H / 2 - y0 * 256);
// ч/б → линейно в диапазон тушь(#131513)…береста(#F1F1EC), с лёгким подъёмом контраста
const gray = await sharp(big).extract({ left, top, width: W, height: H }).grayscale().linear(1.12, -18).raw().toBuffer();
const out = Buffer.alloc(W * H * 3);
const ink = [0x13, 0x15, 0x13], paper = [0xF1, 0xF1, 0xEC];
for (let i = 0; i < W * H; i++) {
  const t = Math.pow(gray[i] / 255, 1.25);
  for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(ink[c] + (paper[c] - ink[c]) * t);
}
const base = sharp(out, { raw: { width: W, height: H, channels: 3 } });
fs.mkdirSync('assets/photos', { recursive: true });
await base.clone().webp({ quality: 78 }).toFile('assets/photos/map.webp');
await base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile('assets/photos/map.jpg');
for (const f of ['map.webp', 'map.jpg']) console.log(f, Math.round(fs.statSync('assets/photos/' + f).size / 1024), 'КБ');
console.log('map', W, H, 'площадка в центре (50% / 50%)');
