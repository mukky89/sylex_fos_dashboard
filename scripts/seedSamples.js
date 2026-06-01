/**
 * Ukážkové dáta pre Novinky, WIKI (KB) a Pracovné postupy.
 * Spustenie:  node scripts/seedSamples.js   (potrebné MONGODB_URI)
 * Alebo cez Admin → Systém → "Naplniť ukážkovými dátami" (POST /api/admin/seed-samples).
 * Idempotentné — preskočí záznamy, ktoré už existujú (podľa názvu).
 */
const Category    = require('../models/Category');
const Product     = require('../models/Product');
const Announcement = require('../models/Announcement');
const Procedure   = require('../models/Procedure');
const Project     = require('../models/Project');
const Instrument  = require('../models/Instrument');
const TestProtocol = require('../models/TestProtocol');
const Prototype   = require('../models/Prototype');
const Interrogator = require('../models/Interrogator');
const Datasheet   = require('../models/Datasheet');

const now = Date.now();
const dPlus = (days) => new Date(now + days * 864e5);

const PROJECTS = [
  { title: 'FOS senzor teploty X1', code: 'P-2026-01', phase: 'prototyp', owner: 'M. Horák', priority: 'high', deadline: dPlus(30), folder: 'G:\\Projekty\\FOS\\X1', tags: ['optika', 'teplota'], notes: 'Nový dizajn puzdra.' },
  { title: 'Vlhkostný senzor H2', code: 'P-2026-02', phase: 'testovanie', owner: 'P. Kováč', priority: 'normal', deadline: dPlus(60), folder: 'G:\\Projekty\\FOS\\H2', tags: ['vlhkosť'] },
  { title: 'Optický merač strát', code: 'P-2025-11', phase: 'vyroba', owner: 'J. Novák', priority: 'normal', folder: 'G:\\Projekty\\FOS\\OLM' },
  { title: 'Kalibračná stanica v2', code: 'P-2026-03', phase: 'koncept', owner: 'Lab', priority: 'low' },
  { title: 'Senzor vibrácií', code: 'P-2025-08', phase: 'ukoncene', owner: 'M. Horák', priority: 'normal' },
];

const INSTRUMENTS = [
  { name: 'Multimeter Fluke 87V', serial: 'FL-001', type: 'multimeter', location: 'Lab FOS', responsible: 'P. Kováč', lastCalibration: dPlus(-300), nextCalibration: dPlus(65), intervalMonths: 12 },
  { name: 'Optický reflektometer OTDR', serial: 'OTDR-22', type: 'OTDR', location: 'Lab FOS', responsible: 'J. Novák', lastCalibration: dPlus(-350), nextCalibration: dPlus(15), intervalMonths: 12 },
  { name: 'Teplotná komora', serial: 'TK-05', type: 'klimatická komora', location: 'Lab', responsible: 'Lab', lastCalibration: dPlus(-400), nextCalibration: dPlus(-5), intervalMonths: 12 },
  { name: 'Posuvné meradlo digitálne', serial: 'PM-12', type: 'meradlo', location: 'Dielňa', responsible: 'M. Horák', lastCalibration: dPlus(-100), nextCalibration: dPlus(265), intervalMonths: 12 },
];

const TESTS = [
  { title: 'Test optických strát — X1', project: 'FOS senzor teploty X1', product: 'X1', tester: 'J. Novák', ptype: 'optické straty', result: 'pass',
    measurements: [{ name: 'Vložná strata', value: '0.25', unit: 'dB', min: '0', max: '0.5', pass: true }, { name: 'Návratová strata', value: '45', unit: 'dB', min: '40', max: '', pass: true }] },
  { title: 'Teplotný cyklus — H2', project: 'Vlhkostný senzor H2', product: 'H2', tester: 'P. Kováč', ptype: 'teplotný cyklus', result: 'fail',
    measurements: [{ name: 'Odchýlka pri -20°C', value: '3.2', unit: '%', min: '0', max: '2', pass: false }] },
  { title: 'Ťahová skúška puzdra', project: 'FOS senzor teploty X1', product: 'X1', tester: 'M. Horák', ptype: 'mechanická', result: 'pass',
    measurements: [{ name: 'Sila do poškodenia', value: '120', unit: 'N', min: '100', max: '', pass: true }] },
];

