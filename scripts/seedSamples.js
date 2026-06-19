/**
 * Ukážkové dáta pre Novinky, WIKI (KB) a Pracovné postupy.
 * Spustenie:  node scripts/seedSamples.js   (potrebné MONGODB_URI)
 * Alebo cez Admin → Systém → "Naplniť ukážkovými dátami" (POST /api/admin/seed-samples).
 * Idempotentné — preskočí záznamy, ktoré už existujú (podľa názvu).
 */
const Category     = require('../models/Category');
const Product      = require('../models/Product');
const Announcement = require('../models/Announcement');
const Procedure    = require('../models/Procedure');
const Project      = require('../models/Project');
const Instrument   = require('../models/Instrument');
const TestProtocol = require('../models/TestProtocol');
const Prototype    = require('../models/Prototype');
const Interrogator = require('../models/Interrogator');
const Datasheet    = require('../models/Datasheet');
const Contact      = require('../models/Contact');
const CalendarEvent = require('../models/CalendarEvent');
const SensorType   = require('../models/SensorType');

const now = Date.now();
const dPlus = (days) => new Date(now + days * 864e5);

const PROJECTS = [
  { title: 'FOS senzor teploty X1', code: 'P-2026-01', phase: 'prototyp', owner: 'M. Horák', priority: 'high', deadline: dPlus(30), folder: 'G:\\Projekty\\FOS\\X1', tags: ['optika', 'teplota'], notes: 'Nový dizajn puzdra.' },
  { title: 'Vlhkostný senzor H2', code: 'P-2026-02', phase: 'testovanie', owner: 'P. Kováč', priority: 'normal', deadline: dPlus(60), folder: 'G:\\Projekty\\FOS\\H2', tags: ['vlhkosť'] },
  { title: 'Optický merač strát', code: 'P-2025-11', phase: 'vyroba', owner: 'J. Novák', priority: 'normal', folder: 'G:\\Projekty\\FOS\\OLM' },
  { title: 'Kalibračná stanica v2', code: 'P-2026-03', phase: 'koncept', owner: 'Lab', priority: 'low' },
  { title: 'Senzor vibrácií', code: 'P-2025-08', phase: 'ukoncene', owner: 'M. Horák', priority: 'normal' },
  { title: 'FBG tlakový senzor PT-01', code: 'P-2026-04', phase: 'koncept', owner: 'P. Kováč', priority: 'high', deadline: dPlus(90), tags: ['tlak', 'FBG'], notes: 'Pre monitorovanie priehrady.' },
  { title: 'Senzor pretvorenia betónu BC-02', code: 'P-2026-05', phase: 'prototyp', owner: 'M. Horák', priority: 'normal', deadline: dPlus(45), folder: 'G:\\Projekty\\FOS\\BC02', tags: ['strain', 'beton', 'DTG'] },
  { title: 'Distribuovaný senzor DTS-100', code: 'P-2025-14', phase: 'testovanie', owner: 'J. Novák', priority: 'high', deadline: dPlus(15), tags: ['DTS', 'raman', 'distribuovany'] },
  { title: 'Smart zátkový senzor SB-03', code: 'P-2026-06', phase: 'vyroba', owner: 'Lab', priority: 'normal', folder: 'G:\\Projekty\\FOS\\SB03', tags: ['smart', 'zatok', 'vstavba'] },
  { title: 'Optický akcelerometer OA-01', code: 'P-2025-10', phase: 'ukoncene', owner: 'M. Horák', priority: 'normal', tags: ['akcelerometer', 'seizmika'] },
  { title: 'Multiplexér 16-kanálový MX-16', code: 'P-2026-07', phase: 'koncept', owner: 'P. Kováč', priority: 'low', tags: ['multiplex', 'WDM'] },
  { title: 'FBG dotazovač nxt gen QT-2', code: 'P-2026-08', phase: 'prototyp', owner: 'J. Novák', priority: 'high', deadline: dPlus(120), tags: ['interrogator', 'nxtgen'] },
  { title: 'Káblový teplomer CT-01', code: 'P-2025-12', phase: 'vyroba', owner: 'M. Horák', priority: 'normal', folder: 'G:\\Projekty\\FOS\\CT01', tags: ['teplota', 'kabel'] },
  { title: 'Senzor bočného posunu LP-05', code: 'P-2025-09', phase: 'ukoncene', owner: 'Lab', priority: 'normal', tags: ['posun', 'inklinometer'] },
  { title: 'Optický korelátor OC-01', code: 'P-2026-09', phase: 'koncept', owner: 'J. Novák', priority: 'low', tags: ['korelator', 'research'] },
];

