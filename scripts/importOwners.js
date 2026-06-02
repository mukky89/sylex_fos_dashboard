/**
 * Import Product Ownerov z ZOZNAM Product Ownerov REV B.xlsx
 * Spustenie: node scripts/importOwners.js
 *
 * - Vytvorí User účty pre každého vlastníka (ak ešte neexistujú)
 * - Vytvorí ProductOwner záznamy (idempotentné — preskočí existujúce)
 * - Predvolené heslo: FOS2026! (admin to zmení cez Admin > Používatelia)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User         = require('../models/User');
const ProductOwner = require('../models/ProductOwner');

// ── Ľudia — správne mená so Slovak diakritikou ─────────────────────────────
const PEOPLE = [
  { key: 'Braňo P.',   username: 'bpikus',   name: 'Branislav Pikus',   role: 'user' },
  { key: 'Filip Š.',   username: 'fsvolak',  name: 'Filip Švolák',      role: 'user' },
  { key: 'Tomáš Š.',   username: 'tsalat',   name: 'Tomáš Šalát',       role: 'user' },
  { key: 'M. Mučka',   username: 'mmucka',   name: 'Marek Mučka',       role: 'user' },
  { key: 'Michal P.',  username: 'mplevka',  name: 'Michal Plevka',     role: 'user' },
  { key: 'Martin N.',  username: 'nnemeth',  name: 'Martin Němeth',     role: 'user' },
  { key: 'Andrej M.',  username: 'amikovec', name: 'Andrej Mikovec',    role: 'user' },
  // "B. Pikus" sa vyskytuje v BO stĺpci ako odkaz na toho istého Branislava
  { key: 'B. Pikus',   username: 'bpikus',   name: 'Branislav Pikus',   role: 'user' },
];

// Namapovanie garblovaných kľúčov z Excelu → čistý kľúč
// (openpyxl číta Windows-1250 diakritiku ako 0xNN bajty v UTF-8)
const KEY_NORM = {
  // Brašo/Braňo Pikus — rôzne formy v Exceli
  'Bražo P.':  'Braňo P.',
  'Bra\xbfo P.':    'Braňo P.',
  'Bra� P.':   'Braňo P.',
  'B. Pikus':       'B. Pikus',
  // Filip Švolák
  'Filip Ž.':  'Filip Š.',
  'Filip \xbd.':    'Filip Š.',
  'Filip �.':  'Filip Š.',
  // Tomáš Šalát
  'TomŽ Ž.': 'Tomáš Š.',
  'Tom\xbd \xbd.':  'Tomáš Š.',
  'Tom� �.': 'Tomáš Š.',
  // M. Mučka
  'M. MŽŽka': 'M. Mučka',
  'M. M\xbd\xbdka':     'M. Mučka',
  'M. M��ka':  'M. Mučka',
  // Michal Plevka, Martin Němeth, Andrej Mikovec — bez diakritiky
  'Michal P.': 'Michal P.',
  'Martin N.': 'Martin N.',
  'Andrej M.': 'Andrej M.',
};

// ── Produkty parsované z Excelu (72 záznamov) ──────────────────────────────
const PRODUCTS = [
  { nr:1,  product:'DSP-01',     desc:'Dielectric Strain Patch',                           druh:'Sensor',  cat:'Strain',        po:'Braňo P.',  bo:'Filip Š.',  stav:'NOK'  },
  { nr:2,  product:'DSP-01/T',   desc:'Dielectric Strain Patch — 2x kabel',                druh:'Sensor',  cat:'Strain',        po:'Braňo P.',  bo:'Filip Š.',  stav:'NOK'  },
  { nr:3,  product:'DSP-01/T',   desc:'Dielectric Strain Patch — jednosmerný',              druh:'Sensor',  cat:'Strain',        po:'Braňo P.',  bo:'Filip Š.',  stav:'NOK'  },
  { nr:4,  product:'SBP-01',     desc:'S-line Battery Pack 4',                             druh:'S-line',  cat:'Battery Pack',  po:'Braňo P.',  bo:'Michal P.', stav:'WIP'  },
  { nr:5,  product:'SBP-02',     desc:'S-line Battery Pack 8',                             druh:'S-line',  cat:'Battery Pack',  po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:6,  product:'SCN-80',     desc:'S-line Scan 800',                                   druh:'S-line',  cat:'Scan',          po:'Braňo P.',  bo:'Michal P.', stav:'WIP'  },
  { nr:7,  product:'SCN-84',     desc:'S-line Scan 804',                                   druh:'S-line',  cat:'Scan',          po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:8,  product:'SCN-84D',    desc:'S-line Scan 804D',                                  druh:'S-line',  cat:'Scan',          po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:9,  product:'SCN-86',     desc:'S-line Scan 816',                                   druh:'S-line',  cat:'Scan',          po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:10, product:'SCN-87',     desc:'S-line Scan 836',                                   druh:'S-line',  cat:'Scan',          po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:11, product:'SCN-88D',    desc:'S-line Scan 808D',                                  druh:'S-line',  cat:'Scan',          po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:12, product:'SCN-86D',    desc:'S-line Scan 816D',                                  druh:'S-line',  cat:'Scan',          po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:13, product:'SPC-03',     desc:'S-line Comp 3.0',                                   druh:'S-line',  cat:'Computer',      po:'Braňo P.',  bo:'Michal P.', stav:'NOK'  },
  { nr:14, product:'SPL-02',     desc:'S-line Splitter 1x2',                               druh:'S-line',  cat:'Splitter',      po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:15, product:'SPL-04',     desc:'S-line Splitter 1x4',                               druh:'S-line',  cat:'Splitter',      po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:16, product:'SPL-16',     desc:'S-line Splitter 4x16',                              druh:'S-line',  cat:'Splitter',      po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:17, product:'SWD-04',     desc:'S-line Switch 1x4D',                                druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:18, product:'SWD-08',     desc:'S-line Switch 1x8D',                                druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:19, product:'SWD-16',     desc:'S-line Switch 1x16D',                               druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:20, product:'SWS-04',     desc:'S-line Switch 1x4',                                 druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:21, product:'SWS-16',     desc:'S-line Switch 1x16',                                druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:22, product:'SWS-16U',    desc:'S-line Switch 1x16 USB',                            druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:23, product:'SWS-36',     desc:'S-line Switch 1x36 (origin)',                       druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:24, product:'SWS-36',     desc:'S-line Switch 1x36 (nový, prepísané SHV)',          druh:'S-line',  cat:'Switch',        po:'Braňo P.',  bo:'Michal P.', stav:'WIP'  },
  { nr:25, product:'DTP-02',     desc:'Dielectric Temperature Patch',                      druh:'Sensor',  cat:'Temperature',   po:'Filip Š.',  bo:'B. Pikus',  stav:''     },
  { nr:26, product:'MS-03',      desc:'Mountable strain sensor',                           druh:'Sensor',  cat:'Strain',        po:'Filip Š.',  bo:'Tomáš Š.',  stav:'DONE' },
  { nr:27, product:'SB-01',      desc:'SisterBar',                                         druh:'Sensor',  cat:'Strain',        po:'Filip Š.',  bo:'M. Mučka',  stav:'DONE' },
  { nr:28, product:'SC-01/T',    desc:'Strain cable sensor — 130°C',                       druh:'Sensor',  cat:'Strain',        po:'M. Mučka',  bo:'Michal P.', stav:'DONE' },
  { nr:29, product:'SC-01',      desc:'Strain cable sensor',                               druh:'Sensor',  cat:'Strain',        po:'M. Mučka',  bo:'Michal P.', stav:'DONE' },
  { nr:30, product:'SC-01/T',    desc:'Strain cable sensor NEO',                           druh:'Sensor',  cat:'Strain',        po:'M. Mučka',  bo:'Michal P.', stav:''     },
  { nr:31, product:'TP-01',      desc:'Temperature probe sensor',                          druh:'Sensor',  cat:'Temperature',   po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:32, product:'TPA-01',     desc:'Temperature array sensor',                          druh:'Sensor',  cat:'Temperature',   po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:33, product:'D-04',       desc:'Displacement sensor',                               druh:'Sensor',  cat:'Displacement',  po:'Andrej M.', bo:'Tomáš Š.',  stav:'DONE' },
  { nr:34, product:'ES-03',      desc:'Embeddable strain sensor',                          druh:'Sensor',  cat:'Strain',        po:'Filip Š.',  bo:'Tomáš Š.',  stav:''     },
  { nr:35, product:'LLS-01',     desc:'Liquid level sensor',                               druh:'Sensor',  cat:'Pressure',      po:'Andrej M.', bo:'Tomáš Š.',  stav:''     },
  { nr:36, product:'P-05',       desc:'Pressure sensor',                                   druh:'Sensor',  cat:'Pressure',      po:'Andrej M.', bo:'Tomáš Š.',  stav:'DONE' },
  { nr:37, product:'SAT-01',     desc:'Single Axis Tiltmeter',                             druh:'Sensor',  cat:'Tiltmeter',     po:'Andrej M.', bo:'Tomáš Š.',  stav:'DONE' },
  { nr:38, product:'SAT-02',     desc:'Single Axis Tiltmeter v2',                          druh:'Sensor',  cat:'Tiltmeter',     po:'Andrej M.', bo:'Filip Š.',  stav:''     },
  { nr:39, product:'SAT-03',     desc:'Single Axis Tiltmeter v3',                          druh:'Sensor',  cat:'Tiltmeter',     po:'Andrej M.', bo:'Tomáš Š.',  stav:'DONE' },
  { nr:40, product:'GFA-01',     desc:'GFRP fiber array sensor',                           druh:'Sensor',  cat:'Strain',        po:'Michal P.', bo:'Braňo P.',  stav:'DONE' },
  { nr:41, product:'STS-03',     desc:'Surface temperature sensor',                        druh:'Sensor',  cat:'Temperature',   po:'Michal P.', bo:'Braňo P.',  stav:'DONE' },
  { nr:42, product:'STS-04',     desc:'Surface high-temperature sensor',                   druh:'Sensor',  cat:'Temperature',   po:'Michal P.', bo:'Braňo P.',  stav:'DONE' },
  { nr:43, product:'SWS-02',     desc:'Spot weldable strain sensor',                       druh:'Sensor',  cat:'Strain',        po:'Michal P.', bo:'M. Mučka',  stav:'DONE' },
  { nr:44, product:'SWS-02/T',   desc:'Spot weldable strain sensor + temp',                druh:'Sensor',  cat:'Strain',        po:'Michal P.', bo:'M. Mučka',  stav:'DONE' },
  { nr:45, product:'SWS-03',     desc:'Spot weldable strain sensor v3',                    druh:'Sensor',  cat:'Strain',        po:'Michal P.', bo:'M. Mučka',  stav:'DONE' },
  { nr:46, product:'TP-03',      desc:'Temperature sensor',                                druh:'Sensor',  cat:'Temperature',   po:'Michal P.', bo:'Tomáš Š.',  stav:'DONE' },
  { nr:47, product:'FFA-01',     desc:'FBG fiber array sensor',                            druh:'Sensor',  cat:'Strain',        po:'M. Mučka',  bo:'Michal P.', stav:'DONE' },
  { nr:48, product:'TC-04',      desc:'TC-04 FBGS',                                        druh:'Sensor',  cat:'Temperature',   po:'Braňo P.',  bo:'Michal P.', stav:'DONE' },
  { nr:49, product:'TP-01',      desc:'TP-01 FBGS',                                        druh:'Sensor',  cat:'Temperature',   po:'Braňo P.',  bo:'Michal P.', stav:'DONE' },
  { nr:50, product:'FFA-01 FBGS',desc:'FFA-01 FBGS — DTG konektorovačky',                 druh:'Sensor',  cat:'Strain',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:51, product:'SG-01 FBGS', desc:'SG-01 FBGS — rôzne verzie',                        druh:'Sensor',  cat:'Strain',        po:'Braňo P.',  bo:'Michal P.', stav:''     },
  { nr:52, product:'ALC-01',     desc:'Anchor Load Cell',                                  druh:'Sensor',  cat:'Load',          po:'Martin N.', bo:'',          stav:''     },
  { nr:53, product:'DSS-00',     desc:'Dielectric single strain sensor',                   druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:54, product:'DSS-00/T',   desc:'Dielectric single strain sensor + temp',            druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:55, product:'DSS-01',     desc:'Dielectric strain array sensor',                    druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'WIP'  },
  { nr:56, product:'DTP-01',     desc:'Dielectric temperature probe sensor',               druh:'Sensor',  cat:'Temperature',   po:'Tomáš Š.',  bo:'Braňo P.',  stav:''     },
  { nr:57, product:'HS-01',      desc:'Humidity sensor',                                   druh:'Sensor',  cat:'Humidity',      po:'Tomáš Š.',  bo:'Filip Š.',  stav:'DONE' },
  { nr:58, product:'HTA-01',     desc:'High temperature array sensor',                     druh:'Sensor',  cat:'Temperature',   po:'Tomáš Š.',  bo:'Michal P.', stav:''     },
  { nr:59, product:'MSA-01',     desc:'Mountable strain array sensor',                     druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:''     },
  { nr:60, product:'SAA-01',     desc:'Single Axis Accelerometer',                         druh:'Sensor',  cat:'Accelerometer', po:'Tomáš Š.',  bo:'Filip Š.',  stav:'DONE' },
  { nr:61, product:'SAA-02',     desc:'Single Axis Accelerometer v2',                      druh:'Sensor',  cat:'Accelerometer', po:'Tomáš Š.',  bo:'Filip Š.',  stav:'DONE' },
  { nr:62, product:'SAA-04',     desc:'Single Axis Accelerometer v4',                      druh:'Sensor',  cat:'Accelerometer', po:'Tomáš Š.',  bo:'Filip Š.',  stav:'DONE' },
  { nr:63, product:'SDS-01',     desc:'Sewer deformation sensor',                          druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Braňo P.',  stav:''     },
  { nr:64, product:'STS-11',     desc:'Surface temperature sensor (60°C)',                 druh:'Sensor',  cat:'Temperature',   po:'Tomáš Š.',  bo:'Filip Š.',  stav:'DONE' },
  { nr:65, product:'SWA-00',     desc:'Spot-weldable single strain sensor',                druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:66, product:'SWA-00/T',   desc:'Spot-weldable single strain sensor + Temp',         druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:67, product:'SWA-01',     desc:'Spot-weldable strain array sensor',                 druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:68, product:'SSR-01/T',   desc:'Spot-weldable strain rosette',                      druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
  { nr:69, product:'MS-11',      desc:'Mountable strain sensor, vibrate proof',            druh:'Sensor',  cat:'Strain',        po:'Filip Š.',  bo:'Tomáš Š.',  stav:''     },
  { nr:70, product:'SDS-02',     desc:'Sewer deformation sensor v2',                       druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Braňo P.',  stav:''     },
  { nr:71, product:'SDS-02/T',   desc:'Sewer deformation sensor v2 + Temp',                druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Braňo P.',  stav:''     },
  { nr:72, product:'SF-01',      desc:'Strain foil sensor',                                druh:'Sensor',  cat:'Strain',        po:'Tomáš Š.',  bo:'Michal P.', stav:'DONE' },
];

const DEFAULT_PASS = 'FOS2026!';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  // ── 1. Vytvor User účty ─────────────────────────────────────────────────
  const userIdMap = {};  // key (Braňo P., ...) → _id

  const uniquePeople = [];
  const seen = new Set();
  for (const p of PEOPLE) {
    if (!seen.has(p.username)) { seen.add(p.username); uniquePeople.push(p); }
  }

  let usersCreated = 0, usersSkipped = 0;
  for (const p of uniquePeople) {
    let u = await User.findOne({ username: p.username });
    if (!u) {
      u = await User.create({
        username: p.username,
        name: p.name,
        role: p.role,
        passwordHash: await bcrypt.hash(DEFAULT_PASS, 10),
      });
      console.log(`  ✓ User vytvorený: ${p.username} (${p.name})`);
      usersCreated++;
    } else {
      console.log(`  · User existuje: ${p.username} (${u.name})`);
      usersSkipped++;
    }
    // Mapuj všetky kľúče pre tohto usera
    for (const pm of PEOPLE) {
      if (pm.username === p.username) userIdMap[pm.key] = u._id;
    }
  }
  console.log(`Users: ${usersCreated} vytvorených, ${usersSkipped} existovalo`);

  // ── 2. Vytvor ProductOwner záznamy ──────────────────────────────────────
  let poCreated = 0, poSkipped = 0;

  for (const p of PRODUCTS) {
    // Unikátnosť: produkt + desc
    const existingKey = `${p.product}||${p.desc}`;
    const escapedDesc = p.desc.substring(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await ProductOwner.findOne({ product: p.product, note: { $regex: escapedDesc } });
    if (existing) { poSkipped++; continue; }

    const poId = p.po ? userIdMap[p.po] || null : null;
    const boId = p.bo ? userIdMap[p.bo] || null : null;

    const noteText = [
      `${p.druh} | ${p.cat}`,
      p.desc ? `Popis: ${p.desc}` : '',
      p.stav ? `Stav: ${p.stav}` : '',
    ].filter(Boolean).join(' · ');

    await ProductOwner.create({
      product: p.product,
      po:      poId,
      bo:      boId,
      note:    noteText,
    });
    poCreated++;
  }

  console.log(`\nProductOwner záznamy: ${poCreated} vytvorených, ${poSkipped} existovalo`);
  console.log('\n── Súhrn ──────────────────────────────────────────────────────');
  console.log(`Celkovo vložených ${poCreated} produktov s vlastníkmi`);
  console.log(`Predvolené heslo pre nových používateľov: ${DEFAULT_PASS}`);
  console.log('Zmeň heslá v Admin > Používatelia po prvom prihlásení.\n');

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
