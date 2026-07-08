/**
 * Import „Vlastníci produktov" z Excelu (ZOZNAM Product Ownerov, hárok „final").
 * Idempotentné: naplní len ak je kolekcia prázdna (aby neprepísal ručné úpravy a históriu).
 * Voľba force=true zmaže všetko a importuje nanovo.
 */
const ProductOwnerRecord = require('../models/ProductOwnerRecord');
const AppConfig = require('../models/AppConfig');
const DATA = require('./data/productOwners.json');

// Verzia dát — pri zmene zoznamu ju zdvihni; server pri štarte raz automaticky preimportuje.
const DATA_VERSION = '2026-07-08-newlist';

async function seedProductOwners({ force = false } = {}) {
  const count = await ProductOwnerRecord.countDocuments();
  const verCfg = await AppConfig.findOne({ key: 'productOwners.dataVersion' });
  const curVer = verCfg ? verCfg.value : null;
  // Importuj ak: vynútené, kolekcia prázdna, alebo sa zmenila verzia dát (nový zoznam)
  if (!force && count > 0 && curVer === DATA_VERSION) return { skipped: true, existing: count };
  await ProductOwnerRecord.deleteMany({});
  const docs = DATA.map(r => ({
    nr: (r.nr === 0 || r.nr) ? r.nr : null, kind: r.kind || '',
    product: r.product || '', description: r.description || '',
    owner: r.owner || '', backup: r.backup || '',
    status: r.status || '', todo: r.todo || '',
    history: [{ at: new Date(), user: 'import (Excel)', action: 'create', changes: [] }]
  }));
  const created = await ProductOwnerRecord.insertMany(docs);
  await AppConfig.findOneAndUpdate({ key: 'productOwners.dataVersion' },
    { value: DATA_VERSION, group: 'productOwners', label: 'Verzia dát Vlastníkov produktov' }, { upsert: true });
  return { imported: created.length, version: DATA_VERSION };
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