const PROTOTYPES = [
  { name: 'X1 — vzorka A', code: 'X1-A', version: 'v1.0', project: 'FOS senzor teploty X1', status: 'active', description: 'Prvý prototyp puzdra.', results: 'Funkčné, drobné netesnosti.' },
  { name: 'X1 — vzorka B', code: 'X1-B', version: 'v1.1', project: 'FOS senzor teploty X1', status: 'active', description: 'Upravené tesnenie.', results: 'OK.' },
  { name: 'H2 — vzorka A', code: 'H2-A', version: 'v0.9', project: 'Vlhkostný senzor H2', status: 'archived', description: 'Skúšobná vzorka.', results: 'Nahradená v0.9.1.' },
];

const ANNOUNCEMENTS = [
  { title: 'Odstávka servera G:\\Projekty v piatok 18:00', type: 'important', pinned: true,
    author: 'IT', body: 'V piatok od 18:00 do 20:00 bude plánovaná odstávka súborového servera. Uložte si prácu.' },
  { title: 'Nová verzia FOS Dashboardu 1.7', type: 'success', author: 'Vývoj',
    body: 'Pribudol pokročilý editor pracovných postupov (TipTap), export kalendára do Excelu a hodiny s meninami.' },
  { title: 'Školenie BOZP — 12.6.', type: 'info', author: 'HR',
    body: 'Povinné školenie BOZP pre celé oddelenie FOS. Zasadačka 2, 9:00.' },
  { title: 'Údržba senzora T3511', type: 'warning', author: 'Lab',
    body: 'Senzor teploty/vlhkosti v labe bude počas kalibrácie dočasne nedostupný.' },
  { title: 'Nové šablóny ponúk v G:\\Projekty\\Obchod', type: 'info', author: 'Obchod',
    body: 'Aktualizované Word/Excel šablóny cenových ponúk nájdete v zdieľanom priečinku.' },
  { title: 'Inventúra skladu FOS', type: 'info', author: 'Sklad',
    body: 'Koncoročná inventúra prebehne posledný týždeň v mesiaci.' },
];

// Kategórie WIKI (vytvoria sa, ak chýbajú)
const CATEGORIES = [
  { name: 'Senzory',   icon: '📡', color: '#0891b2', description: 'Meracie zariadenia a senzory' },
  { name: 'Tlačiarne', icon: '🖨️', color: '#7c3aed', description: 'Tlačiarne etikiet a príslušenstvo' },
  { name: 'Softvér',   icon: '💻', color: '#1d4ed8', description: 'Interné systémy a aplikácie' },
  { name: 'Sieť',      icon: '🌐', color: '#0e7490', description: 'Sieťová infraštruktúra' },
];

// WIKI záznamy (category = názov kategórie vyššie)
const PRODUCTS = [
  { name: 'Web Sensor T3511', model: 'T3511', category: 'Senzory', version: '', status: 'active',
    description: 'Snímač teploty a vlhkosti s webovým rozhraním a XML výstupom.',
    tags: ['senzor', 'teplota', 'vlhkosť', 'lan'],
    url: 'http://10.88.5.184/',
    content: '<h2>Parametre</h2><table><tbody><tr><td><strong>Rozsah teploty</strong></td><td>-30 až +80 °C</td></tr><tr><td><strong>Vlhkosť</strong></td><td>0–100 %RH</td></tr><tr><td><strong>Rozhranie</strong></td><td>Ethernet, XML (/values.xml)</td></tr></tbody></table><h2>Integrácia</h2><p>Dashboard číta hodnoty z <code>/values.xml</code> (ch1 = vlhkosť, ch2 = teplota).</p>' },
  { name: 'PeakLogger', model: '', category: 'Softvér', version: '2.x', status: 'active',
    description: 'Aplikácia na záznam a vyhodnotenie meraní (peak logging).',
    tags: ['softvér', 'merania', 'log'], url: 'https://mukovnik.xyz/',
    content: '<h2>Popis</h2><p>PeakLogger slúži na zber a archiváciu meraní z optických senzorov.</p><h2>Prístupy</h2><p>Prihlasovacie údaje sú dostupné v hlavičke dashboardu pod ikonou kľúča.</p>' },
  { name: 'DBFOS', model: '', category: 'Softvér', version: '', status: 'active',
    description: 'Interný databázový systém FOS divízie.',
    tags: ['erp', 'databáza', 'fos'], url: 'https://dbfos.sylex.sk',
    content: '<h2>DBFOS</h2><p>Centrálny systém pre evidenciu projektov a meraní FOS.</p>' },
  { name: 'Switch Cisco — Lab FOS', model: 'CBS350', category: 'Sieť', version: '', status: 'active',
    description: 'Konfigurácia sieťového switchu v laboratóriu FOS.',
    tags: ['sieť', 'switch', 'vlan'],
    content: '<h2>Konfigurácia</h2><ul><li>VLAN 10 — meracie zariadenia</li><li>VLAN 20 — kancelária</li></ul><p>Statická IP rozsah 10.88.5.x.</p>' },
  { name: 'Optická zváračka', model: 'FSM-70S', category: 'Senzory', version: '', status: 'active',
    description: 'Zváračka optických vlákien — návod a údržba.',
    tags: ['optika', 'vlákno', 'zváranie'],
    content: '<h2>Údržba</h2><ol><li>Pravidelné čistenie elektród</li><li>Kontrola V-drážok</li><li>Kalibrácia oblúka</li></ol>' },
];

