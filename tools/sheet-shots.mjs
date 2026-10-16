// Склейка кадров raw/shots/<prefix>-NN.png в листы по 4 (2×2) для быстрого просмотра.
import sharp from 'sharp';
import fs from 'node:fs';
const prefix = process.argv[2] || '1440';
const scale = parseFloat(process.argv[3] || '0.5');
const files = fs.readdirSync('raw/shots').filter(f => f.startsWith(prefix + '-') && f.endsWith('.png') && !isNaN(+f.slice(prefix.length + 1, -4))).sort();
const m0 = await sharp('raw/shots/' + files[0]).metadata();
const w = Math.round(m0.width * scale), h = Math.round(m0.height * scale);
const per = 4, cols = 2;
for (let s = 0; s < files.length; s += per) {
  const chunk = files.slice(s, s + per);
  const tiles = await Promise.all(chunk.map(async (f, i) => ({ input: await sharp('raw/shots/' + f).resize(w, h).toBuffer(), left: (i % cols) * (w + 6), top: Math.floor(i / cols) * (h + 6) })));
  await sharp({ create: { width: cols * w + 6, height: 2 * h + 6, channels: 3, background: '#f00' } }).composite(tiles).jpeg({ quality: 82 }).toFile(`raw/shots/sheet-${prefix}-${s / per}.jpg`);
}
console.log(files.length);
