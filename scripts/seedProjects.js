/**
 * Ukážkové projekty pre modul Vývoj výrobkov.
 * Každý projekt má SÚČASNE predajný aj vývojový proces + stav štandardných výstupov.
 * Idempotentné — zmaže predošlé ukážkové (kód P-20xx) a vygeneruje nové.
 */
const Project = require('../models/Project');

const SALES = ['lead', 'kvalifikacia', 'ponuka', 'vyjednavanie', 'objednavka', 'uzavrete'];
const DEV = ['koncept', 'prototyp', 'testovanie', 'vyroba', 'ukoncene'];
const DELIV = ['boo', 'bom', 'datasheet_web', 'std_wavelength', 'test_protocol', 'calibration', 'routing', 'erp_card', 'marketing'];
const OWNERS = ['M. Horák', 'P. Kováč', 'J. Novák', 'Lab'];
const PRIOS = ['low', 'normal', 'normal', 'high'];

const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dPlus = d => { const x = new Date(); x.setDate(x.getDate() + d); return x; };

// názov + kód; procesy a výstupy sa dogenerujú
const DEFS = [
  ['FOS senzor teploty X1', 'P-2026-01', ['optika', 'teplota']],
  ['Vlhkostný senzor H2', 'P-2026-02', ['vlhkosť']],
  ['Optický merač strát', 'P-2025-11', ['optika', 'meranie']],
  ['Kalibračná stanica v2', 'P-2026-03', ['kalibrácia']],
  ['Senzor vibrácií', 'P-2025-08', ['vibrácie', 'FBG']],
  ['FBG tlakový senzor PT-01', 'P-2026-04', ['tlak', 'FBG']],
  ['Senzor pretvorenia betónu BC-02', 'P-2026-05', ['strain', 'beton']],
  ['Distribuovaný senzor DTS-100', 'P-2025-14', ['DTS', 'raman']],
  ['Smart zátkový senzor SB-03', 'P-2026-06', ['smart', 'vstavba']],
  ['Optický akcelerometer OA-01', 'P-2025-10', ['akcelerometer', 'seizmika']],
  ['Multiplexér 16-kanálový MX-16', 'P-2026-07', ['multiplex', 'WDM']],
  ['FBG dotazovač nxt gen QT-2', 'P-2026-08', ['interrogator', 'nxtgen']],
  ['Káblový teplomer CT-01', 'P-2025-12', ['teplota', 'kabel']],
  ['Senzor bočného posunu LP-05', 'P-2025-09', ['posun', 'inklinometer']],
  ['Optický korelátor OC-01', 'P-2026-09', ['korelator', 'research']],
];

// hotové stupne — niekedy postupne (prefix), inokedy nepostupne (náhodný podmnožinový výber)
function doneStages(arr) {
  if (Math.random() < 0.5) return arr.slice(0, ri(0, arr.length));      // postupný prefix
  return arr.filter(() => Math.random() < 0.55);                         // nepostupné
}
function repOf(arr, done) {
  let best = -1; done.forEach(k => { const i = arr.indexOf(k); if (i > best) best = i; });
  return best >= 0 ? arr[best] : arr[0];
}

function build([title, code, tags]) {
  const salesDone = doneStages(SALES);
  const devDone = doneStages(DEV);
  const salesStage = repOf(SALES, salesDone);
  const devStage = repOf(DEV, devDone);
  // počet hotových výstupov rastie s pokrokom vo vývoji
  const di = DEV.indexOf(devStage);
  const n = Math.max(0, Math.min(DELIV.length, Math.round((di + 1) / DEV.length * DELIV.length) + ri(-1, 1)));
  const deliverables = DELIV.slice(0, n);
  return {
    title, code, tags,
    salesStage, devStage, salesDone, devDone,
    workflow: 'development', phase: devStage,    // legacy/analytika
    owner: pick(OWNERS), priority: pick(PRIOS),
    startDate: dPlus(-ri(20, 120)),
    deadline: Math.random() < 0.7 ? dPlus(ri(10, 120)) : null,
    deliverables,
    folder: `G:\\Projekty\\FOS\\${code}`,
    notes: 'seed',
  };
}

async function seedProjects() {
  await Project.deleteMany({ code: { $regex: '^P-20' } });
  const docs = DEFS.map(build);
  await Project.insertMany(docs);
  return { inserted: docs.length };
}

module.exports = { seedProjects };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Projekty:', await seedProjects());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
