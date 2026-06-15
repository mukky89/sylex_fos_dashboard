/**
 * Ukážkové backbone topológie pre FBG monitoring (Sylex S-line).
 * Realistické projekty štruktúrneho/geotechnického monitoringu, aby zákazník
 * pochopil zapojenie: interrogátor → switch/splitter → WCB skrine → FBG senzory
 * podľa meranej veličiny, s WDM kanálmi a dĺžkami káblov.
 * Idempotentné — zmaže predošlé ukážkové (note: 'seed') a vygeneruje nové.
 */
const Backbone = require('../models/Backbone');

const COL = { interr: 40, dist: 250, box: 500, sens: 790 };
const SH = 42, GROUP_GAP = 30;

// Postaví topológiu z deklaratívneho popisu (vetvy = kanály do WCB skríň + reťazce senzorov)
function build(def) {
  const nodes = [], links = [];
  let y = 56, k = 0;
  const boxYs = [];
  def.branches.forEach((b, bi) => {
    const bid = 'b' + bi, start = y;
    b.sensors.forEach((s, si) => {
      const nid = 'b' + bi + 's' + si;
      nodes.push({ nid, type: s.t, label: s.l, x: COL.sens, y });
      links.push({ lid: 'k' + (k++), from: bid, to: nid, fibers: 1, length: s.len || 0, label: s.wl || '', parts: s.parts || [] });
      y += SH;
    });
    const boxY = start + (b.sensors.length - 1) * SH / 2;
    boxYs.push(boxY);
    nodes.push({ nid: bid, type: b.box || 'wcb', label: b.l, x: COL.box, y: boxY });
    links.push({ lid: 'k' + (k++), from: 'dist', to: bid, fibers: b.fibers || 1, length: b.length || 0, label: b.wl || '', parts: b.parts || ['WCP-01'] });
    y += GROUP_GAP;
  });
  const midY = (boxYs[0] + boxYs[boxYs.length - 1]) / 2;
  nodes.push({ nid: 'dist', type: def.dist.t, label: def.dist.l, x: COL.dist, y: midY });
  links.push({ lid: 'k' + (k++), from: 'interr', to: 'dist', fibers: def.trunk.fibers || 1, length: def.trunk.length || 0, label: def.trunk.wl || '', parts: def.trunk.parts || ['conn'] });
  nodes.push({ nid: 'interr', type: def.interr.t, label: def.interr.l, x: COL.interr, y: midY });
  return { name: def.name, nodes, links, note: 'seed' };
}

const WDM = 'WDM 1529–1565 nm';

