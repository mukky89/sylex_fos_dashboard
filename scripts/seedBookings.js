/**
 * Náhodné ukážkové rezervácie pre modul Vyťaženie technológií (najbližší mesiac).
 * Idempotentné — najprv zmaže predošlé ukážkové (createdBy: 'seed') a vygeneruje nové.
 * Reálne rezervácie (s iným createdBy) ostávajú nedotknuté.
 * Spúšťa sa cez tlačidlo v module alebo POST /api/admin/seed-bookings.
 */
const Booking = require('../models/Booking');
const Equipment = require('../models/Equipment');

const CH_TESTS = [
  'Teplotný cyklus −40/+85 °C', 'Damp heat 85 °C / 85 % RH', 'Tepelný šok',
  'Nízkoteplotná stabilita −40 °C', 'Skladovacia teplota +70 °C', 'HAST test',
  'Termálne cyklovanie 500×', 'Vlhkostná odolnosť', 'Teplotná stabilita +23/+60 °C'
];
const OV_TESTS = [
  'Vytvrdzovanie epoxidu 150 °C', 'Vypekanie lepidla 125 °C', 'Sušenie 80 °C',
  'Post-cure 100 °C', 'Burn-in 85 °C', 'Tepelné starnutie', 'Polymerizácia 130 °C'
];
const CH_PROFILES = ['−40 / +85 °C', '85 °C / 85 % RH', '+70 °C', '−40 °C', '+23 °C / 50 % RH'];
const OV_PROFILES = ['125 °C', '150 °C', '80 °C', '100 °C', '130 °C'];
const CUSTOMERS = ['US CONEC', 'Optics11', 'Viaphoton', 'Corning', 'Huber+Suhner', 'Senko', 'Interný R&D', 'Fraunhofer IZM', 'II-VI'];

const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (min, max) => min + Math.random() * (max - min);

async function seedBookings() {
  const eqs = await Equipment.find({ active: { $ne: false } }).sort({ order: 1 }).lean();
  if (!eqs.length) return { inserted: 0, equipment: 0, note: 'Žiadne zariadenia' };

  await Booking.deleteMany({ createdBy: 'seed' });

  const now = Date.now();
  const horizon = now + 30 * 864e5;     // mesiac dopredu
  const docs = [];
  let orderSeq = 10 + Math.floor(Math.random() * 20);

  eqs.forEach(eq => {
    const isOven = eq.type === 'oven';
    let cursor = now - 3 * 864e5 + rnd(0, 12 * 36e5); // pár dní dozadu (aby boli aj dokončené)
    while (cursor < horizon) {
      const durH = isOven ? rnd(2, 30) : rnd(6, 110);   // pece kratšie, komory aj viacdňové
      const start = cursor;
      const end = start + durH * 36e5;
      const status = end < now ? (Math.random() < 0.08 ? 'cancelled' : 'done')
        : (start < now ? 'running' : 'planned');
      docs.push({
        equipment: eq._id,
        title: pick(isOven ? OV_TESTS : CH_TESTS),
        order: 'OBJ-2026-' + String(orderSeq++).padStart(3, '0'),
        customer: pick(CUSTOMERS),
        start: new Date(start),
        end: new Date(end),
        status,
        profile: pick(isOven ? OV_PROFILES : CH_PROFILES),
        note: '',
        createdBy: 'seed'
      });
      cursor = end + rnd(3, 22) * 36e5;  // medzera medzi testami
    }
  });

  if (docs.length) await Booking.insertMany(docs);
  return { inserted: docs.length, equipment: eqs.length };
}

module.exports = { seedBookings };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Rezervácie:', await seedBookings());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
