/**
 * Ukážkové predajné záznamy pre manažment analytiku (predaj / tržby / ziskovosť).
 * Idempotentné — zmaže predošlé ukážkové (note: 'seed') a vygeneruje nové za 12 mesiacov.
 */
const Sale = require('../models/Sale');

const CATALOG = [
  { product: 'FBG senzor teploty FT-100', category: 'FBG senzory',    price: 180, cost: 78,  qty: [4, 30] },
  { product: 'Strain senzor SC-01',        category: 'FBG senzory',    price: 145, cost: 64,  qty: [4, 40] },
  { product: 'Interrogátor S-line 4CH',    category: 'Interrogátory',  price: 9800, cost: 5200, qty: [1, 4] },
  { product: 'Interrogátor S-line 16CH',   category: 'Interrogátory',  price: 18500, cost: 9800, qty: [1, 3] },
  { product: 'Optický kábel OC-12',        category: 'Káble',          price: 42,  cost: 19,  qty: [10, 120] },
  { product: 'Konektorový panel FC/APC',   category: 'Káble',          price: 88,  cost: 41,  qty: [5, 30] },
  { product: 'DTS sonda 100 m',            category: 'FBG senzory',    price: 760, cost: 360, qty: [1, 8] },
  { product: 'Inštalácia & kalibrácia',    category: 'Služby',         price: 540, cost: 180, qty: [1, 6] },
  { product: 'Servisná zmluva (ročná)',    category: 'Služby',         price: 2400, cost: 700, qty: [1, 2] },
];
const CUSTOMERS = ['US CONEC', 'Optics11', 'Viaphoton', 'Corning', 'Huber+Suhner', 'Senko', 'II-VI', 'Fraunhofer IZM', 'CERN', 'Airbus'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

async function seedSales() {
  await Sale.deleteMany({ note: 'seed' });
  const docs = [];
  const now = new Date();
  let invN = 1000;
  for (let m = 11; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    // sezónny rast smerom k súčasnosti
    const n = ri(8, 16) + Math.round((11 - m) * 0.6);
    for (let i = 0; i < n; i++) {
      const it = pick(CATALOG);
      const qty = ri(it.qty[0], it.qty[1]);
      const priceVar = 0.92 + Math.random() * 0.16;   // ±8 % cenová odchýlka
      const costVar  = 0.95 + Math.random() * 0.12;
      const day = ri(1, 27);
      docs.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, ri(8, 16)),
        customer: pick(CUSTOMERS),
        product: it.product, category: it.category, qty,
        unitPrice: Math.round(it.price * priceVar * 100) / 100,
        unitCost:  Math.round(it.cost * costVar * 100) / 100,
        invoice: 'FA-' + monthDate.getFullYear() + '-' + (++invN),
        note: 'seed'
      });
    }
  }
  await Sale.insertMany(docs);
  return { inserted: docs.length };
}

module.exports = { seedSales };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Predaje:', await seedSales());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
