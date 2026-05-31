const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { simpleParser } = require('mailparser');
const Contact = require('../models/Contact');
const CrmEmail = require('../models/CrmEmail');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, f, cb) => cb(null, uploadsDir),
  filename: (req, f, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(f.originalname || '.eml'))
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ── Kontakty ──────────────────────────────────────────────────────────────────
router.get('/contacts', async (req, res) => {
  try { res.json(await Contact.find().sort({ name: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/contacts', async (req, res) => {
  try { res.status(201).json(await Contact.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/contacts/:id', async (req, res) => {
  try { const d = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/contacts/:id', async (req, res) => {
  try { await Contact.findByIdAndDelete(req.params.id); await CrmEmail.updateMany({ contact: req.params.id }, { contact: null }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Emaily ────────────────────────────────────────────────────────────────────
router.get('/emails', async (req, res) => {
  try {
    const f = {};
    if (req.query.contact === 'none') f.contact = null;
    else if (req.query.contact && req.query.contact !== 'all') f.contact = req.query.contact;
    res.json(await CrmEmail.find(f).sort({ date: -1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/emails', async (req, res) => {
  try { res.status(201).json(await CrmEmail.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/emails/:id', async (req, res) => {
  try { const d = await CrmEmail.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/emails/:id', async (req, res) => {
  try { await CrmEmail.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Upload + parse emailu (.eml cez mailparser; .msg/iné = uloží súbor)
router.post('/emails/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Žiadny súbor' });
    const fileUrl = '/uploads/' + req.file.filename;
    const orig = req.file.originalname || '';
    let parsed = { subject: orig.replace(/\.(eml|msg)$/i, '') || '(bez predmetu)', from: '', to: '', date: null, body: '' };
    if (/\.eml$/i.test(orig)) {
      try {
        const raw = fs.readFileSync(req.file.path);
        const m = await simpleParser(raw);
        parsed = {
          subject: m.subject || parsed.subject,
          from: m.from?.text || '',
          to: m.to?.text || '',
          date: m.date || null,
          body: (m.text || (m.html ? m.html.replace(/<[^>]+>/g, ' ') : '')).slice(0, 20000)
        };
      } catch (e) { /* ostane fallback */ }
    }
    res.json({ ...parsed, fileUrl, filename: orig });
  });
});

module.exports = router;
