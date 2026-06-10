/**
 * Ukážkové technologické postupy (normované operácie).
 * Prvý postup je presne podľa reálnej tabuľky Technológia (DBFOS).
 * Ďalšie postupy zodpovedajú výrobkom zo seedu výroby — aby fungoval Gantt
 * (rozvrh operácií × pracoviská). Idempotentné (note: 'seed').
 */
const Routing = require('../models/Routing');

// [group, code, desc, tPiece(min), qty, line, machine]
const DBFOS_OPS = [
  ['02', '1-01-08-01-01-000', 'Rezanie kabla rucne v zlabe - bez cievky', 0.63, 1, 'Rezanie', false],
  ['03', '1-23-52-00-00-001', 'Denexovanie (všetko)', 1, 1, 'FOS', false],
  ['03', '1-23-53-00-00-000', 'Výstupná kontrola DBFOS', 3, 1, 'FOS', false],
  ['03', '1-23-21-00-00-009', 'Priprava vlakna na DENEX', 5, 1, 'FOS', false],
  ['03', '1-23-54-00-00-003', 'Balenie ine', 5, 1, 'FOS', false],
  ['03', '1-23-05-00-00-000', 'WCP-01 skladanie / 2ks', 1.5, 1, 'FOS', false],
  ['03', '1-23-21-00-00-001', 'Aplikovanie UV/RTV // Loctite 9492', 5, 1, 'FOS', false],
  ['03', '1-23-21-00-00-002', 'Montáž snímača po DENEX', 5, 1, 'FOS', false],
  ['03', '1-23-21-00-00-003', 'Privarenie kapilar k mechanickym dielom', 5, 1, 'FOS', false],
  ['03', '1-23-21-00-00-005', 'Priprava a osadenie pigtail connections na kabel', 5, 1, 'FOS', false],
  ['03', '1-23-49-00-00-001', 'Kalibracia STRAIN', 10, 1, 'FOS', false],
  ['03', '1-23-49-00-00-006', 'Kalibracia TEMP', 2, 1, 'FOS', false],
  ['04', '1-23-17-00-00-002', 'FC/APC 8 - leštenie - 18pol. Jig', 0.561, 1, 'FOS', false],
  ['04', '1-23-50-00-00-001', 'Konektorovanie FC/APC', 0.313, 1, 'FOS', false],
  ['04', '1-23-51-00-00-001', 'Stripovanie v kyseline sírovej (konektor+zvar)', 3, 1, 'FOS', false],
  ['04', '1-23-18-00-00-001', 'EFG SX', 1.118, 1, 'FOS', false],
  ['04', '1-23-20-00-00-001', 'VK SX', 0.829, 1, 'FOS', false],
  ['05', '1-91-01-00-00-003', 'Denex 9h', 540, 1, 'Strojový čas', true],
  ['05', '1-91-01-00-00-004', 'Teplotná kalibrácia 36h', 2160, 1, 'Strojový čas', true],
  ['05', '1-91-01-00-00-005', 'Žíhanie 30h', 1800, 1, 'Strojový čas', true],
];

const ROUTINGS = [
  { product: 'DBFOS senzor (STRAIN/TEMP)', code: '1-23-DBFOS', coeff: 1.1, ops: DBFOS_OPS },
  {
    product: 'FBG senzor teploty FT-100', code: 'FT-100', coeff: 1.1, ops: [
      ['02', 'FT-010', 'Rezanie a príprava kábla', 0.8, 1, 'Linka A — montáž', false],
      ['03', 'FT-020', 'Príprava vlákna', 4, 1, 'Linka A — montáž', false],
      ['03', 'FT-030', 'Lepenie / fixácia snímača', 3, 1, 'Linka B — lepenie', false],
      ['03', 'FT-040', 'Montáž optiky', 5, 1, 'Pracovisko optika', false],
      ['05', 'FT-050', 'Vytvrdzovanie 4h', 240, 1, 'Pec / vytvrdzovanie', true],
      ['04', 'FT-060', 'Kalibrácia TEMP', 6, 1, 'Pracovisko kalibrácia', false],
      ['04', 'FT-070', 'Výstupná kontrola', 2, 1, 'Pracovisko kalibrácia', false],
      ['05', 'FT-080', 'Balenie a expedícia', 2, 1, 'Expedícia', false],
    ]
  },
  {
    product: 'Strain senzor SC-01', code: 'SC-01', coeff: 1.1, ops: [
      ['02', 'SC-010', 'Rezanie a príprava kábla', 0.7, 1, 'Linka A — montáž', false],
      ['03', 'SC-020', 'Príprava vlákna', 4, 1, 'Linka A — montáž', false],
      ['03', 'SC-030', 'Lepenie tenzometra', 4, 1, 'Linka B — lepenie', false],
      ['05', 'SC-040', 'Vytvrdzovanie 3h', 180, 1, 'Pec / vytvrdzovanie', true],
      ['04', 'SC-050', 'Kalibrácia STRAIN', 10, 1, 'Pracovisko kalibrácia', false],
      ['04', 'SC-060', 'Výstupná kontrola', 2, 1, 'Pracovisko kalibrácia', false],
      ['05', 'SC-070', 'Balenie a expedícia', 2, 1, 'Expedícia', false],
    ]
  },
  {
    product: 'Optický kábel OC-12', code: 'OC-12', coeff: 1.1, ops: [
      ['02', 'OC-010', 'Rezanie kábla na dĺžku', 0.6, 1, 'Linka A — montáž', false],
      ['04', 'OC-020', 'Konektorovanie FC/APC', 3, 1, 'Pracovisko optika', false],
      ['04', 'OC-030', 'Leštenie konektorov', 1.2, 1, 'Pracovisko optika', false],
      ['04', 'OC-040', 'Meranie útlmu', 2, 1, 'Pracovisko kalibrácia', false],
      ['05', 'OC-050', 'Balenie a expedícia', 1, 1, 'Expedícia', false],
    ]
  },
  {
    product: 'Interrogátor S-line 4CH', code: 'SL-4CH', coeff: 1.1, ops: [
      ['03', 'IG-010', 'Montáž HW', 60, 1, 'Linka A — montáž', false],
      ['03', 'IG-020', 'Nahratie firmware', 20, 1, 'Linka A — montáž', false],
      ['04', 'IG-030', 'Kalibrácia kanálov', 90, 1, 'Pracovisko kalibrácia', false],
      ['05', 'IG-040', 'Záťažový test 12h', 720, 1, 'Pec / vytvrdzovanie', true],
      ['04', 'IG-050', 'Výstupná kontrola', 30, 1, 'Pracovisko kalibrácia', false],
      ['05', 'IG-060', 'Balenie a expedícia', 15, 1, 'Expedícia', false],
    ]
  },
];

async function seedRoutings() {
  await Routing.deleteMany({ note: 'seed' });
  const docs = ROUTINGS.map(r => ({
    product: r.product, code: r.code, coeff: r.coeff, note: 'seed',
    operations: r.ops.map(([group, code, desc, tPiece, qty, line, machine]) => ({ group, code, desc, tPiece, qty, line, machine, opNote: '' }))
  }));
  const created = await Routing.insertMany(docs);
  const operations = created.reduce((s, r) => s + r.operations.length, 0);
  return { routings: created.length, operations };
}

module.exports = { seedRoutings };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Technologické postupy:', await seedRoutings());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