const INSTRUMENTS = [
  { name: 'Multimeter Fluke 87V', serial: 'FL-001', type: 'multimeter', location: 'Lab FOS', responsible: 'P. Kováč', lastCalibration: dPlus(-300), nextCalibration: dPlus(65), intervalMonths: 12 },
  { name: 'Optický reflektometer OTDR', serial: 'OTDR-22', type: 'OTDR', location: 'Lab FOS', responsible: 'J. Novák', lastCalibration: dPlus(-350), nextCalibration: dPlus(15), intervalMonths: 12 },
  { name: 'Teplotná komora', serial: 'TK-05', type: 'klimatická komora', location: 'Lab', responsible: 'Lab', lastCalibration: dPlus(-400), nextCalibration: dPlus(-5), intervalMonths: 12 },
  { name: 'Posuvné meradlo digitálne', serial: 'PM-12', type: 'meradlo', location: 'Dielňa', responsible: 'M. Horák', lastCalibration: dPlus(-100), nextCalibration: dPlus(265), intervalMonths: 12 },
  { name: 'Optický spektrálny analyzátor OSA', serial: 'OSA-03', type: 'spektrálny analyzátor', location: 'Lab FOS', responsible: 'J. Novák', lastCalibration: dPlus(-180), nextCalibration: dPlus(185), intervalMonths: 12 },
  { name: 'Osciloskop Tektronix TBS2104', serial: 'OSCI-07', type: 'osciloskop', location: 'Lab FOS', responsible: 'P. Kováč', lastCalibration: dPlus(-365), nextCalibration: dPlus(0), intervalMonths: 12 },
  { name: 'Momentový kľúč 10–50 Nm', serial: 'MK-02', type: 'meradlo', location: 'Dielňa', responsible: 'M. Horák', lastCalibration: dPlus(-200), nextCalibration: dPlus(165), intervalMonths: 12 },
  { name: 'FBG interrogátor (referenčný)', serial: 'SI-REF-01', type: 'FBG interrogátor', location: 'Lab FOS', responsible: 'J. Novák', lastCalibration: dPlus(-90), nextCalibration: dPlus(275), intervalMonths: 12 },
  { name: 'Tenzometrický most HBM QuantumX', serial: 'HBM-QX-05', type: 'tenzometer', location: 'Lab FOS', responsible: 'P. Kováč', lastCalibration: dPlus(-240), nextCalibration: dPlus(125), intervalMonths: 12 },
  { name: 'Vodováha laserová BOSCH GLL 3-80', serial: 'LL-04', type: 'meradlo', location: 'Dielňa', responsible: 'Lab', lastCalibration: dPlus(-50), nextCalibration: dPlus(315), intervalMonths: 12 },
  { name: 'Digitálny manometer', serial: 'DM-11', type: 'manometer', location: 'Lab', responsible: 'P. Kováč', lastCalibration: dPlus(-420), nextCalibration: dPlus(-55), intervalMonths: 12 },
];

