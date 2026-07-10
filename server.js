require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs   = require('fs');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

const { DEFAULT_LINKS } = require('./config/defaults');
const { version: APP_VERSION } = require('./package.json');
const STARTED_AT = new Date();

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
// Zvukové nahrávky (hlasový diktát v pracovných postupoch) — väčší limit
const uploadAudio = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// In-memory sensor config — updated live by admin routes
const sensorCfg = { ip: '10.88.5.184', path: '/values.xml', interval: 60 };

async function loadSensorConfig() {
  try {
    const AppConfig = require('./models/AppConfig');
    const entries = await AppConfig.find({ key: { $in: ['sensor.ip', 'sensor.path', 'sensor.interval'] } }).lean();
    entries.forEach(({ key, value }) => {
      if (key === 'sensor.ip')       sensorCfg.ip       = String(value);
      if (key === 'sensor.path')     sensorCfg.path     = String(value);
      if (key === 'sensor.interval') sensorCfg.interval = Number(value);
    });
    console.log(`Sensor config: ${sensorCfg.ip}${sensorCfg.path} every ${sensorCfg.interval}s`);
  } catch (e) {
    console.error('loadSensorConfig error:', e.message);
  }
}

// MongoDB connection + auto-seed on first run
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await autoSeed();
    await loadSensorConfig();
    startSensorPolling();
  })
  .catch(err => console.error('MongoDB error:', err));

