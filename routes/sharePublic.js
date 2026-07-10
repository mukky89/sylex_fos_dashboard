const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const FileShare = require('../models/FileShare');
const { SECRET } = require('../middleware/auth');

const SHARE_DIR = path.join(__dirname, '..', 'sharefiles');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function isExpired(share) { return share.expiresAt && new Date(share.expiresAt) < new Date(); }

function publicFiles(share) {
  return share.files.map(f => ({
    id: f._id, name: f.originalName, size: f.size, mime: f.mime, uploadedAt: f.uploadedAt
  }));
}

// Overenie share-tokenu (JWT so scope 'share', viazaný na konkrétne zdieľanie)
function shareAuth(req, share) {
  const st = req.query.st || req.headers['x-share-token'] || '';
  try {
    const p = jwt.verify(st, SECRET);
    return p.scope === 'share' && p.sid === String(share._id);
  } catch { return false; }
}

// ── Meta info pre úvodnú obrazovku (bez zoznamu súborov!) ──
router.get('/:token/meta', async (req, res) => {
  try {
    const share = await FileShare.findOne({ token: req.params.token });
    if (!share || !share.active || isExpired(share)) return res.status(404).json({ error: 'Zdieľanie neexistuje alebo už nie je dostupné' });
    const totalSize = share.files.reduce((s, f) => s + (f.size || 0), 0);
    res.json({ name: share.name, fileCount: share.files.length, totalSize, createdAt: share.createdAt, expiresAt: share.expiresAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Odomknutie heslom → share-token + zoznam súborov ──
router.post('/:token/unlock', async (req, res) => {
  try {
    await sleep(600); // brzda proti hádaniu hesla
    const share = await FileShare.findOne({ token: req.params.token });
    if (!share || !share.active || isExpired(share)) return res.status(404).json({ error: 'Zdieľanie neexistuje alebo už nie je dostupné' });
    const pass = String(req.body.password || '').trim().toUpperCase();
    if (!pass || !(await bcrypt.compare(pass, share.passwordHash))) {
      return res.status(401).json({ error: 'Nesprávne heslo' });
    }
    share.views += 1;
    share.lastAccessAt = new Date();
    await share.save();
    const st = jwt.sign({ scope: 'share', sid: String(share._id) }, SECRET, { expiresIn: '12h' });
    res.json({ shareToken: st, name: share.name, files: publicFiles(share) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Zoznam súborov (po odomknutí) ──
router.get('/:token/files', async (req, res) => {
  try {
    const share = await FileShare.findOne({ token: req.params.token });
    if (!share || !share.active || isExpired(share)) return res.status(404).json({ error: 'Zdieľanie nie je dostupné' });
    if (!shareAuth(req, share)) return res.status(401).json({ error: 'Neplatný alebo expirovaný prístup' });
    res.json({ name: share.name, files: publicFiles(share) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Stiahnutie súboru (share-token v query — funguje ako priamy download link) ──
router.get('/:token/download/:fileId', async (req, res) => {
  try {
    const share = await FileShare.findOne({ token: req.params.token });
    if (!share || !share.active || isExpired(share)) return res.status(404).json({ error: 'Zdieľanie nie je dostupné' });
    if (!shareAuth(req, share)) return res.status(401).json({ error: 'Neplatný alebo expirovaný prístup' });
    const f = share.files.id(req.params.fileId);
    if (!f) return res.status(404).json({ error: 'Súbor nenájdený' });
    const fp = path.join(SHARE_DIR, String(share._id), f.storedName);
    if (!fs.existsSync(fp)) return res.status(410).json({ error: 'Súbor už nie je na serveri' });
    f.downloads += 1;
    share.downloads += 1;
    share.lastAccessAt = new Date();
    share.save().catch(() => {});
    res.download(fp, f.originalName);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