const TESTS = [
  { title: 'Test optických strát — X1', project: 'FOS senzor teploty X1', product: 'X1', tester: 'J. Novák', ptype: 'optické straty', result: 'pass',
    measurements: [{ name: 'Vložná strata', value: '0.25', unit: 'dB', min: '0', max: '0.5', pass: true }, { name: 'Návratová strata', value: '45', unit: 'dB', min: '40', max: '', pass: true }] },
  { title: 'Teplotný cyklus — H2', project: 'Vlhkostný senzor H2', product: 'H2', tester: 'P. Kováč', ptype: 'teplotný cyklus', result: 'fail',
    measurements: [{ name: 'Odchýlka pri -20°C', value: '3.2', unit: '%', min: '0', max: '2', pass: false }] },
  { title: 'Ťahová skúška puzdra', project: 'FOS senzor teploty X1', product: 'X1', tester: 'M. Horák', ptype: 'mechanická', result: 'pass',
    measurements: [{ name: 'Sila do poškodenia', value: '120', unit: 'N', min: '100', max: '', pass: true }] },
  { title: 'Kalibrációna presnosť — SC-01', project: 'FBG tlakový senzor PT-01', product: 'SC-01', tester: 'J. Novák', ptype: 'kalibrácia', result: 'pass',
    measurements: [{ name: 'Citlivosť', value: '1.21', unit: 'pm/µε', min: '1.18', max: '1.25', pass: true }, { name: 'Linearita', value: '0.98', unit: 'R²', min: '0.995', max: '', pass: true }] },
  { title: 'Vlhkostná odolnosť — H2 v1.1', project: 'Vlhkostný senzor H2', product: 'H2', tester: 'P. Kováč', ptype: 'IP krytie', result: 'pass',
    measurements: [{ name: 'IP67 — ponorovanie 30 min', value: 'ok', unit: '', min: '', max: '', pass: true }] },
  { title: 'Termocyklus -40 až +80°C — BC-02', project: 'Senzor pretvorenia betónu BC-02', product: 'BC-02', tester: 'M. Horák', ptype: 'teplotný cyklus', result: 'pass',
    measurements: [{ name: 'Drift λB po 50 cykloch', value: '0.04', unit: 'nm', min: '0', max: '0.1', pass: true }] },
  { title: 'Rázová odolnosť — PT-01 puzdro', project: 'FBG tlakový senzor PT-01', product: 'PT-01', tester: 'M. Horák', ptype: 'mechanická', result: 'fail',
    measurements: [{ name: 'Pád z 1m na betón', value: 'poškodenie krytu', unit: '', min: '', max: '', pass: false }] },
  { title: 'Presnosť vlnovej dĺžky — OSA ref.', project: 'FBG dotazovač nxt gen QT-2', product: 'QT-2', tester: 'J. Novák', ptype: 'optická presnosť', result: 'pass',
    measurements: [{ name: 'Odchýlka λ od OSA', value: '0.003', unit: 'nm', min: '0', max: '0.01', pass: true }, { name: 'Opakovateľnosť', value: '0.001', unit: 'nm', min: '0', max: '0.005', pass: true }] },
  { title: 'Záťažový test kabeláže — CT-01', project: 'Káblový teplomer CT-01', product: 'CT-01', tester: 'P. Kováč', ptype: 'mechanická', result: 'pass',
    measurements: [{ name: 'Min. polomer ohybu', value: '35', unit: 'mm', min: '30', max: '', pass: true }, { name: 'Odolnosť ťahu', value: '450', unit: 'N', min: '400', max: '', pass: true }] },
  { title: 'EMI odolnosť — DTS-100', project: 'Distribuovaný senzor DTS-100', product: 'DTS-100', tester: 'J. Novák', ptype: 'EMC', result: 'pass',
    measurements: [{ name: 'Rušenie pri 100 V/m', value: 'bez vplyvu', unit: '', min: '', max: '', pass: true }] },
  { title: 'Citlivostný test — OA-01 senzor', project: 'Optický akcelerometer OA-01', product: 'OA-01', tester: 'M. Horák', ptype: 'dynamická', result: 'na',
    measurements: [{ name: 'Frekvencia 1–100 Hz', value: '—', unit: 'Hz', min: '', max: '', pass: false }, { name: 'Amplitúda 0.01g', value: '—', unit: 'g', min: '', max: '', pass: false }] },
];

