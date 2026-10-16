// Пути глифов Ma Shan Zheng (сабсет 太极拳一二三四五) -> raw/glyphs.json, em = 1000, y вниз.
import opentype from 'opentype.js';
import fs from 'node:fs';
const font = opentype.parse(fs.readFileSync('raw/msz.ttf').buffer);
const out = {};
for (const ch of '太极拳一二三四五') {
  const g = font.charToGlyph(ch);
  const p = g.getPath(0, 880, 1000);
  const bb = p.getBoundingBox();
  out[ch] = { d: p.toPathData(1), adv: g.advanceWidth * 1000 / font.unitsPerEm, bb: [bb.x1, bb.y1, bb.x2, bb.y2].map(v => Math.round(v)) };
}
fs.writeFileSync('raw/glyphs.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, v.bb, v.d.length);
