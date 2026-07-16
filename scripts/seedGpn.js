/**
 * Ukážkové GPN požiadavky (ticket systém Golden PN).
 * Idempotentné — mažú sa len predošlé ukážkové dáta (notes: 'seed').
 */
const GpnRequest = require('../models/GpnRequest');

const CHECKLIST_KEYS = GpnRequest.CHECKLIST_KEYS;
function checklist(doneKeys = []) {
  return CHECKLIST_KEYS.map(key => ({ key, done: doneKeys.includes(key), note: '', doneBy: doneKeys.includes(key) ? 'Technológ' : '', doneAt: doneKeys.includes(key) ? new Date() : null }));
}

const SAMPLES = [
  {
    type: 'new', priority: 'high', status: 'new',
    reason: 'Nový zákaznícky projekt', description: 'Optický zväzok pre rozvádzač MV-12, 8 vlákien, dĺžka podľa výkresu.',
    product: 'Patchcord zväzok', productVariant: 'MV-12', customer: 'Siemens', project: 'MV-12 Retrofit',
    requesterName: 'Obchod — J. Novák',
    cables: [{ cableType: 'G657A2 2mm', count: 8, length: '2,5 m', color: 'žltá', marking: 'MV12-01..08' }],
    connectors: [{ connectorA: 'LC/UPC', connectorB: 'SC/APC', orientation: 'A→B', pinout: '' }],
    material: { tubing: 'Ø3 mm PVC', sleeve: 'LSZH', label: 'termotransfer', heatShrink: 'Ø6/2', other: '' },
    deadlineDays: 14, special: 'Bez halogénov (LSZH).'
  },
  {
    type: 'modify', priority: 'normal', status: 'in_progress', existingGpn: 'GPN-104772',
    reason: 'Zmena dĺžky kábla', description: 'Predĺženie z 1,0 m na 1,5 m, inak bez zmeny.',
    product: 'FBG senzor teploty', productVariant: 'FT-100', customer: 'U.S. Steel', project: 'Pec 3 — monitoring',
    requesterName: 'Obchod — M. Kováč', assigneeName: 'Technológ — P. Horváth',
    cables: [{ cableType: 'FBG single', count: 1, length: '1,5 m', color: 'oranžová', marking: 'FT100-R2' }],
    connectors: [{ connectorA: 'E2000/APC', connectorB: 'voľný koniec', orientation: '', pinout: '' }],
    material: { tubing: 'Ø0,9 mm', sleeve: '', label: 'kovový štítok', heatShrink: '', other: 'Kevlar výplet' },
    deadlineDays: 7, checklistDone: ['gpn', 'prod_drawing']
  },
  {
    type: 'new', priority: 'urgent', status: 'waiting_info',
    reason: 'Urgentná ponuka', description: 'Rozbočovač 1:4 s konektormi, chýba pinout a špecifikácia zákazníka.',
    product: 'Splitter 1:4', productVariant: '', customer: 'VUJE', project: 'Diagnostika VVER',
    requesterName: 'Obchod — J. Novák', assigneeName: 'Technológ — P. Horváth',
    cables: [{ cableType: 'G657 0,9mm', count: 5, length: '1,0 m', color: 'biela', marking: '' }],
    connectors: [{ connectorA: 'LC/APC', connectorB: 'LC/APC', orientation: '', pinout: 'chýba' }],
    material: { tubing: '', sleeve: '', label: '', heatShrink: '', other: '' },
    deadlineDays: 3, special: 'Nutné doplniť pinout a datasheet konektora.'
  },
  {
    type: 'new', priority: 'normal', status: 'ready_approval',
    reason: 'Sériová výroba', description: 'Štandardný patchcord LC-LC duplex 3 m.',
    product: 'Patchcord LC-LC', productVariant: 'duplex', customer: 'Orange', project: 'Dátové centrum BA',
    requesterName: 'Obchod — M. Kováč', assigneeName: 'Technológ — Z. Malá',
    cables: [{ cableType: 'OM4 duplex', count: 1, length: '3,0 m', color: 'akvamarín', marking: 'OM4-3M' }],
    connectors: [{ connectorA: 'LC/UPC', connectorB: 'LC/UPC', orientation: 'duplex', pinout: '' }],
    material: { tubing: 'Ø2 mm', sleeve: 'LSZH', label: 'štandard', heatShrink: '', other: '' },
    deadlineDays: 10, checklistDone: ['gpn', 'prod_drawing', 'pack_drawing', 'bom', 'boo', 'fos_card']
  },
  {
    type: 'new', priority: 'low', status: 'completed', resultGpn: 'GPN-105001',
    reason: 'Dokončená požiadavka', description: 'Testovací kábel pre laboratórium.',
    product: 'Lab kábel', productVariant: '', customer: 'SYLEX', project: 'Interné',
    requesterName: 'Obchod — J. Novák', assigneeName: 'Technológ — Z. Malá',
    cables: [{ cableType: 'G652D', count: 2, length: '5,0 m', color: 'žltá', marking: 'LAB' }],
    connectors: [{ connectorA: 'FC/APC', connectorB: 'FC/APC', orientation: '', pinout: '' }],
    material: { tubing: '', sleeve: '', label: '', heatShrink: '', other: '' },
    deadlineDays: 21, checklistDone: CHECKLIST_KEYS.slice()
  }
];

async function seedGpn() {
  await GpnRequest.deleteMany({ notes: 'seed' });
  const year = new Date().getFullYear();
  let seq = 1;
  const last = await GpnRequest.findOne({ number: new RegExp('^GPN-' + year + '-') }).sort({ number: -1 }).lean();
  if (last && last.number) { const n = parseInt(last.number.slice(('GPN-' + year + '-').length), 10); if (!isNaN(n)) seq = n + 1; }

  const docs = SAMPLES.map((s, i) => ({
    number: `GPN-${year}-${String(seq + i).padStart(4, '0')}`,
    type: s.type, existingGpn: s.existingGpn || '', priority: s.priority, status: s.status,
    reason: s.reason, description: s.description,
    product: s.product, productVariant: s.productVariant || '', customer: s.customer, project: s.project,
    cables: s.cables || [], connectors: s.connectors || [], material: s.material || {},
    deadline: s.deadlineDays ? new Date(Date.now() + s.deadlineDays * 864e5) : null,
    special: s.special || '', notes: 'seed', resultGpn: s.resultGpn || '',
    requesterName: s.requesterName || '', assigneeName: s.assigneeName || '',
    checklist: checklist(s.checklistDone || []),
    comments: [],
    history: [{ by: s.requesterName || 'systém', action: 'created', note: 'Ukážková požiadavka', at: new Date() }]
  }));
  const created = await GpnRequest.insertMany(docs);
  return { tickets: created.length };
}

module.exports = { seedGpn };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('GPN požiadavky:', await seedGpn());
    await mongoose.disconnect(); process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
