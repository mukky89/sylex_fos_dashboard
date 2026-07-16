const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const GpnRequest = require('../models/GpnRequest');

const STATUSES = GpnRequest.STATUSES;
const PRIORITIES = GpnRequest.PRIORITIES;
const TYPES = GpnRequest.TYPES;
const CHECKLIST_KEYS = GpnRequest.CHECKLIST_KEYS;

// ── Prílohy — ukladanie na disk (public/uploads/gpn), servované staticky ───────
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'gpn');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname).slice(0, 12));
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 }
});
function fixName(n) { try { return Buffer.from(n, 'latin1').toString('utf8'); } catch { return n; } }

// ── Pomocné funkcie ────────────────────────────────────────────────────────────
function actorName(req) { return (req.user && (req.user.name || req.user.username)) || 'systém'; }
function actorId(req)   { return (req.user && req.user.id) || null; }

// Vygeneruje nasledujúce číslo ticketu pre aktuálny rok: GPN-YYYY-NNNN
async function nextNumber() {
  const year = new Date().getFullYear();
  const prefix = `GPN-${year}-`;
  const last = await GpnRequest.findOne({ number: new RegExp('^' + prefix) }).sort({ number: -1 }).lean();
  let seq = 1;
  if (last && last.number) {
    const n = parseInt(last.number.slice(prefix.length), 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return prefix + String(seq).padStart(4, '0');
}

// Prázdny checklist so všetkými položkami (nesplnené).
function freshChecklist() {
  return CHECKLIST_KEYS.map(key => ({ key, done: false, note: '', doneBy: '', doneAt: null }));
}

function normalizeCables(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(c => ({
    cableType: String(c.cableType || '').trim(),
    count:     Number(c.count) || 1,
    length:    String(c.length || '').trim(),
    color:     String(c.color || '').trim(),
    marking:   String(c.marking || '').trim()
  })).filter(c => c.cableType || c.length || c.color || c.marking);
}
function normalizeConnectors(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(c => ({
    connectorA:  String(c.connectorA || '').trim(),
    connectorB:  String(c.connectorB || '').trim(),
    orientation: String(c.orientation || '').trim(),
    pinout:      String(c.pinout || '').trim()
  })).filter(c => c.connectorA || c.connectorB || c.orientation || c.pinout);
}
function normalizeMaterial(m) {
  m = m || {};
  return {
    tubing:     String(m.tubing || '').trim(),
    sleeve:     String(m.sleeve || '').trim(),
    label:      String(m.label || '').trim(),
    heatShrink: String(m.heatShrink || '').trim(),
    other:      String(m.other || '').trim()
  };
}

// Doplní k dokumentu prehľad postupu checklistu.
function withStats(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const list = o.checklist || [];
  const done = list.filter(i => i.done).length;
  o.stats = { checklistTotal: list.length, checklistDone: done, progress: list.length ? Math.round(done / list.length * 100) : 0 };
  return o;
}

// Editovateľné jednoduché polia požiadavky (string) — používa create aj update.
const SIMPLE_FIELDS = ['existingGpn', 'reason', 'description', 'product', 'productVariant',
  'customer', 'project', 'notes', 'special', 'resultGpn'];

function applyBody(doc, body) {
  if (body.type !== undefined && TYPES.includes(body.type)) doc.type = body.type;
  if (body.priority !== undefined && PRIORITIES.includes(body.priority)) doc.priority = body.priority;
  SIMPLE_FIELDS.forEach(f => { if (body[f] !== undefined) doc[f] = String(body[f]).trim(); });
  if (body.deadline !== undefined) doc.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.cables !== undefined) doc.cables = normalizeCables(body.cables);
  if (body.connectors !== undefined) doc.connectors = normalizeConnectors(body.connectors);
  if (body.material !== undefined) doc.material = normalizeMaterial(body.material);
}

// ── Zoznam + filtre + súhrn pre dashboard ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.status && STATUSES.includes(req.query.status)) q.status = req.query.status;
    if (req.query.priority && PRIORITIES.includes(req.query.priority)) q.priority = req.query.priority;
    if (req.query.customer) q.customer = new RegExp(escapeRe(req.query.customer), 'i');
    if (req.query.product) q.product = new RegExp(escapeRe(req.query.product), 'i');
    if (req.query.assignee) q.assignee = req.query.assignee;
    if (req.query.requester) q.requester = req.query.requester;
    if (req.query.from || req.query.to) {
      q.createdAt = {};
      if (req.query.from) q.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) { const d = new Date(req.query.to); d.setHours(23, 59, 59, 999); q.createdAt.$lte = d; }
    }
    if (req.query.q) {
      const re = new RegExp(escapeRe(req.query.q), 'i');
      q.$or = [{ number: re }, { product: re }, { customer: re }, { description: re }, { resultGpn: re }, { requesterName: re }, { assigneeName: re }];
    }
    const docs = await GpnRequest.find(q).sort({ createdAt: -1 }).lean();
    res.json(docs.map(withStats));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ── Detail ────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await GpnRequest.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    res.json(withStats(doc));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Vytvorenie požiadavky ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const doc = new GpnRequest();
    doc.number = await nextNumber();
    applyBody(doc, req.body);
    doc.status = 'new';
    doc.requester = actorId(req);
    doc.requesterName = String(req.body.requesterName || actorName(req)).trim();
    doc.checklist = freshChecklist();
    doc.history = [{ by: actorName(req), byId: actorId(req), action: 'created', note: 'Požiadavka vytvorená', at: new Date() }];
    if (!doc.product && !doc.description && !doc.reason)
      return res.status(400).json({ error: 'Vyplň aspoň produkt, dôvod alebo popis požiadavky.' });
    await doc.save();
    res.status(201).json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Úprava parametrov požiadavky ───────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    applyBody(doc, req.body);
    if (req.body.requesterName !== undefined) doc.requesterName = String(req.body.requesterName).trim();
    doc.history.push({ by: actorName(req), byId: actorId(req), action: 'edited', note: 'Upravené parametre požiadavky', at: new Date() });
    await doc.save();
    res.json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Zmena stavu (workflow) ─────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const status = req.body.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Neplatný stav' });
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    const from = doc.status;
    if (from === status) return res.json(withStats(doc));
    doc.status = status;
    doc.history.push({ by: actorName(req), byId: actorId(req), action: 'status', field: 'status', from, to: status, note: String(req.body.note || '').trim(), at: new Date() });
    await doc.save();
    res.json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Priradenie technológa ──────────────────────────────────────────────────────