const PROTOTYPES = [
  { name: 'X1 — vzorka A', code: 'X1-A', version: 'v1.0', project: 'FOS senzor teploty X1', status: 'active', description: 'Prvý prototyp puzdra.', results: 'Funkčné, drobné netesnosti.' },
  { name: 'X1 — vzorka B', code: 'X1-B', version: 'v1.1', project: 'FOS senzor teploty X1', status: 'active', description: 'Upravené tesnenie.', results: 'OK.' },
  { name: 'H2 — vzorka A', code: 'H2-A', version: 'v0.9', project: 'Vlhkostný senzor H2', status: 'archived', description: 'Skúšobná vzorka.', results: 'Nahradená v0.9.1.' },
  { name: 'BC-02 — vzorka A', code: 'BC02-A', version: 'v1.0', project: 'Senzor pretvorenia betónu BC-02', status: 'active', description: 'Prvý prototyp pre zaliatie do betónu.', results: 'Prežil cyklus. Potrebná lepšia ochrana vlákna.' },
  { name: 'PT-01 — vzorka A', code: 'PT01-A', version: 'v0.5', project: 'FBG tlakový senzor PT-01', status: 'active', description: 'Konceptuálny prototyp tlakového senzora.', results: 'Skúšobné meranie tlaku 0–50 bar, odchýlka ±2 bar.' },
  { name: 'PT-01 — vzorka B', code: 'PT01-B', version: 'v0.8', project: 'FBG tlakový senzor PT-01', status: 'active', description: 'Nové puzdro z nerezu.', results: 'Lepší výsledok, odchýlka ±0.5 bar.' },
  { name: 'DTS-100 — pilot unit', code: 'DTS100-P1', version: 'v1.0', project: 'Distribuovaný senzor DTS-100', status: 'active', description: 'Pilotná jednotka pre field test.', results: 'Merací rozsah 10 km, 1°C rozlíšenie. Vyžaduje ďalšie ladenie DSP.' },
  { name: 'QT-2 — vzorka A (PCB v2)', code: 'QT2-A', version: 'v2.0', project: 'FBG dotazovač nxt gen QT-2', status: 'active', description: 'Nová DFB laserová platforma.', results: 'Rýchlosť skenovania 250 Hz, šum -65 dBm. Čaká na firmware.' },
  { name: 'CT-01 — vzorka A', code: 'CT01-A', version: 'v1.0', project: 'Káblový teplomer CT-01', status: 'archived', description: 'Prvý kábel — 5 mm priemer.', results: 'Príliš tuhý. Nahradený CT01-B (3 mm).' },
  { name: 'CT-01 — vzorka B', code: 'CT01-B', version: 'v1.2', project: 'Káblový teplomer CT-01', status: 'active', description: 'Štíhlejší kábel 3 mm, TPU opletenie.', results: 'Flexibilita OK, min. polomer 35 mm. Schválený pre sériovú výrobu.' },
  { name: 'OA-01 — vzorka A', code: 'OA01-A', version: 'v1.0', project: 'Optický akcelerometer OA-01', status: 'archived', description: 'Prvý prototyp s interferometrickým snímaním.', results: 'Nízka citlivosť pod 10 Hz. Projekt pozastavený.' },
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

  // ── Plne štruktúrovaný montážny postup (vzor PP FOS OS3155) ──
  { title: 'Montážny postup výroby snímača OS3155', department: 'Výroba FOS', author: 'Marek Múčka',
    owner: 'Marek Múčka', status: 'active', procNumber: 'PP FOS 98/2024', edition: '2026',
    date: dPlus(0),
    purpose: 'Opísať postup zostavenia tenzometrických FBG snímačov OS3155 vrátane prípravy rámu, sklenného spájkovania, kabeláže a finálnej optickej kontroly.',
    scope: 'Platí pre výrobu snímačov OS3155 na pracovisku Výroba FOS.',
    definitions: 'FBG = Fiber Bragg Grating (vláknová Braggova mriežka)\nWL = vlnová dĺžka (wavelength)\nPP = pracovný postup',
    changeLog: [
      { version: '01', change: '00', date: dPlus(0), reason: 'Prvé vydanie', author: 'Marek Múčka' },
    ],
    relatedDocs: [
      { document: 'SOP101119', description: 'Originálny postup zostavenia OS3155 (Micron Optics)', reference: 'Micron Optics Rev.3' },
      { document: 'SOP131203', description: 'Meranie optickej straty a vlnovej dĺžky', reference: 'Micron Optics' },
      { document: 'Výkres senzora OS3155', description: 'Technický výkres rámu a zostavy', reference: 'P/N 222984' },
      { document: 'STN EN ISO 9001:2015', description: 'Systém manažérstva kvality', reference: 'ISO 9001' },
    ],
    equipment: [
      { no: '5.1', name: 'Stanica na sklenné spájkovanie', description: 'Micron Optics – 3-zónový ohrev', calibration: 'Ročne' },
      { no: '5.6', name: 'Vyhrievacia doska (hotplate)', description: '100 °C ± 5 °C', calibration: 'Ročne' },
      { no: '5.7', name: 'Optický interrogátor', description: 'Micron Optics Si155/Si255', calibration: 'Ročne' },
      { no: '5.10', name: 'Fusion splicer + fiber cleaver', description: '', calibration: 'Podľa výrobcu' },
    ],
    materials: [
      { no: '6.1', name: 'Rám senzora', description: 'Tenzometer – zváraný', partNumber: '222984', quantity: '1' },
      { no: '6.2', name: 'FBG pole', description: 'Fiber Bragg Grating Array', partNumber: '223037', quantity: '1' },
      { no: '6.3', name: 'Sklenená preforma', description: 'Glass Solder Preform', partNumber: '222078', quantity: '3' },
      { no: '6.7', name: 'Epoxid Loctite Hysol E-05MR', description: 'Dvojzložkový', partNumber: '223177', quantity: 'malé mn.' },
      { no: '6.9', name: 'IPA ≥ 99,5 %', description: 'Izopropylalkohol', partNumber: 'C00110', quantity: '~5 ml' },
    ],
    prepChecklist: [
      'Čistota pracoviska – plocha čistá, bez prachu a mastných škvŕn',
      'Spájkovacia stanica – cyklovanie naprázdno vykonané; teploty Z1/Z2/Z3 overené',
      'Hotplate zapnutý – ustálená teplota 100 °C (min. 10 min pred použitím)',
      'Optický interrogátor – kanál zapojený a funkčný, konektory vyčistené',
      'Materiál – skontrolovať či boli všetky materiály správne vyskladnené podľa objednávky',
      'DBFOS – objednávka vytvorená v databáze',
    ],
    tools: [{ name: 'Antistatické pinzety (2 ks)', note: 'C00229' }, { name: 'Lupa 5×', note: 'C00059' }],
    steps: [
      { section: '8.1 Príprava vlákna a záznamy',
        text: '<p>Vytlačte barcode štítok so sériovým číslom a nalepte ho cca 5 cm za konektor pigtailu navareného na vlákne.</p>', note: '', imagePos: 'below', warnings: [], ppe: ['rukavice'] },
      { section: '8.1 Príprava vlákna a záznamy',
        text: '<p>Pripojte konektor pigtailu k meraciemu zariadeniu (Interrogator) a zaznamenajte vlnovú dĺžku oboch FBG pri nulovom namáhaní do DBFOS. Vzdialenosť medzi FBG má byť 38 ±3 mm.</p>', note: 'Bez záznamu nie je možné vyhodnotiť WL po montáži.', imagePos: 'below', warnings: ['general'], ppe: [] },
      { section: '8.2 Vloženie FBG do prípravku a čistenie',
        text: '<p>Rám snímača vyčistite v ultrazvukovej čističke s čistým acetónom (15 min / 25 °C) a vložte do prípravku s drážkou hore.</p>', note: '', imagePos: 'below', warnings: ['chemikalia'], ppe: ['rukavice', 'okuliare'] },
      { section: '8.4 Spájkovací cyklus 1 – preforma B',
        text: '<p>Pripevnite záťaž [STRAIN] k vláknu tesne pod kladkou na pravej strane, zatvorte kryt a stlačte [Cycle Start 1]. Roztaví sa preforma B.</p>', note: 'Počas cyklu do prípravku nezasahujte.', imagePos: 'below', warnings: ['horuce'], ppe: [] },
      { section: '8.6 Meranie a hodnotenie po spájkovaní',
        text: '<p>Nechajte senzor vychladnúť a zaznamenajte WL oboch FBG do denníka senzorov. Denník automaticky vyhodnotí pretenzáciu Δλ (PASS/FAIL).</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
      { section: '8.8 Kabeláž a upevnenie',
        text: '<p>Naneste epoxid E-05MR na oblasť drôtovania a ľavú stranu buffer tube. Umiestnite na hotplate 100 °C na 5–10 min.</p>', note: '', imagePos: 'below', warnings: ['chemikalia', 'horuce'], ppe: ['rukavice'] },
    ],
    safety: [
      { risk: 'Rezné zranenie', source: 'Sklenné optické vlákno – ostré okraje pri štiepení', measure: 'Rukavice; úlomky do nádoby SKLENÉ VLÁKNO' },
      { risk: 'Popálenie', source: 'Hotplate 100 °C; spájkovacia stanica až 550 °C', measure: 'Nedotýkať sa počas cyklu; chladiť pod 100 °C' },
      { risk: 'IPA (horľavina)', source: 'Izopropylalkohol – horľavá kvapalina, výpary', measure: 'Vetranie; bez zdrojov ohňa; uzatvorená nádoba' },
      { risk: 'Poškodenie zraku', source: 'Štiepenie vlákna, brúsenie SiC papierom', measure: 'Ochranné okuliare pri splicer-i a brúsení' },
    ],
    risks: [],
    waste: [
      { waste: 'Úlomky skleneného vlákna', category: 'Nebezpečný – ostrý odpad', disposal: 'Uzatvorená nádoba; zmluvná odpadová firma' },
      { waste: 'Utierky s IPA', category: 'Horľavý odpad', disposal: 'Kovová uzatvorená nádoba; odpadová firma' },
      { waste: 'Zvyšky epoxidu E-05MR', category: 'Chemický odpad', disposal: 'Podľa SDS Loctite; odpadová firma' },
    ],
    maintenance: [
      { equipment: 'Spájkovacia stanica', interval: 'Pred každou zmenou', task: 'Vizuálna kontrola čistoty; overenie teplôt Z1/Z2/Z3', responsible: 'Operátor' },
      { equipment: 'Hotplate', interval: 'Ročne', task: 'Kalibrácia kalibrovaným teplomerom; zápis do karty zariadenia', responsible: 'Vedúci výroby' },
      { equipment: 'Optický interrogátor', interval: 'Ročne', task: 'Kalibrácia u výrobcu / autorizovanom servise', responsible: 'Vedúci výroby' },
    ],
    troubleshooting: [
      { problem: 'Vlákno sa zlomilo počas napínania', cause: 'Mikrotrhlina; príliš rýchle spúšťanie záťaže', solution: 'Nové FBG pole; záťaž spúšťať pomaly a plynulo' },
      { problem: 'Optická strata > 0,5 dB', cause: 'Nečistý konektor; poškodenie vlákna; zlý fúzny zvar', solution: 'Vyčistiť konektor; skontrolovať vlákno lupou 5×; overiť zvar' },
      { problem: 'Pretenzácia mimo tolerancie – FAIL', cause: 'Zamenená orientácia FBG; nesprávna záťaž', solution: 'Overiť záznamy WL pred zostavením; senzor označiť FAIL' },
    ],
    attachments: [{ label: 'Denník senzorov (Sensor Log)', url: 'Interný formulár SYLEX' }],
    validity: {
      preparedBy: 'Marek Múčka – Projektový inžinier, Oddelenie senzorov a snímacích systémov, SYLEX s.r.o.',
      approvedBy: '', validFrom: dPlus(0), nextRevision: dPlus(730),
      unit: 'Výroba FOS, SYLEX s.r.o., Bratislava', revision: 'A / 00',
    } },

  // ── Postup s blížiacou sa revíziou (test notifikácie) ──
  { title: 'Konektorizácia FC/APC (FlexPatch)', department: 'Výroba FOS', author: 'J. Novák',
    owner: 'J. Novák', status: 'active', procNumber: 'PP FOS 45/2023', edition: '2024',
    purpose: 'Štandardný postup ukončenia optického vlákna konektorom FC/APC.',
    relatedDocs: [{ document: 'SOP_FlexPatchTermination_FC-APC', description: 'Postup konektorizácie FC/APC', reference: 'Micron Optics interný SOP' }],
    equipment: [{ no: '1', name: 'Leštička konektorov', description: 'rotačná, s podložkami', calibration: 'Ročne' }],
    materials: [{ no: '1', name: 'Konektor FC/APC', description: 'FlexPatch', partNumber: '220130', quantity: '1' }],
    tools: [{ name: 'Mikroskop na konektory', note: '200×' }],
    steps: [
      { text: '<p>Odizolujte a očistite vlákno, naneste epoxid a nasaďte konektor.</p>', note: '', imagePos: 'below', warnings: ['chemikalia'], ppe: ['rukavice', 'okuliare'] },
      { text: '<p>Vlákno vyleštite a skontrolujte čelo konektora mikroskopom.</p>', note: '', imagePos: 'below', warnings: [], ppe: [] },
    ],
    safety: [{ risk: 'Vdýchnutie výparov', source: 'Epoxid', measure: 'Vetranie; rukavice' }],
    risks: [],
    validity: {
      preparedBy: 'J. Novák', approvedBy: 'Vedúci výroby', validFrom: dPlus(-700), nextRevision: dPlus(20),
      unit: 'Výroba FOS, SYLEX s.r.o., Bratislava', revision: 'A / 01',
    } },

  // ── Postup s revíziou po termíne (test notifikácie / príznaku) ──
  { title: 'Žíhanie optického vlákna', department: 'Výroba FOS', author: 'P. Kováč',
    owner: 'P. Kováč', status: 'active', procNumber: 'PP FOS 12/2022', edition: '2022',
    purpose: 'Tepelné vyžíhanie optického vlákna pred montážou senzora.',
    equipment: [{ no: '1', name: 'Žíhacia pec / komora', description: '150 °C', calibration: 'Ročne' }],
    prepChecklist: ['Pec ustálená na 150 °C', 'Vlákno označené LOT číslom'],
    steps: [
      { text: '<p>Vlákno umiestnite na kovovú platňu, prichyťte kaptonovou páskou a označte LOT číslom.</p>', note: '', imagePos: 'below', warnings: ['horuce'], ppe: ['rukavice'] },
      { text: '<p>Vložte do žíhacej pece (150 °C) a žíhajte nepretržite 15 hodín. Po vychladnutí pokračujte v ďalšom kroku.</p>', note: 'Nechať voľne vychladnúť na izbovú teplotu.', imagePos: 'below', warnings: ['horuce'], ppe: ['rukavice'] },
    ],
    safety: [{ risk: 'Popálenie', source: 'Žíhacia pec 150 °C', measure: 'Tepelne odolné rukavice; manipulácia až po vychladnutí' }],
    risks: [],
    validity: {
      preparedBy: 'P. Kováč', approvedBy: 'Vedúci výroby', validFrom: dPlus(-800), nextRevision: dPlus(-40),
      unit: 'Výroba FOS, SYLEX s.r.o., Bratislava', revision: 'A / 02',
    } },
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

// ── CRM kontakty ───────────────────────────────────────────────────────────────
const CRM_CONTACTS = [
  { name: 'Ing. Tomáš Blaho',    company: 'Metrostav SK a.s.',       email: 'blaho@metrostav.sk',         phone: '+421 910 201 300', status: 'active',   tags: ['most', 'tunel', 'monitoring'],        note: 'Kontakt pre projekty železničných tunelov. Záujem o SC-01.' },
  { name: 'Mgr. Jana Kováčová',  company: 'GEO-INS s.r.o.',          email: 'kovacova@geo-ins.sk',        phone: '+421 903 445 112', status: 'active',   tags: ['geotechnika', 'svah', 'priehrada'],   note: 'Dlhodobý zákazník, každoročné objednávky senzorov.' },
  { name: 'Dr. Petr Sedláček',   company: 'VŠB-TU Ostrava',          email: 'sedlacek@vsb.cz',            phone: '+420 596 991 500', status: 'lead',     tags: ['academia', 'výzkum', 'grant'],        note: 'Záujem o kolaboráciu na EU projekte Horizon.' },
  { name: 'Ing. Marta Szabó',    company: 'NDS a.s.',                 email: 'szabo@nds.sk',               phone: '+421 2 5823 5000', status: 'active',   tags: ['diaľnica', 'most', 'NDS'],            note: 'Manažér divízie mostného monitoringu NDS.' },
  { name: 'František Horník',    company: 'ZIPP Brno s.r.o.',         email: 'hornik@zipp.cz',             phone: '+420 541 320 100', status: 'active',   tags: ['stavba', 'konštrukcia'],             note: 'Opakovaný nákup, vždy S-line S4.' },
  { name: 'Ing. Lukáš Mrázek',   company: 'CEZ a.s.',                 email: 'mrazek.l@cez.cz',            phone: '+420 211 040 111', status: 'lead',     tags: ['energetika', 'priehrada', 'CEZ'],    note: 'Prvý kontakt na konferencii SHM 2025.' },
  { name: 'Bc. Silvia Timková',  company: 'SHM Solutions s.r.o.',     email: 'timkova@shmsolutions.eu',    phone: '+421 908 556 712', status: 'active',   tags: ['SHM', 'distribútor', 'partner'],     note: 'Distribučný partner pre CZ/SK trh.' },
  { name: 'Dr. Klaus Weber',     company: 'TU München',               email: 'k.weber@tum.de',             phone: '+49 89 289 22000', status: 'lead',     tags: ['academia', 'nemecko', 'FBG'],        note: 'Vedúci katedry, záujem o 16ch S-line pre lab.' },
  { name: 'Mgr. Rastislav Novák','company': 'Ponting s.r.o.',         email: 'novak@ponting.sk',           phone: '+421 911 778 034', status: 'inactive', tags: ['mostné konštrukcie'],                note: 'Projekt stojí, čaká na financovanie EU.' },
  { name: 'Ing. Andrea Lenártová','company': 'Dopravný podnik BA',    email: 'lenartova@dpba.sk',          phone: '+421 2 5950 9111', status: 'lead',     tags: ['metro', 'tunel', 'BA'],              note: 'Záujem o pilotné meranie na Petržalskej linke.' },
  { name: 'Ing. Martin Ošťádal', company: 'Skanska SK a.s.',          email: 'ostadal@skanska.sk',         phone: '+421 2 5823 9000', status: 'active',   tags: ['skanska', 'stavba', 'projekt'],      note: 'Dlhodobý zákazník, projekt D1 Lietavská Lúčka.' },
  { name: 'Bc. Eva Horáková',    company: 'ČVUT Praha',               email: 'horakova@cvut.cz',           phone: '+420 224 353 000', status: 'lead',     tags: ['academia', 'diplomovka', 'Praha'],   note: 'Doktorandka, záujem o zapožičanie senzora na DP.' },
];

// ── Dovolenky v kalendári (ukážkové) ──────────────────────────────────────────
const VACATIONS = [
  { title: 'Dovolenka — M. Horák', person: 'M. Horák', type: 'dovolenka', date: dPlus(3),  endDate: dPlus(10), allDay: true, color: '#fbbf24', note: 'Dovolenka v Chorvátsku.' },
  { title: 'Dovolenka — J. Novák', person: 'J. Novák', type: 'dovolenka', date: dPlus(0),  endDate: dPlus(2),  allDay: true, color: '#fbbf24', note: 'Voľno — osobné dôvody.' },
  { title: 'Dovolenka — P. Kováč', person: 'P. Kováč', type: 'dovolenka', date: dPlus(18), endDate: dPlus(25), allDay: true, color: '#fbbf24', note: 'Letná dovolenka.' },
  { title: 'Dovolenka — Lab',      person: 'Lab',       type: 'dovolenka', date: dPlus(22), endDate: dPlus(23), allDay: true, color: '#fbbf24', note: 'Náhradné voľno.' },
];

const SENSOR_TYPES = [
  { name: 'SC-01 (strain cable)', lambda0: 1550, sEps: 1.2, sTemp: 10, rangeEps: 2500, note: 'FBG strain cable' },
  { name: 'Temperature FBG', lambda0: 1545, sEps: 1.2, sTemp: 10.5, rangeEps: 0, note: 'teplotný senzor' },
  { name: 'Anchor load cell', lambda0: 1555, sEps: 1.15, sTemp: 9.8, rangeEps: 3000, note: 'load cell' },
];

async function seedSamples() {
  const result = { announcements: 0, categories: 0, products: 0, procedures: 0, projects: 0, instruments: 0, tests: 0, prototypes: 0, interrogators: 0, datasheets: 0, contacts: 0, vacations: 0, sensorTypes: 0 };

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

  // CRM kontakty
  for (const c of CRM_CONTACTS) {
    if (!(await Contact.exists({ email: c.email }))) { await Contact.create(c); result.contacts++; }
  }

  // Dovolenky v kalendári
  for (const v of VACATIONS) {
    if (!(await CalendarEvent.exists({ title: v.title, date: v.date }))) {
      await CalendarEvent.create(v); result.vacations++;
    }
  }

  for (const t of SENSOR_TYPES) {
    if (!(await SensorType.exists({ name: t.name }))) { await SensorType.create(t); result.sensorTypes++; }
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
