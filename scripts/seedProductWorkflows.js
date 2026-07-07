/**
 * Ukážkové výrobné workflow produktov.
 * Prvé je SAA-01 podľa zadania: Montáž → Zváranie → Kontrola po zvarani → Žíhanie → Kalibrácia.
 * Idempotentné (note: 'seed').
 */
const ProductWorkflow = require('../models/ProductWorkflow');

const WORKFLOWS = [
  {
    code: 'SAA-01', product: 'Snímač SAA-01',
    steps: [
      { name: 'Montáž',               station: 'Linka A — montáž' },
      { name: 'Zváranie',             station: 'Zváracie pracovisko' },
      { name: 'Kontrola po zvarani',  station: 'Kontrola' },
      { name: 'Žíhanie',              station: 'Pec / žíhanie' },
      { name: 'Kalibrácia',           station: 'Pracovisko kalibrácia' },
    ]
  },
  {
    code: 'SAA-02', product: 'Snímač SAA-02',
    steps: [
      { name: 'Montáž',               station: 'Linka A — montáž' },
      { name: 'Lepenie',              station: 'Linka B — lepenie' },
      { name: 'Vytvrdzovanie',        station: 'Pec / vytvrdzovanie' },
      { name: 'Kalibrácia',           station: 'Pracovisko kalibrácia' },
      { name: 'Výstupná kontrola',    station: 'Kontrola' },
      { name: 'Balenie a expedícia',  station: 'Expedícia' },
    ]
  },
  {
    code: 'FT-100', product: 'FBG senzor teploty FT-100',
    steps: [
      { name: 'Rezanie a príprava kábla', station: 'Linka A — montáž' },
      { name: 'Montáž optiky',            station: 'Pracovisko optika' },
      { name: 'Zváranie vlákien',         station: 'Zváracie pracovisko' },
      { name: 'Žíhanie',                  station: 'Pec / žíhanie' },
      { name: 'Kalibrácia TEMP',          station: 'Pracovisko kalibrácia' },
      { name: 'Výstupná kontrola',        station: 'Kontrola' },
    ]
  },
];

async function seedProductWorkflows() {
  await ProductWorkflow.deleteMany({ note: 'seed' });
  const docs = WORKFLOWS.map(w => ({
    code: w.code, product: w.product, note: 'seed',
    steps: w.steps.map(s => ({ name: s.name, station: s.station || '', note: '', status: 'pending' }))
  }));
  const created = await ProductWorkflow.insertMany(docs);
  const steps = created.reduce((s, w) => s + w.steps.length, 0);
  return { workflows: created.length, steps };
}

module.exports = { seedProductWorkflows };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Výrobné workflow:', await seedProductWorkflows());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
