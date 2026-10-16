// Контактный лист raw/photos -> raw/sheet.jpg
import sharp from 'sharp';
import fs from 'node:fs';
const dir = 'raw/photos';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
const W = 420, H = 320, cols = 4;
const tiles = await Promise.all(files.map(async (f, i) => {
  const img = await sharp(`${dir}/${f}`).resize(W, H - 30, { fit: 'contain', background: '#222' }).toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="30"><rect width="100%" height="100%" fill="#000"/><text x="8" y="21" font-size="18" fill="#fff" font-family="Arial">${f}</text></svg>`);
  return [{ input: img, left: (i % cols) * W, top: Math.floor(i / cols) * H }, { input: label, left: (i % cols) * W, top: Math.floor(i / cols) * H + H - 30 }];
}));
const rows = Math.ceil(files.length / cols);
await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: '#111' } }).composite(tiles.flat()).jpeg({ quality: 85 }).toFile('raw/sheet.jpg');
console.log('ok', files.length);
