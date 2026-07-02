const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sizeOf = require('image-size');
const Photo = require('../models/Photo');
const PhotoCategory = require('../models/PhotoCategory');

// Úložisko fotiek — samostatný priečinok v uploads
const photosDir = path.join(__dirname, '..', 'public', 'uploads', 'photos');
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = (path.extname(file.originalname) || '').toLowerCase();
    if (!ext || ext.length > 6) ext = '.jpg';
    cb(null, unique + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype))
});

const parseTags = (t) => Array.isArray(t)
  ? t.map(x => String(x).trim()).filter(Boolean)
  : String(t || '').split(',').map(x => x.trim()).filter(Boolean);

// ── Kategórie (typy produktov) ── musí byť pred /:id ──
router.get('/categories', async (req, res) => {
  try { res.json(await PhotoCategory.find().sort({ order: 1, name: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/categories', async (req, res) => {
  try { res.status(201).json(await PhotoCategory.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/categories/:id', async (req, res) => {
  try {
    const c = await PhotoCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/categories/:id', async (req, res) => {
  try {
    await PhotoCategory.findByIdAndDelete(req.params.id);
    await Photo.updateMany({ category: req.params.id }, { $set: { category: null } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Zoznam fotiek (filter: category, tag, q) ──
router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.category) q.category = req.query.category === 'none' ? null : req.query.category;
    if (req.query.tag) q.tags = req.query.tag;
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ title: rx }, { tags: rx }, { author: rx }, { note: rx }, { originalName: rx }];
    }
    res.json(await Photo.find(q).populate('category').sort({ createdAt: -1 }).limit(1000));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Nahratie fotiek (viac naraz) + metadáta; autor z JWT ──
router.post('/upload', (req, res) => {
  upload.array('photos', 30)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Žiadne súbory' });
    try {
      const tags = parseTags(req.body.tags);
      const docs = [];
      for (const f of req.files) {
        let dim = {};
        try { dim = sizeOf(fs.readFileSync(f.path)); } catch {}
        docs.push(await Photo.create({
          title: req.body.title || path.parse(f.originalname).name,
          url: `/uploads/photos/${f.filename}`,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          width: dim.width || 0,
          height: dim.height || 0,
          category: req.body.category || null,
          tags,
          author: (req.user && (req.user.name || req.user.username)) || '',
          networkPath: req.body.networkPath || '',
          note: req.body.note || ''
        }));
      }
      res.status(201).json(docs);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
});

// ── Úprava metadát ──
router.put('/:id', async (req, res) => {
  try {
    const body = {
      title: req.body.title, note: req.body.note, networkPath: req.body.networkPath,
      category: req.body.category || null, tags: parseTags(req.body.tags)
    };
    const p = await Photo.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }).populate('category');
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Odstránenie (vrátane súboru na disku) ──
router.delete('/:id', async (req, res) => {
  try {
    const p = await Photo.findByIdAndDelete(req.params.id);
    if (p && p.url && p.url.startsWith('/uploads/photos/')) {
      const fp = path.join(photosDir, path.basename(p.url));
      fs.unlink(fp, () => {});
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
