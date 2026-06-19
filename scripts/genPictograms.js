/**
 * Generátor PNG piktogramov pre upozornenia (BOZP) a ochranné pomôcky (OOPP).
 * Vstup: vektorové SVG (definované nižšie) → výstup: public/assets/pictograms/*.png
 * Spustenie (jednorazovo pri zmene ikon):  node scripts/genPictograms.js
 * Vyžaduje len pri generovaní:  npm i --no-save @resvg/resvg-js
 *
 * Runtime appky tieto PNG NEgeneruje — sú commitnuté ako statické assety a Word
 * export ich vkladá cez /assets/pictograms/... (žiadna native závislosť na serveri).
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT = path.join(__dirname, '..', 'public', 'assets', 'pictograms');
fs.mkdirSync(OUT, { recursive: true });

const SIZE = 128;            // rozlíšenie PNG (zobrazuje sa v dokumente menšie)
const Y = '#F5C518';        // výstražná žltá
const K = '#1A1A1A';        // čierna (symbol + okraj trojuholníka)
const B = '#0A66C2';        // modrá (OOPP)
const W = '#FFFFFF';        // biela (symbol OOPP)

// Výstražný trojuholník (žltý, čierny okraj) + čierny symbol vnútri
const warn = (symbol) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,9 92,82 8,82" fill="${Y}" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
  <g fill="${K}" stroke="${K}">${symbol}</g>
</svg>`;

// OOPP — modrý kruh + biely symbol
const ppe = (symbol) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="46" fill="${B}"/>
  <g fill="${W}" stroke="${W}">${symbol}</g>
</svg>`;

// ── Symboly upozornení (kreslené v dolnej časti trojuholníka, ~ stred y=60) ──
const excl = '<rect x="46" y="40" width="8" height="24" rx="3" stroke="none"/><circle cx="50" cy="73" r="5" stroke="none"/>';
const WARN = {
  general:    excl,
  manipulacia: excl,
  chemikalia:
    '<path d="M45 38h10v13l11 21a4 4 0 0 1-4 6H38a4 4 0 0 1-4-6l11-21z" fill="none" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="M41 60h18" stroke-width="5"/><rect x="44" y="34" width="12" height="5" rx="2" stroke="none"/>',
  horlavina:
    '<path d="M50 38c9 9 13 14 13 23a13 13 0 0 1-26 0c0-7 5-11 7-15 1 4 3 6 5 5-2-5-2-9 1-13z" stroke="none"/>',
  elektrina:
    '<path d="M55 37 36 63h11l-3 18 21-28H53z" stroke="none"/>',
  horuce:
    '<path d="M33 72h34" stroke-width="6" fill="none"/>' +
    '<path d="M40 64c4-4 4-8 0-12M50 64c4-4 4-8 0-12M60 64c4-4 4-8 0-12" stroke-width="5" fill="none" stroke-linecap="round"/>',
  ostre:
    '<path d="M34 70 66 41l3 6-26 28z" stroke="none"/><rect x="31" y="67" width="12" height="7" rx="2" stroke="none" transform="rotate(-3 37 70)"/>',
  tazke:
    '<path d="M41 51h18l4 25H37z" stroke="none"/><path d="M45 51c1-9 9-9 10 0" stroke-width="4" fill="none"/>',
  vybuch:
    '<path d="M50 35 56 49 70 44 63 57 75 63 61 66 65 80 53 71 50 84 46 71 34 79 38 65 25 62 37 56 30 44 44 49z" stroke="none"/>',
  biologicke:
    '<circle cx="50" cy="50" r="6" stroke="none"/>' +
    '<path d="M50 44a14 14 0 0 1 12 7M50 44a14 14 0 0 0-12 7M44 60a14 14 0 0 0 12 0" fill="none" stroke-width="5"/>' +
    '<circle cx="50" cy="40" r="3.5" stroke="none"/><circle cx="38" cy="62" r="3.5" stroke="none"/><circle cx="62" cy="62" r="3.5" stroke="none"/>',
  ziarenie:
    '<circle cx="50" cy="62" r="5" stroke="none"/>' +
    '<path d="M50 62 41 44a20 20 0 0 1 18 0z" stroke="none"/>' +
    '<path d="M50 62 32 70a20 20 0 0 1-9-16z" stroke="none"/>' +
    '<path d="M50 62 68 70a20 20 0 0 0 9-16z" stroke="none"/>',
  pad:
    '<circle cx="58" cy="44" r="5" stroke="none"/>' +
    '<path d="M58 50 50 60l8 6M58 56l8 4" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M30 74h40" stroke-width="5"/><path d="M34 74l6-8M44 74l5-6" stroke-width="4"/>',
};

// ── Symboly OOPP (biele na modrom kruhu) ──
const PPE = {
  okuliare:
    '<rect x="26" y="42" width="20" height="15" rx="7" stroke="none"/>' +
    '<rect x="54" y="42" width="20" height="15" rx="7" stroke="none"/>' +
    '<path d="M46 49h8" stroke-width="4"/><path d="M26 47l-6-3M74 47l6-3" stroke-width="4" stroke-linecap="round"/>',
  rukavice:
    '<path d="M37 74V52c0-7 7-7 7 0v-4c0-7 7-7 7 0v2c0-6 7-6 7 0v3c0-5 6-5 6 0v15a9 9 0 0 1-9 9z" stroke="none"/>',
  helma:
    '<path d="M27 60a23 23 0 0 1 46 0z" stroke="none"/><rect x="22" y="60" width="56" height="7" rx="3" stroke="none"/>' +
    '<rect x="46" y="38" width="8" height="6" rx="2" stroke="none"/>',
  respirator:
    '<path d="M30 48c13-7 27-7 40 0v6c0 12-13 18-20 18s-20-6-20-18z" stroke="none"/>' +
    '<path d="M30 56h40" stroke="#0A66C2" stroke-width="3"/><circle cx="50" cy="63" r="4" fill="#0A66C2" stroke="none"/>',
  sluch:
    '<path d="M30 52a20 20 0 0 1 40 0" fill="none" stroke-width="6"/>' +
    '<rect x="25" y="50" width="13" height="24" rx="5" stroke="none"/><rect x="62" y="50" width="13" height="24" rx="5" stroke="none"/>',
  obuv:
    '<path d="M34 36h9v20l18 7a5 5 0 0 1-2 9H34a3 3 0 0 1-3-3V39a3 3 0 0 1 3-3z" stroke="none"/>',
  vesta:
    '<path d="M40 34l-10 7 5 9 5-3v25h20V47l5 3 5-9-10-7z" stroke="none"/>' +
    '<path d="M50 41v34" stroke="#0A66C2" stroke-width="3"/>',
  stit:
    '<circle cx="50" cy="44" r="9" stroke="none"/>' +
    '<path d="M31 44a19 19 0 0 1 38 0v20H31z" fill="none" stroke-width="5"/>',
  plast:
    '<path d="M41 34h18v8l7 5v29H34V47l7-5z" stroke="none"/>' +
    '<path d="M50 34v40" stroke="#0A66C2" stroke-width="3"/>',
};

let n = 0;
const render = (name, svg) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE }, background: 'rgba(0,0,0,0)' }).render().asPng();
  fs.writeFileSync(path.join(OUT, name + '.png'), png);
  n++;
};

Object.entries(WARN).forEach(([k, s]) => render('warn_' + k, warn(s)));
Object.entries(PPE).forEach(([k, s]) => render('ppe_' + k, ppe(s)));
console.log(`Vygenerovaných ${n} piktogramov → ${OUT}`);
