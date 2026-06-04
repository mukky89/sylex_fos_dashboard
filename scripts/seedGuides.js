/**
 * Návody vytvorené z reálnych firemných dokumentov (Postup proforma + Transport kontakt).
 * Idempotentné — preskočí návod, ktorý už existuje (podľa názvu).
 * Spúšťa sa automaticky pri štarte servera (autoSeed) a tiež cez
 *   Admin → Systém → "Importovať návody" (POST /api/admin/seed-guides).
 */
const Guide = require('../models/Guide');

const GUIDES = [
  {
    title: 'Postup pre zasielanie zásielok (najmä vzoriek) mimo systém',
    category: 'Expedícia / Logistika',
    author: 'Ivan Mesároš',
    date: new Date('2023-05-15'),
    status: 'active',
    summary: 'Vytváranie proforma faktúr v ISYSe pri posielaní vzoriek mimo systém — nahrádza pôvodný mail s tabuľkou.',
    content: `
<p>Postup slúži na vytváranie <strong>proforma faktúr</strong> a nahrádza mail s tabuľkou v prípade posielania vzoriek mimo systém. Všetky polia, ktoré boli v tabuľke, už existujú v ISYSe a tak je užívateľ schopný vytvoriť tento dokument samostatne.</p>

<h2>Postup</h2>
<ol>
  <li>Otvor nový ISYS — <a href="https://isys.sylex.sk/">https://isys.sylex.sk/</a></li>
  <li>Karta <strong>Expedícia</strong></li>
  <li>Tlačidlo <strong>„Proforma"</strong></li>
  <li>Vytvoriť <strong>dodací list</strong> (podklad pre PROFORMA faktúru)</li>
</ol>

<h2>Užívateľ vypĺňa tieto polia (ako v starej forme)</h2>
<p><img src="/assets/guides/proforma-form.png" alt="Vytvoriť dodací list — formulár v ISYS"></p>
<ul>
  <li><strong>Zákazník</strong> = Vykládka</li>
  <li><strong>Prepravca</strong> — ak zákazník / dodávateľ zadal</li>
  <li><strong>Služba</strong> — ak zákazník / dodávateľ zadal</li>
  <li><strong>Poznámka</strong> — Platca, Attn, špeciálne požiadavky zákazníka / dodávateľa, poznámky potrebné pre balenie</li>
</ul>

<h3>Pridať balenie</h3>
<ul><li>Zadať balenie, rozmery a popis tovaru</li></ul>

<h3>Pridať položku</h3>
<ul>
  <li><strong>Nový riadok</strong> — prázdny riadok</li>
  <li><strong>Výrobok</strong> — vyhľadá výrobok v číselníku výrobkov</li>
  <li><strong>PN</strong> — vyhľadá materiálové PN v číselníku materiálov</li>
</ul>

<h3>Povinné polia</h3>
<ul>
  <li>HS kód</li>
  <li>Krajina pôvodu</li>
  <li>Množstvo</li>
</ul>

<p>➡️ <strong>Uložiť.</strong></p>

<h2>Mailové potvrdenie</h2>
<p>Po uložení sa odošle mailové potvrdenie pre skupinu:<br>
<em>nakup@sylex.sk, finance@sylex.sk, dmegova@sylex.sk, expedicia@sylex.sk</em></p>

<p><span style="color: #15803d"><strong>✅ AK JE prepravca a služba zvolená</strong></span> — proforma má všetky informácie a môžu s ňou ďalej pracovať ľudia, ktorí s ňou potrebujú pracovať. Mail obsahuje priame prepojenie na DL.</p>
<p><img src="/assets/guides/proforma-mail-ok.png" alt="PROFORMA — DL55045 (kompletná)"></p>

<p><span style="color: #b45309"><strong>⚠️ AK NIE JE prepravca a služba zvolená</strong></span> — proforma potrebuje doplniť tieto informácie. Úsek logistiky doplní tieto údaje podľa parametrov a dodací list uloží pre potreby následnej práce. Mail obsahuje priame prepojenie na DL.</p>
<p><img src="/assets/guides/proforma-mail-doplnit.png" alt="PROFORMA — Doplniť Prepravcu — DL55046"></p>
`.trim(),
    revNote: 'Import z dokumentu „Postup_pre_zasielanie_zasielok_mimo_system.docx"'
  },
  {
    title: 'Transport: kontakt, telefón, email',
    category: 'Expedícia / Logistika',
    author: 'Dorota Megová',
    date: new Date('2026-06-04'),
    status: 'active',
    summary: 'Pri zákazke Transport vždy vyplňte kontaktnú osobu a telefón — bez nich nevieme spracovať prepravu.',
    content: `
<p>Žiadosť pre všetkých zainteresovaných, ktorí majú na starosti dopĺňanie informácií do zákazky <strong>Transport</strong>.</p>

<h2>Čo treba vždy vyplniť</h2>
<p><strong>Kontaktná osoba</strong> a <strong>telefón</strong> musia byť <strong>vždy vyplnené</strong>. Ak je aj e-mail, je to len plus informácia.</p>
<p><img src="/assets/guides/transport-zakazka.png" alt="Zákazka Transport — kontaktná osoba a telefón"></p>

<h2>Prečo je to dôležité</h2>
<p>Tieto údaje sa zobrazujú v <strong>dodacom liste</strong>, odkiaľ úsek expedície čerpá informácie pre vyplnenie prepravných služieb.</p>
<p><img src="/assets/guides/transport-dodaci-list.png" alt="Dodací list — kontakt prepravy"></p>

<p><span style="color: #dc2626"><strong>❗ Prepravné služby bez kontaktných údajov nevieme spracovať.</strong></span></p>

<p>Ďakujem,<br>Dorka</p>
<hr>
<p><em>Dorota Megová — Vedúca balenia &amp; expedície · Fiber Optic Interconnections<br>
SYLEX, s.r.o. | Mlynské luhy 31 | 821 05 Bratislava | Slovak Republic<br>
Direct: +421-2-4820-1873 | Mobile: +421-904-818-891 | dmegova@sylex.sk | www.sylex.sk</em></p>
`.trim(),
    revNote: 'Import z e-mailu „Transport: kontakt, telefón, email" (D. Megová)'
  }
];

async function seedGuides() {
  const result = { inserted: 0, skipped: 0, titles: [] };
  for (const g of GUIDES) {
    const exists = await Guide.findOne({ title: g.title });
    if (exists) { result.skipped++; continue; }
    const { revNote, ...data } = g;
    data.rev = 1;
    data.revisions = [{
      rev: 1, date: data.date || new Date(), author: data.author || '',
      note: revNote || 'Prvá verzia',
      title: data.title, summary: data.summary || '', content: data.content || ''
    }];
    await Guide.create(data);
    result.inserted++;
    result.titles.push(g.title);
  }
  return result;
}

module.exports = { seedGuides };

// CLI spustenie
if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    if (!process.env.MONGODB_URI) { console.error('Chýba MONGODB_URI'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    const r = await seedGuides();
    console.log('Návody:', r);
    await mongoose.disconnect();
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
