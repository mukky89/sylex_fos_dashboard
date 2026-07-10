const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const FileShare = require('../models/FileShare');

// Úložisko MIMO public/ — súbory sú dostupné len cez chránený download endpoint
const SHARE_DIR = path.join(__dirname, '..', 'sharefiles');
if (!fs.existsSync(SHARE_DIR)) fs.mkdirSync(SHARE_DIR, { recursive: true });

function shareDirOf(share) { return path.join(SHARE_DIR, String(share._id)); }

// URL token — base62, bez mätúcich znakov
function genToken(len = 14) {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += abc[bytes[i] % abc.length];
  return out;
}

// Čitateľné heslo pre zákazníka, napr. „K7MR-P2XW-D4TN" (bez 0/O, 1/I/l)
function genPassword() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const grp = () => Array.from(crypto.randomBytes(4)).map(b => abc[b % abc.length]).join('');
  return `${grp()}-${grp()}-${grp()}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(SHARE_DIR, String(req.params.id));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname).slice(0, 12));
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024, files: 30 } // 500 MB / súbor
});

// multer dáva originalname v latin1 — oprava diakritiky
function fixName(n) { try { return Buffer.from(n, 'latin1').toString('utf8'); } catch { return n; } }

// ── Zoznam zdieľaní ──
router.get('/', async (req, res) => {
  try { res.json(await FileShare.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Nové zdieľanie — vygeneruje token + heslo (heslo vraciame RAZ, plaintext) ──
router.post('/', async (req, res) => {
  try {
    const { name, note, expiresAt } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Chýba názov zdieľania' });
    const password = genPassword();
    const share = await FileShare.create({
      name: String(name).trim(),
      note: note || '',
      token: genToken(),
      passwordHash: await bcrypt.hash(password, 10),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: (req.user && (req.user.name || req.user.username)) || ''
    });
    res.status(201).json({ share, password });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Úprava (názov, poznámka, aktivita, expirácia) ──
router.patch('/:id', async (req, res) => {
  try {
    const allowed = {};
    ['name', 'note', 'active'].forEach(k => { if (k in req.body) allowed[k] = req.body[k]; });
    if ('expiresAt' in req.body) allowed.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    const share = await FileShare.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
    if (!share) return res.status(404).json({ error: 'Zdieľanie nenájdené' });
    res.json(share);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Nové heslo (staré prestane platiť; plaintext vraciame RAZ) ──
router.post('/:id/password', async (req, res) => {
  try {
    const password = genPassword();
    const share = await FileShare.findByIdAndUpdate(req.params.id, { passwordHash: await bcrypt.hash(password, 10) }, { new: true });
    if (!share) return res.status(404).json({ error: 'Zdieľanie nenájdené' });
    res.json({ share, password });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Upload súborov (viac naraz, pole „files") ──
router.post('/:id/files', (req, res) => {
  upload.array('files')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Súbor presahuje limit 500 MB' : err.message });
    try {
      const share = await FileShare.findById(req.params.id);
      if (!share) return res.status(404).json({ error: 'Zdieľanie nenájdené' });
      if (!req.files || !req.files.length) return res.status(400).json({ error: 'Žiadne súbory' });
      req.files.forEach(f => share.files.push({
        storedName: f.filename,
        originalName: fixName(f.originalname),
        size: f.size,
        mime: f.mimetype || ''
      }));
      await share.save();
      res.json(share);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

// ── Zmazanie súboru ──
router.delete('/:id/files/:fileId', async (req, res) => {
  try {
    const share = await FileShare.findById(req.params.id);
    if (!share) return res.status(404).json({ error: 'Zdieľanie nenájdené' });
    const f = share.files.id(req.params.fileId);
    if (!f) return res.status(404).json({ error: 'Súbor nenájdený' });
    try { fs.unlinkSync(path.join(shareDirOf(share), f.storedName)); } catch {}
    f.deleteOne();
    await share.save();
    res.json(share);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Zmazanie celého zdieľania vrátane súborov ──
router.delete('/:id', async (req, res) => {
  try {
    const share = await FileShare.findByIdAndDelete(req.params.id);
    if (share) { try { fs.rmSync(shareDirOf(share), { recursive: true, force: true }); } catch {} }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
