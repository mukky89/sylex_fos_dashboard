require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// MongoDB connection + auto-seed on first run
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await autoSeed();
  })
  .catch(err => console.error('MongoDB error:', err));

async function autoSeed() {
  const Category = require('./models/Category');
  const Product  = require('./models/Product');

  const count = await Product.countDocuments();
  if (count > 0) return; // DB already has data, skip

  console.log('Empty DB detected — seeding initial data...');

  const cat = await Category.create({ name: 'Tlačiarne', icon: '🖨️', color: '#00d4ff' });

  await Product.create({
    name: 'Brother TD-4420TN',
    model: 'TD-4420TN',
    category: cat._id,
    description: '4" termotransferová sieťová tlačiareň etikiet s USB a LAN, 203 dpi, 152 mm/s',
    content: `<h2>Technické parametre</h2>
<table><tbody>
  <tr><td><strong>Technológia tlače</strong></td><td>Termotransfer / Priama termálna</td></tr>
  <tr><td><strong>Rozlíšenie</strong></td><td>203 dpi</td></tr>
  <tr><td><strong>Rýchlosť tlače</strong></td><td>až 152 mm/s (6 ips)</td></tr>
  <tr><td><strong>Šírka tlače</strong></td><td>max. 108 mm</td></tr>
  <tr><td><strong>Max. dĺžka etikety</strong></td><td>25 400 mm</td></tr>
  <tr><td><strong>Konektivita</strong></td><td>USB, Ethernet (LAN), Sériový port</td></tr>
  <tr><td><strong>Emulácia</strong></td><td>ZPL, EPL, DPL</td></tr>
  <tr><td><strong>OS podpora</strong></td><td>Windows 10/11, Windows Server, macOS, Linux</td></tr>
  <tr><td><strong>Záruka</strong></td><td>2 roky vrátane tlačovej hlavy</td></tr>
</tbody></table>

<h2>Ovládače a softvér</h2>
<ul>
  <li><a href="https://support.brother.com/g/b/downloadtop.aspx?c=us&lang=en&prod=lptd4420tneus">Brother Support — Downloads TD-4420TN</a></li>
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
  <li>Prípadne cez panel tlačiarne: Menu → Network → Wired LAN → TCP/IP → IP Address</li>
</ol>`,
    tags: ['brother', 'tlačiareň', 'etikety', 'termotransfer', 'LAN', 'USB', 'ZPL'],
    status: 'active'
  });

  console.log('Seed complete: Tlačiarne / Brother TD-4420TN');
}

// Routes
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);

// Credentials endpoint (internal use only)
app.get('/api/credentials/peaklogger', (req, res) => {
  res.json({
    user: process.env.PEAKLOGGER_USER || '',
    pass: process.env.PEAKLOGGER_PASS || ''
  });
});

// Image upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Catch-all: serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FOS Dashboard running on http://localhost:${PORT}`);
});
