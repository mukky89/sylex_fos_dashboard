/**
 * Import výrobných zákaziek z exportu IO (príloha IO_2.xlsx → scripts/data/ioImport.json).
 * POZOR: zmaže VŠETKY existujúce výrobné zákazky a nahradí ich dátami z prílohy.
 */
const ProductionOrder = require('../models/ProductionOrder');
const DATA = require('./data/ioImport.json');

const d = v => (v ? new Date(v) : null);

function map(o) {
  return {
    number: o.number || '', product: o.product || '(bez popisu)', customer: o.customer || '',
    salesOrder: o.salesOrder || '', qtyPlanned: o.qtyPlanned || 0, qtyDone: o.qtyDone || 0, unit: o.unit || 'ks',
    workstation: o.workstation || '', priority: o.priority || 'normal', stage: o.stage || 'plan',
    start: d(o.start), due: d(o.due), produceBy: d(o.produceBy), requiredDate: d(o.requiredDate),
    agreedDate: d(o.agreedDate), deliveryDate: d(o.deliveryDate), producedDate: d(o.producedDate), shippedDate: d(o.shippedDate),
    division: o.division || '', drawing: o.drawing || '', sensor: o.sensor || '', normHours: o.normHours || 0,
    orderStatus: o.orderStatus || '', delayReason: '', progress: o.progress || 0, note: '', order: o.order || 0,
  };
}

async function importProduction() {
  await ProductionOrder.deleteMany({});
  const docs = DATA.map(map).filter(x => x.product);
  await ProductionOrder.insertMany(docs, { ordered: false });
  return { deleted: 'all', inserted: docs.length };
}

module.exports = { importProduction };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Import výroby:', await importProduction());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
