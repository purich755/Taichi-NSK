// Собирает SVG-спрайт (глифы Ma Shan Zheng, печать, мазки бересты) и вставляет его
// в index.html между <!--SPRITE--> и <!--/SPRITE-->. Заодно пишет assets/svg/seal.svg и favicon.svg.
//   node tools/glyphs.mjs && node tools/inject.mjs
import fs from 'node:fs';

const G = JSON.parse(fs.readFileSync('raw/glyphs.json', 'utf8'));
const ID = { '太': 'tai', '极': 'ji', '拳': 'quan', '一': 'n1', '二': 'n2', '三': 'n3', '四': 'n4', '五': 'n5' };

// печать: два знака рядом, бумажные «пробелы» в оттиске, рваный край
const sealInner = (pfx) => `
  <rect x="10" y="10" width="180" height="180" rx="5" fill="#C4432B"/>
  <g fill="#F1F1EC">
    <path transform="translate(13 49) scale(.091)" d="${G['太'].d}"/>
    <path transform="translate(98 49) scale(.091)" d="${G['极'].d}"/>
  </g>`;
const sealFilter = (id) => `
  <filter id="${id}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="4" result="s"/>
    <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -9 6.2" result="m"/>
    <feComposite in="d" in2="m" operator="in"/>
  </filter>`;

// береста: чечевички коры — вытянутые штрихи с заострёнными концами, иногда парами
function birch(seed, w = 1200, h = 40) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let x = -10, out = '';
  const mark = (x1, len, y, th) => {
    const x2 = x1 + len, m = (x1 + x2) / 2, b = (rnd() - 0.5) * 3;
    return `<path d="M${x1.toFixed(1)} ${y.toFixed(1)} Q${(m - len * .1).toFixed(1)} ${(y - th + b).toFixed(1)} ${x2.toFixed(1)} ${(y + b * .4).toFixed(1)} Q${(m + len * .12).toFixed(1)} ${(y + th * .8 + b).toFixed(1)} ${x1.toFixed(1)} ${y.toFixed(1)}Z"/>`;
  };
  while (x < w) {
    x += 14 + rnd() * 70;
    const len = 18 + rnd() * (rnd() > 0.75 ? 170 : 70);
    const y = 10 + rnd() * (h - 20);
    const th = 1.2 + rnd() * (rnd() > 0.6 ? 5.5 : 2.4);
    out += mark(x, len, y, th);
    if (rnd() > 0.6) out += mark(x + len * (0.1 + rnd() * .3), len * (0.4 + rnd() * .5), y + (rnd() > .5 ? 1 : -1) * (5 + rnd() * 6), th * .6);
    x += len;
  }
  return out;
}

const sprite = `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    ${sealFilter('f-seal')}
    <filter id="f-brush" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="f-dry" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="9" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="G" yChannelSelector="R"/>
    </filter>
    <filter id="f-bleed" x="-3%" y="-3%" width="106%" height="106%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    ${Object.entries(ID).map(([ch, id]) => `<symbol id="g-${id}" viewBox="0 0 1000 1000"><path d="${G[ch].d}"/></symbol>`).join('\n    ')}
    <symbol id="seal" viewBox="0 0 200 200"><g filter="url(#f-seal)">${sealInner()}</g></symbol>
    <symbol id="birch-a" viewBox="0 0 1200 40" preserveAspectRatio="none"><g fill="currentColor" filter="url(#f-brush)">${birch(7)}</g></symbol>
    <symbol id="birch-b" viewBox="0 0 1200 40" preserveAspectRatio="none"><g fill="currentColor" filter="url(#f-brush)">${birch(91)}</g></symbol>
  </defs>
</svg>`;

const html = fs.readFileSync('index.html', 'utf8');
const next = html.replace(/<!--SPRITE-->[\s\S]*?<!--\/SPRITE-->/, () => `<!--SPRITE-->\n${sprite}\n<!--/SPRITE-->`);
fs.writeFileSync('index.html', next);

const standalone = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs>${sealFilter('r')}</defs><g transform="rotate(-3 100 100)" filter="url(#r)">${sealInner()}</g></svg>\n`;
fs.mkdirSync('assets/svg', { recursive: true });
fs.writeFileSync('assets/svg/seal.svg', standalone);
fs.writeFileSync('favicon.svg', standalone);
console.log('sprite', (sprite.length / 1024).toFixed(1), 'КБ');
