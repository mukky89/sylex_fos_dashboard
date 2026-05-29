require('dotenv').config();
const mongoose   = require('mongoose');
const Category   = require('../models/Category');
const Product    = require('../models/Product');
const HeaderLink = require('../models/HeaderLink');
const AppConfig  = require('../models/AppConfig');
const { DEFAULT_LINKS } = require('../config/defaults');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // ── HeaderLinks ──────────────────────────────────────────────────────────
  const linkCount = await HeaderLink.countDocuments();
  if (linkCount === 0) {
    await HeaderLink.insertMany(DEFAULT_LINKS);
    console.log(`HeaderLinks seeded: ${DEFAULT_LINKS.length} entries`);
  } else {
    console.log(`HeaderLinks already exist (${linkCount}), skipping.`);
  }

  // ── AppConfig ─────────────────────────────────────────────────────────────
  const cfgCount = await AppConfig.countDocuments();
  if (cfgCount === 0) {
    await AppConfig.insertMany([
      { key: 'sensor.ip',       value: '10.88.5.184',  label: 'IP adresa senzora', group: 'sensor', type: 'string' },
      { key: 'sensor.path',     value: '/values.xml',   label: 'Cesta (path)',      group: 'sensor', type: 'string' },
      { key: 'sensor.interval', value: 60,              label: 'Interval (s)',      group: 'sensor', type: 'number' },
      { key: 'sensor.ch1',      value: 'humidity',      label: 'Kanál 1 (ch1)',     group: 'sensor', type: 'string' },
      { key: 'sensor.ch2',      value: 'temperature',   label: 'Kanál 2 (ch2)',     group: 'sensor', type: 'string' },
    ]);
    console.log('AppConfig seeded: 5 entries');
  } else {
    console.log(`AppConfig already exists (${cfgCount}), skipping.`);
  }

  // ── KB: Category ─────────────────────────────────────────────────────────
  let cat = await Category.findOne({ name: 'Tlačiarne' });
  if (!cat) {
    cat = await Category.create({ name: 'Tlačiarne', icon: '🖨️', color: '#00d4ff' });
    console.log('Category created:', cat.name);
  }

  // ── KB: Product ───────────────────────────────────────────────────────────
  const existing = await Product.findOne({ model: 'TD-4420TN' });
  if (existing) {
    console.log('Product already exists, skipping.');
  } else {
    await Product.create({
      name: 'Brother TD-4420TN',
      model: 'TD-4420TN',
      category: cat._id,
      description: '4" termotransferová sieťová tlačiareň etikiet s USB a LAN, 203 dpi, 152 mm/s',
      content: `<h2>Technické parametre</h2>
<table>
  <tr><td><strong>Technológia tlače</strong></td><td>Termotransfer / Priama termálna</td></tr>
  <tr><td><strong>Rozlíšenie</strong></td><td>203 dpi</td></tr>
  <tr><td><strong>Rýchlosť tlače</strong></td><td>až 152 mm/s (6 ips)</td></tr>
  <tr><td><strong>Konektivita</strong></td><td>USB, Ethernet (LAN), Sériový port</td></tr>
  <tr><td><strong>Emulácia</strong></td><td>ZPL, EPL, DPL</td></tr>
</table>`,
      tags: ['brother', 'tlačiareň', 'etikety', 'termotransfer', 'LAN', 'USB', 'ZPL'],
      status: 'active'
    });
    console.log('Product created: Brother TD-4420TN');
  }

  await mongoose.disconnect();
  console.log('Seed done.');
}

seed().catch(err => { console.error(err); process.exit(1); });
