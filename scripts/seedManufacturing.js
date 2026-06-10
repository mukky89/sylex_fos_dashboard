/**
 * Ukážkové dáta pre modul Riadenie výroby (pracoviská + zmenové výkazy).
 * Idempotentné — zmaže predošlé ukážkové (note: 'seed') a vygeneruje nové.
 */
const WorkCenter = require('../models/WorkCenter');
const ShiftReport = require('../models/ShiftReport');

const CENTERS = [
  { name: 'Linka A — montáž',      code: 'WC-01', kind: 'line',       ratedCapacity: 28, shiftTarget: 200, location: 'Hala 1' },
  { name: 'Linka B — lepenie',     code: 'WC-02', kind: 'line',       ratedCapacity: 22, shiftTarget: 160, location: 'Hala 1' },
  { name: 'Pracovisko optika',     code: 'WC-03', kind: 'assembly',   ratedCapacity: 14, shiftTarget: 90,  location: 'Hala 2' },
  { name: 'Pracovisko kalibrácia', code: 'WC-04', kind: 'inspection', ratedCapacity: 18, shiftTarget: 120, location: 'Lab' },
  { name: 'Pec / vytvrdzovanie',   code: 'WC-05', kind: 'machine',    ratedCapacity: 40, shiftTarget: 280, location: 'Hala 2' },
  { name: 'Expedícia',             code: 'WC-06', kind: 'manual',     ratedCapacity: 50, shiftTarget: 300, location: 'Sklad' }
];
const STATUSES = ['running', 'running', 'running', 'setup', 'idle', 'maintenance', 'down'];
const PRODUCTS = ['FBG senzor FT-100', 'Strain senzor SC-01', 'Optický kábel OC-12', 'Vlhkostný senzor H2', 'Tlakový senzor PT-01'];
const OPERATORS = ['M. Horák', 'P. Kováč', 'J. Novák', 'A. Tichý', 'L. Marek'];
const DT_REASONS = ['none', 'breakdown', 'setup', 'material', 'quality', 'noOperator', 'changeover'];
const SHIFTS = ['R', 'P', 'N'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

async function seedManufacturing() {
  await WorkCenter.deleteMany({ note: 'seed' });
  await ShiftReport.deleteMany({ note: 'seed' });

  // Pracoviská
  const centers = CENTERS.map((c, i) => ({
    ...c,
    status: pick(STATUSES),
    currentOrder: Math.random() > 0.4 ? `VZ-${new Date().getFullYear()}-${String(ri(1, 16)).padStart(3, '0')}` : '',
    operator: pick(OPERATORS),
    statusSince: new Date(Date.now() - ri(5, 240) * 60000),
    order: i, active: true, note: 'seed'
  }));
  await WorkCenter.insertMany(centers);

  // Zmenové výkazy za posledných 14 dní
  const docs = [];
  for (let d = 13; d >= 0; d--) {
    const day = new Date(); day.setDate(day.getDate() - d); day.setHours(6, 0, 0, 0);
    const nShifts = d === 0 ? 1 : ri(2, 3);
    for (let s = 0; s < nShifts; s++) {
      const c = pick(CENTERS);
      const planned = 480;
      const downtime = Math.random() > 0.45 ? ri(10, 110) : 0;
      const runtimeH = (planned - downtime) / 60;
      const ideal = Math.round(c.ratedCapacity * runtimeH);
      const good = Math.max(0, ideal - ri(0, Math.round(ideal * 0.25)));
      const scrap = ri(0, Math.round(good * 0.08));
      docs.push({
        date: day, shift: SHIFTS[s] || pick(SHIFTS),
        workCenter: c.name, product: pick(PRODUCTS),
        orderNumber: `VZ-${day.getFullYear()}-${String(ri(1, 16)).padStart(3, '0')}`,
        plannedMinutes: planned, downtimeMinutes: downtime,
        downtimeReason: downtime ? pick(DT_REASONS.filter(r => r !== 'none')) : 'none',
        idealRate: c.ratedCapacity, goodQty: good, scrapQty: scrap, targetQty: c.shiftTarget,
        operator: pick(OPERATORS), note: 'seed'
      });
    }
  }
  await ShiftReport.insertMany(docs);
  return { centers: centers.length, reports: docs.length };
}

module.exports = { seedManufacturing };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Riadenie výroby:', await seedManufacturing());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