const DEFS = [
  // ── 1) Most — štruktúrny monitoring (SHM) ──────────────────────────────────
  {
    name: 'Most D1 — štruktúrny monitoring (SHM)',
    interr: { t: 'scan', l: 'S-line Scan 800' },
    dist: { t: 'switch1x4', l: 'S-line Switch 1×4' },
    trunk: { fibers: 1, length: 3, wl: 'patchcord', parts: ['conn'] },
    branches: [
      { l: 'WCB-01 · Pilier P1', fibers: 4, length: 38, wl: 'Ch1 · ' + WDM, parts: ['WCP-01'], sensors: [
        { t: 'sensorE', l: '4× pnutie — driek piliera P1', wl: '1531/35/39/43 nm' },
        { t: 'sensorT', l: '1× teplota — kompenzácia P1', wl: '1559 nm' } ] },
      { l: 'WCB-01 · Pilier P2', fibers: 4, length: 64, wl: 'Ch2 · ' + WDM, parts: ['WCP-01'], sensors: [
        { t: 'sensorE', l: '4× pnutie — driek piliera P2', wl: '1531/35/39/43 nm' },
        { t: 'sensorT', l: '1× teplota — kompenzácia P2', wl: '1559 nm' } ] },
      { l: 'WCB-01 · Mostovka stred', fibers: 4, length: 52, wl: 'Ch3 · ' + WDM, parts: ['WCP-01'], sensors: [
        { t: 'sensorA', l: '2× akcelerometer — dynamika', wl: '1530/1534 nm' },
        { t: 'sensorE', l: '3× pnutie — spodný pás', wl: '1540/44/48 nm' },
        { t: 'sensorT', l: '1× teplota — mostovka', wl: '1561 nm' } ] },
      { l: 'WCB-01 · Opora O1', fibers: 2, length: 26, wl: 'Ch4 · ' + WDM, parts: ['WCP-01'], sensors: [
        { t: 'sensorTilt', l: '2× náklon — opora O1', wl: '1532/1536 nm' },
        { t: 'sensorD', l: '1× posun — mostný záver', wl: '1550 nm' },
        { t: 'sensorT', l: '1× teplota — O1', wl: '1563 nm' } ] },
    ],
  },
  // ── 2) Tunel — geotechnický monitoring ─────────────────────────────────────
  {
    name: 'Tunel T2 — geotechnický monitoring',
    interr: { t: 'scan', l: 'S-line Scan 800' },
    dist: { t: 'switch1x8', l: 'S-line Switch 1×8' },
    trunk: { fibers: 1, length: 5, wl: 'patchcord', parts: ['conn'] },
    branches: [
      { l: 'WCB-01 · Profil TM1 (12+300)', fibers: 1, length: 120, wl: 'Ch1 · ' + WDM, parts: ['WPA-01'], sensors: [
        { t: 'sensorD', l: '5× konvergencia — klenba TM1', wl: '1530–1546 nm' },
        { t: 'sensorT', l: '1× teplota — TM1', wl: '1560 nm' } ] },
      { l: 'WCB-01 · Profil TM2 (12+560)', fibers: 1, length: 168, wl: 'Ch2 · ' + WDM, parts: ['WPA-01'], sensors: [
        { t: 'sensorD', l: '5× konvergencia — klenba TM2', wl: '1530–1546 nm' },
        { t: 'sensorE', l: '3× pnutie — ostenie TM2', wl: '1550/54/58 nm' } ] },
      { l: 'WCB-01 · Profil TM3 (12+820)', fibers: 1, length: 214, wl: 'Ch3 · ' + WDM, parts: ['WPA-01'], sensors: [
        { t: 'sensorD', l: '5× konvergencia — klenba TM3', wl: '1530–1546 nm' },
        { t: 'sensorTilt', l: '2× náklon — pätky klenby', wl: '1552/1556 nm' } ] },
    ],
  },
  // ── 3) Oporný múr / svah — monitoring stability ────────────────────────────
  {
    name: 'Oporný múr R7 — monitoring svahu',
    interr: { t: 'scan', l: 'S-line Scan 800' },
    dist: { t: 'splitter1x4', l: 'S-line Splitter 1×4' },
    trunk: { fibers: 1, length: 8, wl: 'patchcord', parts: ['conn'] },
    branches: [
      { l: 'WCB-01 · Inklinometer I1', fibers: 1, length: 45, wl: 'Ch1 · ' + WDM, parts: ['WPA-01'], sensors: [
        { t: 'sensorTilt', l: '6× náklon — vertikálny inklino I1', wl: '1530–1550 nm' },
        { t: 'sensorT', l: '1× teplota — I1', wl: '1560 nm' } ] },
      { l: 'WCB-01 · Inklinometer I2', fibers: 1, length: 72, wl: 'Ch2 · ' + WDM, parts: ['WPA-01'], sensors: [
        { t: 'sensorTilt', l: '6× náklon — vertikálny inklino I2', wl: '1530–1550 nm' },
        { t: 'sensorT', l: '1× teplota — I2', wl: '1560 nm' } ] },
      { l: 'WCB-01 · Päta múru', fibers: 2, length: 30, wl: 'Ch3 · ' + WDM, parts: ['WCP-01'], sensors: [
        { t: 'sensorP', l: '3× tlak — piezometre', wl: '1532/36/40 nm' },
        { t: 'sensorD', l: '2× posun — dilatačná škára', wl: '1548/1552 nm' } ] },
    ],
  },
];

async function seedBackbones() {
  await Backbone.deleteMany({ note: 'seed' });
  const docs = DEFS.map(build);
  await Backbone.insertMany(docs);
  return { inserted: docs.length, nodes: docs.reduce((s, d) => s + d.nodes.length, 0) };
}

module.exports = { seedBackbones };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Backbones:', await seedBackbones());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
