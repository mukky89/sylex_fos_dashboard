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
const PRIOS = ['low', 'normal', 'normal', 'high', 'urgent'];
// Obchodníci — kto má odoslať kalibračné listy k expedovaným výrobkom
const SALES = ['M. Baláž', 'K. Danišová', 'R. Polák', 'T. Végh'];
// Senzorové/meracie výrobky, ku ktorým sa vydávajú kalibračné listy
const CALIBRATED = ['FBG senzor', 'Strain senzor', 'Vlhkostný senzor', 'Tlakový senzor', 'Káblový teplomer', 'DTS sonda', 'Interrogátor'];
const needsCalibration = product => CALIBRATED.some(c => product.startsWith(c));

const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const dayMs = 864e5;

async function seedProduction() {
  await ProductionOrder.deleteMany({ note: 'seed' });
  const today = new Date(new Date().toDateString()).getTime();
  const year = new Date().getFullYear();
  const docs = [];

  // Rozdelenie fáz — realistickejšie: väčšina aktívnych, časť hotová/expedovaná
  // (12 expedovaných na naplnenie kalendára expedície a kalibračných listov)
  const plan = [
    ...Array(4).fill('plan'), ...Array(4).fill('material'),
    ...Array(7).fill('production'), ...Array(4).fill('qc'),
    ...Array(3).fill('done'), ...Array(12).fill('shipped')
  ];

  plan.forEach((stage, i) => {
    const product = pick(PRODUCTS);
    const qtyPlanned = ri(5, 200);
    let qtyDone = 0;
    if (stage === 'done' || stage === 'shipped') qtyDone = qtyPlanned;
    else if (stage === 'production' || stage === 'qc') qtyDone = ri(0, qtyPlanned);

    // Realistické termíny podľa fázy
    let start, due, shippedDate = null, producedDate = null;
    if (stage === 'shipped') {
      // expedované v posledných ~30 dňoch
      const shipOff = -ri(1, 30);
      shippedDate = new Date(today + shipOff * dayMs);
      due = new Date(today + (shipOff + ri(-3, 3)) * dayMs);   // termín okolo dátumu expedície
      start = new Date(today + (shipOff - ri(8, 20)) * dayMs);
      producedDate = new Date(today + (shipOff - ri(0, 3)) * dayMs);
    } else if (stage === 'done') {
      // vyrobené, čaká na expedíciu v najbližších dňoch
      producedDate = new Date(today - ri(0, 4) * dayMs);
      due = new Date(today + ri(1, 7) * dayMs);
      start = new Date(today - ri(8, 18) * dayMs);
    } else {
      // aktívne zákazky — realistické meškanie: väčšina v termíne, menšina mierne mešká
      const dur = ri(4, 16);
      let dueOff;
      const r = Math.random();
      if (r < 0.18) dueOff = -ri(1, 6);          // ~18 % mierne po termíne (1–6 dní)
      else if (r < 0.28) dueOff = -ri(7, 14);    // ~10 % výraznejšie mešká (7–14 dní)
      else dueOff = ri(0, 24);                    // zvyšok v termíne / do budúcna
      due = new Date(today + dueOff * dayMs);
      start = new Date(today + (dueOff - dur) * dayMs);
    }

    // Kalibračné listy — len merací/senzorový sortiment
    const calibrationRequired = (stage === 'shipped' || stage === 'done') && needsCalibration(product);
    let calibrationStatus = 'pending', calibrationOwner = '', calibrationSentDate = null;
    if (calibrationRequired) {
      calibrationOwner = pick(SALES);
      if (stage === 'shipped' && Math.random() < 0.55) {
        // časť expedovaných už má odoslané kalibračné listy
        calibrationStatus = 'sent';
        calibrationSentDate = new Date((shippedDate?.getTime() || today) + ri(0, 5) * dayMs);
      }
    }

    docs.push({
      number: `VZ-${year}-${String(i + 1).padStart(3, '0')}`,
      product, customer: pick(CUSTOMERS), salesOrder: 'OBJ-' + year + '-' + String(ri(10, 99)),
      qtyPlanned, qtyDone, unit: 'ks',
      workstation: pick(LINES), assignee: pick(['M. Horák', 'P. Kováč', 'J. Novák', 'Lab', 'A. Tichý']),
      priority: pick(PRIOS), stage,
      start, due, producedDate, shippedDate,
      calibrationRequired, calibrationStatus, calibrationOwner, calibrationSentDate,
      progress: qtyPlanned ? Math.round(qtyDone / qtyPlanned * 100) : 0,
      note: 'seed', order: i
    });
  });

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
