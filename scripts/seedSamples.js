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

async function seedSamples() {
  const result = { announcements: 0, categories: 0, products: 0, procedures: 0 };

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
