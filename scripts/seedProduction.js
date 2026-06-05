/**
 * Náhodné ukážkové výrobné zákazky pre modul Plánovanie výroby.
 * Idempotentné — zmaže predošlé ukážkové (note: 'seed') a vygeneruje nové.
 */
const ProductionOrder = require('../models/ProductionOrder');

const PRODUCTS = [
  'FBG senzor teploty FT-100', 'Strain senzor SC-01', 'Optický kábel OC-12',
  'Interrogátor S-line 4CH', 'Vlhkostný senzor H2', 'Tlakový senzor PT-01',
  'Multiplexér MX-16', 'Káblový teplomer CT-01', 'DTS sonda 100 m', 'Konektorový panel FC/APC'
];
const CUSTOMERS = ['US CONEC', 'Optics11', 'Viaphoton', 'Corning', 'Huber+Suhner', 'Senko', 'II-VI', 'Fraunhofer IZM'];
const LINES = ['Linka A — montáž', 'Linka B — lepenie', 'Pracovisko optika', 'Pracovisko kalibrácia', 'Expedícia'];
const STAGES = ['plan', 'material', 'production', 'qc', 'done', 'shipped'];
const PRIOS = ['low', 'normal', 'normal', 'high', 'urgent'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

async function seedProduction() {
  await ProductionOrder.deleteMany({ note: 'seed' });
  const now = Date.now();
  const year = new Date().getFullYear();
  const docs = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const stage = pick(STAGES);
    const qtyPlanned = ri(5, 200);
    let qtyDone = 0;
    if (stage === 'done' || stage === 'shipped') qtyDone = qtyPlanned;
    else if (stage === 'production' || stage === 'qc') qtyDone = ri(0, qtyPlanned);
    const startOff = ri(-10, 20), dur = ri(2, 18);
    docs.push({
      number: `VZ-${year}-${String(i + 1).padStart(3, '0')}`,
      product: pick(PRODUCTS), customer: pick(CUSTOMERS), salesOrder: 'OBJ-' + year + '-' + String(ri(10, 99)),
      qtyPlanned, qtyDone, unit: 'ks',
      workstation: pick(LINES), assignee: pick(['M. Horák', 'P. Kováč', 'J. Novák', 'Lab', 'A. Tichý']),
      priority: pick(PRIOS), stage,
      start: new Date(now + startOff * 864e5),
      due: new Date(now + (startOff + dur) * 864e5),
      progress: qtyPlanned ? Math.round(qtyDone / qtyPlanned * 100) : 0,
      note: 'seed', order: i
    });
  }
  await ProductionOrder.insertMany(docs);
  return { inserted: docs.length };
}

module.exports = { seedProduction };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Výrobné zákazky:', await seedProduction());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
