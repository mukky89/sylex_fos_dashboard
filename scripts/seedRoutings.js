/**
 * Ukážkový technologický postup (normované operácie) — presne podľa reálnej tabuľky Technológia.
 * Idempotentné — zmaže predošlé ukážkové (note: 'seed') a vygeneruje nové.
 */
const Routing = require('../models/Routing');

// [group, code, desc, tPiece(min), qty, line, machine]
const OPS = [
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

async function seedRoutings() {
  await Routing.deleteMany({ note: 'seed' });
  const operations = OPS.map(([group, code, desc, tPiece, qty, line, machine]) => ({ group, code, desc, tPiece, qty, line, machine, opNote: '' }));
  const doc = await Routing.create({
    product: 'DBFOS senzor (STRAIN/TEMP)',
    code: '1-23-DBFOS',
    coeff: 1.1,
    operations,
    note: 'seed'
  });
  return { routings: 1, operations: doc.operations.length };
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
