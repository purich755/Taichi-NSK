// Сборка фото сайта из raw/photos (галерея Яндекс Карт) в assets/photos/ — WebP + JPG-фолбэк.
//   node tools/build-assets.mjs
// Каждый кадр в двух размерах: полный (до 1280 — потолок Яндекса) и -sm (до 760 по длинной стороне).
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = 'assets/photos';
fs.mkdirSync(OUT, { recursive: true });

// [имя, источник, extract | null, alt]
const PLAN = [
  ['teacher', 'p02', { left: 40, top: 40, width: 1200, height: 1200 }, 'Сергей в оранжевой футболке, ладони сложены в приветствии'],
  ['route-house', 'p08', null, 'Левый торец дома 25/2 по улице Дачной с табличкой номера'],
  ['route-notice', 'p04', null, 'Объявление группы на сетке площадки: расписание, адрес и телефон']
];

async function best(pipe, fmt, limit) {
  for (const q of [82, 78, 74, 70, 64, 58, 52]) {
    const buf = fmt === 'webp'
      ? await pipe.clone().webp({ quality: q, effort: 6 }).toBuffer()
      : await pipe.clone().jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (buf.length <= limit || q === 52) return buf;
  }
}

const manifest = {};
for (const [name, id, ext, alt] of PLAN) {
  for (const [suffix, long, limit] of [['', 1280, 240 * 1024], ['-sm', 760, 100 * 1024]]) {
    let p = sharp(`raw/photos/${id}.jpg`).rotate();
    if (ext) p = p.extract(ext);
    p = p.resize(long, long, { fit: 'inside', withoutEnlargement: true });
    const jpg = await best(p, 'jpg', limit * 1.4);
    // на шумных кадрах WebP тяжелее mozjpeg — давим, пока не станет легче JPG
    const webp = await best(p, 'webp', Math.min(limit, jpg.length * 0.9));
    fs.writeFileSync(`${OUT}/${name}${suffix}.webp`, webp);
    fs.writeFileSync(`${OUT}/${name}${suffix}.jpg`, jpg);
    const meta = await sharp(webp).metadata();
    manifest[name + suffix] = { src: id, w: meta.width, h: meta.height, webp: Math.round(webp.length / 1024), jpg: Math.round(jpg.length / 1024), alt };
    console.log((name + suffix).padEnd(18), `${meta.width}x${meta.height}`, `webp ${Math.round(webp.length / 1024)}КБ`, `jpg ${Math.round(jpg.length / 1024)}КБ`);
  }
}
// Open Graph — 1200×630 с площадки
await sharp('raw/photos/p05.jpg').resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/og.jpg`);
fs.writeFileSync('raw/manifest.json', JSON.stringify(manifest, null, 1));
