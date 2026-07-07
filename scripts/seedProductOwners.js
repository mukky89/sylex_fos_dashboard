/**
 * Import „Vlastníci produktov" z Excelu (ZOZNAM Product Ownerov, hárok „final").
 * Idempotentné: naplní len ak je kolekcia prázdna (aby neprepísal ručné úpravy a históriu).
 * Voľba force=true zmaže všetko a importuje nanovo.
 */
const ProductOwnerRecord = require('../models/ProductOwnerRecord');
const DATA = require('./data/productOwners.json');

async function seedProductOwners({ force = false } = {}) {
  const count = await ProductOwnerRecord.countDocuments();
  if (count > 0 && !force) return { skipped: true, existing: count };
  if (force) await ProductOwnerRecord.deleteMany({});
  const docs = DATA.map(r => ({
    nr: r.nr || null, kind: r.kind || '', cat1: r.cat1 || '', cat2: r.cat2 || '',
    product: r.product || '', description: r.description || '',
    owner: r.owner || '', owner2: r.owner2 || '', backup: r.backup || '',
    status: r.status || '', todo: r.todo || '',
    history: [{ at: new Date(), user: 'import (Excel)', action: 'create', changes: [] }]
  }));
  const created = await ProductOwnerRecord.insertMany(docs);
  return { imported: created.length };
}

module.exports = { seedProductOwners };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Vlastníci produktov:', await seedProductOwners({ force: process.argv.includes('--force') }));
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