async function autoSeed() {
  const Category   = require('./models/Category');
  const Product    = require('./models/Product');
  const HeaderLink = require('./models/HeaderLink');
  const AppConfig  = require('./models/AppConfig');

  // ── Seed predvoleného admina ─────────────────────────────────────────────
  try {
    const User = require('./models/User');
    if (await User.countDocuments() === 0) {
      const bcrypt = require('bcryptjs');
      const pass = process.env.ADMIN_PASSWORD || 'sylex123';
      await User.create({ username: 'admin', name: 'Administrátor', role: 'admin', passwordHash: await bcrypt.hash(pass, 10) });
      console.log(`Seed: admin user created (username: admin, password: ${process.env.ADMIN_PASSWORD ? '[z ADMIN_PASSWORD]' : 'sylex123'})`);
    }
  } catch (e) { console.error('admin seed:', e.message); }

  // ── Seed HeaderLinks (default chips) ─────────────────────────────────────
  const linkCount = await HeaderLink.countDocuments();
  if (linkCount === 0) {
    await HeaderLink.insertMany(DEFAULT_LINKS);
    console.log('Seed: HeaderLinks inserted');
  } else {
    // DB already has links — ensure new "servery" (server folder) defaults exist
    const serveryCount = await HeaderLink.countDocuments({ group: 'servery' });
    if (serveryCount === 0) {
      const serveryDefaults = DEFAULT_LINKS.filter(l => l.group === 'servery');
      if (serveryDefaults.length) {
        await HeaderLink.insertMany(serveryDefaults);
        console.log('Seed: server folder links inserted');
      }
    }
    // Pripni DBFOS/ISYS priamo do hlavičky, ak ešte nie je nič pripnuté
    const pinnedCount = await HeaderLink.countDocuments({ pinned: true });
    if (pinnedCount === 0) {
      const r = await HeaderLink.updateMany({ label: { $in: ['DBFOS', 'ISYS'] } }, { $set: { pinned: true } });
      if (r.modifiedCount) console.log('Migration: DBFOS/ISYS pinned to header');
    }
    // Migrácia: obedové odkazy do samostatnej skupiny "Jedlo" (Obed Sylex, Obed Fantozzi)
    const jedloCount = await HeaderLink.countDocuments({ group: 'jedlo' });
    if (jedloCount === 0) {
      const r1 = await HeaderLink.updateMany({ label: { $in: ['Obedy', 'Obed Sylex'] } }, { $set: { group: 'jedlo', label: 'Obed Sylex' } });
      const r2 = await HeaderLink.updateMany({ label: { $in: ['Obedy Fantozzi', 'Obed Fantozzi'] } }, { $set: { group: 'jedlo', label: 'Obed Fantozzi' } });
      if (r1.modifiedCount || r2.modifiedCount) console.log('Migration: obedové odkazy presunuté do skupiny Jedlo');
    }
  }

  // ── Seed AppConfig (sensor settings) ─────────────────────────────────────
  const cfgCount = await AppConfig.countDocuments();
  if (cfgCount === 0) {
    await AppConfig.insertMany([
      { key: 'sensor.ip',       value: '10.88.5.184',  label: 'IP adresa senzora',  group: 'sensor', type: 'string' },
      { key: 'sensor.path',     value: '/values.xml',  label: 'Cesta (path)',        group: 'sensor', type: 'string' },
      { key: 'sensor.interval', value: 60,             label: 'Interval (s)',        group: 'sensor', type: 'number' },
      { key: 'sensor.ch1',      value: 'humidity',     label: 'Kanál 1 (ch1)',       group: 'sensor', type: 'string' },
      { key: 'sensor.ch2',      value: 'temperature',  label: 'Kanál 2 (ch2)',       group: 'sensor', type: 'string' },
    ]);
    console.log('Seed: AppConfig inserted');
  }

  // ── Návody z firemných dokumentov (idempotentné, beží vždy) ───────────────
  try {
    const { seedGuides } = require('./scripts/seedGuides');
    const gr = await seedGuides();
    if (gr.inserted) console.log(`Seed: Návody vložené (${gr.inserted})`);
  } catch (e) { console.error('Seed Návody zlyhalo:', e.message); }

  // ── Zariadenia pre Vyťaženie technológií (idempotentné, beží vždy) ────────
  try {
    const Equipment = require('./models/Equipment');
    if (await Equipment.countDocuments() === 0) {
      await Equipment.insertMany([
        { name: 'Klimatická komora 1', code: 'KK-01', type: 'chamber', color: '#0891b2', order: 0 },
        { name: 'Klimatická komora 2', code: 'KK-02', type: 'chamber', color: '#2563eb', order: 1 },
        { name: 'Pec na vypekanie 1',  code: 'PEC-01', type: 'oven',    color: '#d97706', order: 2 },
        { name: 'Pec na vypekanie 2',  code: 'PEC-02', type: 'oven',    color: '#dc2626', order: 3 },
      ]);
      console.log('Seed: Equipment (komory + pece) vložené');
    }
  } catch (e) { console.error('Seed Equipment zlyhalo:', e.message); }

  // ── Vlastníci produktov (import z Excelu, len ak je prázdne) ──────────────
  try {
    const { seedProductOwners } = require('./scripts/seedProductOwners');
    const r = await seedProductOwners();
    if (r.imported) console.log(`Seed: Vlastníci produktov importovaní (${r.imported})`);
  } catch (e) { console.error('Seed Vlastníci produktov zlyhalo:', e.message); }

  // ── Seed KB sample data ───────────────────────────────────────────────────
  const count = await Product.countDocuments();
  if (count > 0) return; // DB already has KB data, skip
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

// Parse a value from Web Sensor T-series XML  (ch1 = humidity %RH, ch2 = temperature °C)
function parseChannel(xml, ch) {
  const block = xml.match(new RegExp(`<${ch}>[\\s\\S]*?<\\/${ch}>`));
  if (!block) return null;
  const m = block[0].match(/<aval>([^<]+)<\/aval>/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return isNaN(v) ? null : v;
}

// Poll Web Sensor and persist reading to MongoDB
function startSensorPolling() {
  const SensorReading = require('./models/SensorReading');
  let timer = null;

  const poll = () => {
    const r = http.get({ host: sensorCfg.ip, port: 80, path: sensorCfg.path, timeout: 5000 }, (resp) => {
      let raw = '';
      resp.on('data', chunk => raw += chunk);
      resp.on('end', async () => {
        const humidity    = parseChannel(raw, 'ch1');
        const temperature = parseChannel(raw, 'ch2');
        if (temperature !== null || humidity !== null) {
          try { await SensorReading.create({ temperature, humidity }); }
          catch (e) { console.error('Sensor save:', e.message); }
        }
      });
    });
    r.on('error', () => {});
    r.on('timeout', () => r.destroy());

    // Reschedule with current interval (allows live config changes to take effect)
    timer = setTimeout(poll, sensorCfg.interval * 1000);
  };

  poll(); // immediate first reading
  console.log(`Sensor polling started → ${sensorCfg.ip}${sensorCfg.path} every ${sensorCfg.interval}s`);
}

// ── Auth (verejné) ────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ── File server: verejné zákaznícke API (heslom chránené zdieľania) ──────────
app.use('/api/share', require('./routes/sharePublic'));

// Version / health endpoint (verejné)
app.get('/api/version', (req, res) => {
  res.json({
    version:   APP_VERSION,
    commit:    process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'unknown',
    commitMsg: process.env.RAILWAY_GIT_COMMIT_MESSAGE || undefined,
    branch:    process.env.RAILWAY_GIT_BRANCH || undefined,
    env:       process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'local',
    startedAt: STARTED_AT.toISOString(),
    uptimeSec: Math.round(process.uptime()),
    dbState:   ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  });
});

// ── Guard: všetko ostatné pod /api vyžaduje prihlásenie ───────────────────────
const { requireAuth } = require('./middleware/auth');
app.use('/api', (req, res, next) => {
  if (req.path === '/version' || req.path.startsWith('/auth') || req.path.startsWith('/share/') || req.path === '/calendar/feed.ics' || req.path === '/calendar/public') return next();
  return requireAuth(req, res, next);
});

// Routes (chránené)
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/procedures', require('./routes/procedures'));
app.use('/api/guides', require('./routes/guides'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/production', require('./routes/production'));
app.use('/api/manufacturing', require('./routes/manufacturing'));
app.use('/api/product-workflows', require('./routes/productWorkflow'));
app.use('/api/product-owners', require('./routes/productOwners'));
app.use('/api/backbones', require('./routes/backbones'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/instruments', require('./routes/instruments'));
app.use('/api/prototypes', require('./routes/prototypes'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/users', require('./routes/users'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/interrogators', require('./routes/interrogators'));
app.use('/api/datasheets', require('./routes/datasheets'));
app.use('/api/sensor-types', require('./routes/sensorTypes'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/management', require('./routes/management'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/github', require('./routes/github'));
app.use('/api/remote', require('./routes/remote'));
app.use('/api/admin', require('./routes/admin')(sensorCfg));
app.use('/api/fileshare', require('./routes/fileshare'));

// Credentials endpoint (internal use only)
app.get('/api/credentials/peaklogger', (req, res) => {
  res.json({
    user: process.env.PEAKLOGGER_USER || '',
    pass: process.env.PEAKLOGGER_PASS || ''
  });
});

// Live reading from Web Sensor (ch1=humidity %RH, ch2=temperature °C)
app.get('/api/sensor/thermo', (req, res) => {
  const r = http.get({ host: sensorCfg.ip, port: 80, path: sensorCfg.path, timeout: 3000 }, (resp) => {
    let raw = '';
    resp.on('data', chunk => raw += chunk);
    resp.on('end', () => {
      const humidity    = parseChannel(raw, 'ch1');
      const temperature = parseChannel(raw, 'ch2');
      res.json({ online: true, temperature, humidity });
    });
  });
  const sendOffline = () => { if (!res.headersSent) res.json({ online: false, temperature: null, humidity: null }); };
  r.on('error', sendOffline);
  r.on('timeout', () => { r.destroy(); sendOffline(); });
});

// Historical sensor readings (default last 24 h, max 720 h = 30 days)
app.get('/api/sensor/history', async (req, res) => {
  try {
    const SensorReading = require('./models/SensorReading');
    const hours = Math.min(parseInt(req.query.hours) || 24, 720);
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const data  = await SensorReading
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .select('temperature humidity timestamp -_id')
      .lean();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Image upload endpoint
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    return res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// Audio upload endpoint (hlasový diktát → priloženie nahrávky k pracovnému postupu)
app.post('/api/upload/audio', (req, res) => {
  uploadAudio.single('audio')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Žiadny zvukový súbor' });
    return res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// File server: verejná zákaznícka stránka zdieľania (/s/<token>)
app.get('/s/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

// Catch-all: serve SPA (only for non-API routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err && !res.headersSent) res.status(404).send('Not found');
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return;
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`FOS Dashboard running on http://localhost:${PORT}`);
});

// Čisté ukončenie pri redeploy/škálovaní (Railway posiela SIGTERM) — bez „npm error signal SIGTERM"
function gracefulShutdown(sig) {
  console.log(`${sig} prijatý — ukončujem server…`);
  server.close(() => {
    mongoose.connection.close(false).finally(() => process.exit(0));
  });
  // poistka: ak sa nezavrie do 8 s, ukonči aj tak s úspešným kódom
  setTimeout(() => process.exit(0), 8000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