router.patch('/:id/assign', async (req, res) => {
  try {
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    const from = doc.assigneeName || '—';
    doc.assignee = req.body.assignee || null;
    doc.assigneeName = String(req.body.assigneeName || '').trim();
    doc.history.push({ by: actorName(req), byId: actorId(req), action: 'assigned', field: 'assignee', from, to: doc.assigneeName || '—', at: new Date() });
    await doc.save();
    res.json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Prepnutie položky checklistu ───────────────────────────────────────────────
router.patch('/:id/checklist/:key', async (req, res) => {
  try {
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    let item = doc.checklist.find(i => i.key === req.params.key);
    if (!item) { doc.checklist.push({ key: req.params.key, done: false }); item = doc.checklist[doc.checklist.length - 1]; }
    if (req.body.done !== undefined) {
      item.done = !!req.body.done;
      item.doneBy = item.done ? actorName(req) : '';
      item.doneAt = item.done ? new Date() : null;
    }
    if (req.body.note !== undefined) item.note = String(req.body.note).trim();
    doc.history.push({ by: actorName(req), byId: actorId(req), action: 'checklist', field: req.params.key, to: item.done ? 'done' : 'open', at: new Date() });
    await doc.save();
    res.json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Komentáre ──────────────────────────────────────────────────────────────────
router.post('/:id/comments', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Prázdny komentár' });
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    doc.comments.push({ by: actorName(req), byId: actorId(req), text, at: new Date() });
    await doc.save();
    res.status(201).json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Prílohy — upload súborov ───────────────────────────────────────────────────
router.post('/:id/attachments', upload.array('files', 20), async (req, res) => {
  try {
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    const category = String(req.body.category || 'other');
    (req.files || []).forEach(f => {
      doc.attachments.push({
        category,
        name: fixName(f.originalname),
        url: '/uploads/gpn/' + f.filename,
        size: f.size,
        mime: f.mimetype,
        by: actorName(req),
        at: new Date()
      });
    });
    doc.history.push({ by: actorName(req), byId: actorId(req), action: 'attachment', note: `Pridané prílohy: ${(req.files || []).length}`, at: new Date() });
    await doc.save();
    res.status(201).json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Príloha ako externý odkaz (bez uploadu súboru)
router.post('/:id/attachment-link', async (req, res) => {
  try {
    const url = String(req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Chýba odkaz' });
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    doc.attachments.push({ category: String(req.body.category || 'other'), name: String(req.body.name || url).trim(), url, by: actorName(req), at: new Date() });
    doc.history.push({ by: actorName(req), byId: actorId(req), action: 'attachment', note: 'Pridaný odkaz na prílohu', at: new Date() });
    await doc.save();
    res.status(201).json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id/attachments/:attId', async (req, res) => {
  try {
    const doc = await GpnRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Nenájdené' });
    const att = doc.attachments.id(req.params.attId);
    if (att) {
      // pokus o zmazanie fyzického súboru (ak je lokálny)
      if (att.url && att.url.startsWith('/uploads/gpn/')) {
        const fp = path.join(UPLOAD_DIR, path.basename(att.url));
        fs.unlink(fp, () => {});
      }
      att.deleteOne();
      doc.history.push({ by: actorName(req), byId: actorId(req), action: 'attachment', note: 'Odstránená príloha', at: new Date() });
      await doc.save();
    }
    res.json(withStats(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Zmazanie ticketu ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try { await GpnRequest.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