// Pracovné postupy
const PROCEDURES = [
  { title: 'Vystavenie cenovej ponuky', department: 'Obchod', author: 'J. Novák', status: 'active',
    purpose: 'Jednotný postup vystavenia cenovej ponuky pre zákazníka.',
    tools: [{ name: 'MS Word', note: 'šablóna Ponuka.docx' }, { name: 'MS Excel', note: 'kalkulačka' }],
    steps: [
      { text: '<h3>Príprava</h3><p>Otvor šablónu ponuky z <code>G:\\Projekty\\Obchod\\Sablony</code>.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
      { text: '<p>Vyplň údaje zákazníka a položky podľa dopytu.</p>', note: 'Skontroluj IČO/DIČ', imagePos: 'below', warnings: [], ppe: [] },
      { text: '<p>Over kalkuláciu a odošli na schválenie vedúcemu.</p>', note: '', imagePos: 'below', warnings: ['general'], ppe: [] },
    ],
    risks: ['Nesprávna kalkulácia ceny', 'Chýbajúce kontaktné údaje'], attachments: [] },

  { title: 'Lepenie optických vlákien', department: 'FOS', author: 'M. Horák', status: 'active',
    purpose: 'Bezpečné a kvalitné nalepenie optických vlákien.',
    tools: [{ name: 'Dvojzložkové lepidlo', note: '' }, { name: 'Izopropylalkohol', note: 'čistenie' }],
    steps: [
      { text: '<h3>Príprava povrchu</h3><p>Očisti a odmasti povrch izopropylalkoholom.</p>', note: 'Pracuj v digestori', imagePos: 'below', warnings: ['chemikalia'], ppe: ['rukavice', 'okuliare'] },
      { text: '<p>Naneste lepidlo v tenkej vrstve a priložte vlákno.</p>', note: '', imagePos: 'below', warnings: ['manipulacia'], ppe: ['rukavice'] },
      { text: '<p>Nechaj vytvrdnúť podľa dátového listu lepidla.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
    ],
    risks: ['Podráždenie pokožky', 'Slabý spoj pri nečistom povrchu'], attachments: [] },

  { title: 'Kalibrácia senzora T3511', department: 'Lab', author: 'P. Kováč', status: 'active',
    purpose: 'Pravidelná kalibrácia snímača teploty a vlhkosti.',
    tools: [{ name: 'Referenčný etalón', note: '' }],
    steps: [
      { text: '<p>Odpoj senzor zo siete a presuň do kalibračnej komory.</p>', note: '', imagePos: 'below', warnings: ['elektrina'], ppe: [] },
      { text: '<p>Porovnaj namerané hodnoty s referenčným etalónom.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
      { text: '<p>Zaznamenaj odchýlky a vykonaj korekciu.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
    ],
    risks: ['Nepresné meranie pri zlej referencii'], attachments: [] },

  { title: 'Inštalácia tlačiarne Brother TD-4420TN', department: 'IT', author: 'IT', status: 'active',
    purpose: 'Inštalácia a sieťové pripojenie tlačiarne etikiet.',
    tools: [{ name: 'BRAdmin Professional', note: '' }],
    steps: [
      { text: '<p>Stiahni a spusti inštalátor ovládača z Brother Support.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
      { text: '<p>Nastav statickú IP cez BRAdmin alebo panel tlačiarne.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
      { text: '<p>Vytlač testovaciu etiketu.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
    ],
    risks: [], attachments: [{ label: 'Brother Support', url: 'https://support.brother.com' }] },

  { title: 'Manipulácia s chemikáliami v labe', department: 'Lab', author: 'BOZP', status: 'active',
    purpose: 'Bezpečná manipulácia a skladovanie chemikálií.',
    tools: [{ name: 'Digestor', note: '' }, { name: 'Lekárnička', note: '' }],
    steps: [
      { text: '<h3>Pred prácou</h3><p>Skontroluj kartu bezpečnostných údajov (KBÚ) chemikálie.</p>', note: '', imagePos: 'below', warnings: ['chemikalia', 'general'], ppe: ['rukavice', 'okuliare', 'plast'] },
      { text: '<p>Pracuj výhradne v digestore s odsávaním.</p>', note: '', imagePos: 'below', warnings: ['horlavina'], ppe: ['rukavice', 'okuliare'] },
      { text: '<p>Po práci chemikálie bezpečne uskladni a označ.</p>', note: '', imagePos: 'below', warnings: [], ppe: ['rukavice'] },
    ],
    risks: ['Poleptanie', 'Vdýchnutie výparov', 'Požiar pri horľavinách'], attachments: [] },

  { title: 'Príjem a kontrola tovaru', department: 'Sklad', author: 'Sklad', status: 'draft',
    purpose: 'Postup pri príjme a vstupnej kontrole dodávky.',
    tools: [],
    steps: [
      { text: '<p>Porovnaj dodací list s objednávkou.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
      { text: '<p>Skontroluj počet a stav položiek.</p>', note: '', imagePos: 'below', warnings: ['tazke'], ppe: ['obuv'] },
      { text: '<p>Zaeviduj príjem do systému.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
    ],
    risks: [], attachments: [] },
];

const INTERROGATORS = [
  { serial: 'SL-2025-0007', model: 'S-line S16', channels: 16, firmware: 'v2.3.1', hwRevision: 'Rev. C', manufacturedAt: dPlus(-420), status: 'zakaznik', customer: 'Metro Praha', soldTo: 'Metro Praha a.s.', soldAt: dPlus(-360), warrantyUntil: dPlus(360), location: 'Tunel Praha', notes: 'Monitoring tunela.', repairs: [{ date: dPlus(-120), description: 'Výmena napájacieho zdroja', technician: 'P. Kováč', cost: '120 €' }] },
  { serial: 'SL-2025-0012', model: 'S-line S4', channels: 4, firmware: 'v2.3.1', hwRevision: 'Rev. C', manufacturedAt: dPlus(-300), status: 'predany', customer: 'GeoTest', soldTo: 'GeoTest s.r.o.', soldAt: dPlus(-200), warrantyUntil: dPlus(530), location: 'u zákazníka', notes: '', repairs: [] },
  { serial: 'SL-2026-0003', model: 'S-line S16', channels: 16, firmware: 'v2.4.0', hwRevision: 'Rev. D', manufacturedAt: dPlus(-40), status: 'sklad', customer: '', soldTo: '', location: 'sklad FOS', notes: 'Pripravený na expedíciu.', repairs: [] },
  { serial: 'SL-2024-0021', model: 'S-line S8', channels: 8, firmware: 'v2.2.0', hwRevision: 'Rev. B', manufacturedAt: dPlus(-700), status: 'oprava', customer: 'Most SK', soldTo: 'NDS', soldAt: dPlus(-650), warrantyUntil: dPlus(-100), location: 'servis FOS', notes: 'Reklamácia po záruke.', repairs: [{ date: dPlus(-30), description: 'Diagnostika optického modulu', technician: 'J. Novák', cost: '—' }, { date: dPlus(-10), description: 'Výmena konektorov FC/APC', technician: 'J. Novák', cost: '60 €' }] },
];

const DATASHEETS = [
  { title: 'Strain Cable SC-01', partNumber: 'SC-01', tagline: 'FBG strain cable sensor pre monitoring pretvorenia', model: 'SC-01', category: 'Sensing systems', version: '1.0', status: 'released',
    description: '<p>SC-01 je <strong>FBG káblový tenzometer</strong> založený na technológii Draw Tower Grating (DTG). Je určený na meranie pretvorenia (strain) v stavebných a geotechnických konštrukciách. Vďaka optickému princípu je imúnny voči elektromagnetickému rušeniu a vhodný na dlhodobý monitoring.</p>',
    features: ['Imunita voči EMI/RFI', 'Multiplexovateľný (WDM na jednom vlákne)', 'Vhodný na zaliatie do betónu', 'Dlhodobá stabilita a životnosť', 'Vysoké rozlíšenie merania'],
    specs: [
      { param: 'Merací rozsah', value: '±2500', unit: 'µε' },
      { param: 'Vlnová dĺžka (λB)', value: '1510 – 1590', unit: 'nm' },
      { param: 'Citlivosť', value: '~1.2', unit: 'pm/µε' },
      { param: 'Pracovná teplota', value: '-40 … +120', unit: '°C' },
      { param: 'Typ vlákna', value: 'SMF / DTG', unit: '' },
      { param: 'Dĺžka kábla', value: 'na mieru', unit: 'm' }
    ],
    applications: ['Monitoring mostov a tunelov', 'Geotechnika a zemné konštrukcie', 'Sledovanie zdravia konštrukcií (SHM)', 'Priehrady a oporné múry'],
    ordering: [{ code: 'SC-01-L', description: 'Strain cable SC-01, dĺžka na mieru (uveďte v m)' }, { code: 'SC-01-C', description: 'Konektor FC/APC (voliteľné)' }],
    dimensions: 'Priemer kábla cca 3–6 mm, koncovky s ochranným návlekom.',
    notes: 'Ukážkový datasheet vygenerovaný v dashboarde — uprav podľa oficiálnej PDF predlohy.',
    images: []
  },
];

async function seedSamples() {
  const result = { announcements: 0, categories: 0, products: 0, procedures: 0, projects: 0, instruments: 0, tests: 0, prototypes: 0, interrogators: 0, datasheets: 0 };

  // Novinky
  for (const a of ANNOUNCEMENTS) {
    if (!(await Announcement.exists({ title: a.title }))) { await Announcement.create(a); result.announcements++; }
  }

  // Kategórie (mapa názov → _id)
  const catMap = {};
  for (const c of CATEGORIES) {
    let cat = await Category.findOne({ name: c.name });
    if (!cat) { cat = await Category.create(c); result.categories++; }
    catMap[c.name] = cat._id;
  }

  // WIKI záznamy
  for (const p of PRODUCTS) {
    if (await Product.exists({ name: p.name })) continue;
    const doc = { ...p, category: catMap[p.category] || null };
    await Product.create(doc);
    result.products++;
  }

  // Pracovné postupy
  for (const pr of PROCEDURES) {
    if (!(await Procedure.exists({ title: pr.title }))) { await Procedure.create(pr); result.procedures++; }
  }

  // Vývojové projekty
  for (const p of PROJECTS) {
    if (!(await Project.exists({ title: p.title }))) { await Project.create(p); result.projects++; }
  }
  // Kalibrácie
  for (const i of INSTRUMENTS) {
    if (!(await Instrument.exists({ name: i.name }))) { await Instrument.create(i); result.instruments++; }
  }
  // Testovacie protokoly
  for (const t of TESTS) {
    if (!(await TestProtocol.exists({ title: t.title }))) { await TestProtocol.create(t); result.tests++; }
  }
  // Prototypy
  for (const pt of PROTOTYPES) {
    if (!(await Prototype.exists({ name: pt.name }))) { await Prototype.create(pt); result.prototypes++; }
  }

  for (const ig of INTERROGATORS) {
    if (!(await Interrogator.exists({ serial: ig.serial }))) { await Interrogator.create(ig); result.interrogators++; }
  }

  for (const d of DATASHEETS) {
    if (!(await Datasheet.exists({ title: d.title }))) { await Datasheet.create(d); result.datasheets++; }
  }

  return result;
}

module.exports = { seedSamples };

// CLI spustenie
if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    const r = await seedSamples();
    console.log('Vložené ukážkové dáta:', r);
    await mongoose.disconnect();
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
