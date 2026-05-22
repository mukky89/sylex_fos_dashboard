require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Category: Tlačiarne
  let cat = await Category.findOne({ name: 'Tlačiarne' });
  if (!cat) {
    cat = await Category.create({ name: 'Tlačiarne', icon: '🖨️', color: '#00d4ff' });
    console.log('Category created:', cat.name);
  }

  const brotherContent = `
<h2>Technické parametre</h2>
<table>
  <tr><td><strong>Technológia tlače</strong></td><td>Termotransfer / Priama termálna</td></tr>
  <tr><td><strong>Rozlíšenie</strong></td><td>203 dpi</td></tr>
  <tr><td><strong>Rýchlosť tlače</strong></td><td>až 152 mm/s (6 ips)</td></tr>
  <tr><td><strong>Šírka tlače</strong></td><td>max. 108 mm</td></tr>
  <tr><td><strong>Max. dĺžka etikety</strong></td><td>25 400 mm</td></tr>
  <tr><td><strong>Konektivita</strong></td><td>USB, Ethernet (LAN), Sériový port</td></tr>
  <tr><td><strong>Emulácia</strong></td><td>ZPL, EPL, DPL</td></tr>
  <tr><td><strong>OS podpora</strong></td><td>Windows 10/11, Windows Server, macOS, Linux</td></tr>
  <tr><td><strong>Záruka</strong></td><td>2 roky vrátane tlačovej hlavy</td></tr>
</table>

<h2>Ovládače a softvér</h2>
<p>Ovládače pre všetky OS sú dostupné na oficiálnej stránke Brother support:</p>
<ul>
  <li><a href="https://support.brother.com/g/b/downloadtop.aspx?c=us&lang=en&prod=lptd4420tneus">Brother Support — Downloads TD-4420TN (US)</a></li>
  <li><a href="https://support.brother.com/g/b/downloadtop.aspx?c=as_ot&lang=en&prod=lptd4420tneas">Brother Support — Downloads TD-4420TN (Others)</a></li>
</ul>

<h2>Manuály</h2>
<ul>
  <li><a href="https://download.brother.com/welcome/docp100451/td-4420tn_4520tn_use_uke_ug_04.pdf">User's Guide TD-4420TN / 4520TN (PDF, EN)</a></li>
  <li><a href="https://support.brother.com/g/b/manualtop.aspx?c=us&lang=en&prod=lptd4420tneus">Všetky manuály — Brother Support</a></li>
</ul>

<h2>Inštalácia ovládača (Windows)</h2>
<ol>
  <li>Stiahnuť inštalátor z Brother Support stránky (vybrať OS)</li>
  <li>Spustiť <code>DriverInstall.exe</code> ako administrátor</li>
  <li>Vybrať typ pripojenia: <strong>USB</strong> alebo <strong>Wired Network (LAN)</strong></li>
  <li>Pre sieťové pripojenie zadať IP adresu tlačiarne (nastaviteľná cez BRAdmin Professional)</li>
  <li>Dokončiť sprievodcu a vytlačiť testovaciu etiketu</li>
</ol>

<h2>Nastavenie IP adresy (statická)</h2>
<ol>
  <li>Stiahnuť <strong>BRAdmin Professional</strong> z Brother Support</li>
  <li>Otvoriť BRAdmin → nájsť tlačiareň v sieti</li>
  <li>Pravý klik → <em>Configure IP Address</em> → nastaviť statickú IP</li>
  <li>Prípadne cez panel tlačiarne: <em>Menu → Network → Wired LAN → TCP/IP → IP Address</em></li>
</ol>

<h2>Médiá a páska</h2>
<ul>
  <li>Max. priemer kotúča: 203 mm (8")</li>
  <li>Páska (ribbon): max. 300 m, šírka 25,4 – 110 mm</li>
  <li>Pre priamu termálnu tlač — bez pásky (len špeciálne tepelné médiá)</li>
</ul>
`;

  const existing = await Product.findOne({ model: 'TD-4420TN' });
  if (existing) {
    console.log('Product already exists, skipping.');
  } else {
    const product = await Product.create({
      name: 'Brother TD-4420TN',
      model: 'TD-4420TN',
      category: cat._id,
      description: '4" termotransferová sieťová tlačiareň etikiet s USB a LAN, 203 dpi, 152 mm/s',
      content: brotherContent,
      tags: ['brother', 'tlačiareň', 'etikety', 'termotransfer', 'LAN', 'USB', 'ZPL'],
      version: '',
      status: 'active'
    });
    console.log('Product created:', product.name);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(err => { console.error(err); process.exit(1); });
