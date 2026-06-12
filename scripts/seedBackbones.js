/**
 * Ukážkové backbone topológie (podľa reálnej schémy Backbones — CB OA77 / CB OA79).
 * Idempotentné — zmaže predošlé ukážkové (note: 'seed') a vygeneruje nové.
 */
const Backbone = require('../models/Backbone');

// definícia: root + splittre, každý so svojím káblom (fibers @ length) a senzorovými reťazcami
const DEFS = [
  {
    name: 'CB OA77',
    splitters: [
      { label: 'CB OA77-AB-Am', fibers: 4, length: 5,  sensors: ['8 x SWA-00', '8 x SWA-00', '8 x SWA-00', '8 x SWA-00 + 1 x TP03'] },
      { label: 'CB OA77-AB-Av', fibers: 4, length: 25, sensors: ['8 x SWA-00', '8 x SWA-00', '8 x SWA-00', '8 x SWA-00 + 1 x TP03'] },
      { label: 'CB OA77-C-Av',  fibers: 1, length: 40, sensors: ['8 x SWA-00 + 1 x TP03'] },
    ]
  },
  {
    name: 'CB OA79',
    splitters: [
      { label: 'CB OA79-AB-Am', fibers: 4, length: 5,  sensors: ['8 x SWA-00', '8 x SWA-00', '8 x SWA-00', '8 x SWA-00 + 1 x TP03'] },
      { label: 'CB OA79-AB-Av', fibers: 4, length: 25, sensors: ['8 x SWA-00', '8 x SWA-00', '8 x SWA-00', '8 x SWA-00 + 1 x TP03'] },
    ]
  }
];

const SENS_H = 34, GROUP_GAP = 26;
const COL_ROOT = 40, COL_SPLIT = 320, COL_SENS = 640;

function build(def) {
  const nodes = [], links = [];
  let y = 60, lid = 0;
  const splitterYs = [];
  def.splitters.forEach((sp, si) => {
    const sid = 's' + si;
    const startY = y;
    sp.sensors.forEach((txt, li) => {
      const nid = `l${si}_${li}`;
      nodes.push({ nid, type: 'sensors', label: txt, x: COL_SENS, y });
      links.push({ lid: 'k' + (lid++), from: sid, to: nid, fibers: 1, length: 0, label: '' });
      y += SENS_H;
    });
    const splitterY = startY + (sp.sensors.length - 1) * SENS_H / 2;
    splitterYs.push(splitterY);
    nodes.push({ nid: sid, type: 'splitter', label: sp.label, x: COL_SPLIT, y: splitterY });
    links.push({ lid: 'k' + (lid++), from: 'root', to: sid, fibers: sp.fibers, length: sp.length, label: '' });
    y += GROUP_GAP;
  });
  const rootY = (splitterYs[0] + splitterYs[splitterYs.length - 1]) / 2;
  nodes.push({ nid: 'root', type: 'interrogator', label: def.name, x: COL_ROOT, y: rootY });
  return { name: def.name, nodes, links, note: 'seed' };
}

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
