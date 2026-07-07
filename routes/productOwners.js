const express = require('express');
const router = express.Router();
const ProductOwnerRecord = require('../models/ProductOwnerRecord');

// Editovateľné polia + ich slovenské popisy (pre históriu zmien)
const FIELDS = {
  nr: 'NR', kind: 'Druh', cat1: 'Kategória 1', cat2: 'Kategória 2',
  product: 'Výrobok', description: 'Popis výrobku',
  owner: 'Product Owner', owner2: 'Product Owner 2', backup: 'Backup Owner',
  status: 'Stav', todo: 'TODO', note: 'Poznámka'
};

function cleanBody(b) {
  const out = {};
  Object.keys(FIELDS).forEach(k => {
    if (b[k] === undefined) return;
    out[k] = (k === 'nr') ? (b[k] === '' || b[k] === null ? null : Number(b[k]) || null) : String(b[k] ?? '').trim();
  });
  return out;
}
function userName(req) { return (req.user && (req.user.name || req.user.username)) || 'neznámy'; }

router.get('/', async (req, res) => {
  try { res.json(await ProductOwnerRecord.find().sort({ nr: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = cleanBody(req.body);
    if (!data.product && !data.description) return res.status(400).json({ error: 'Zadaj výrobok alebo popis.' });
    data.history = [{ at: new Date(), user: userName(req), action: 'create', changes: [] }];
    res.status(201).json(await ProductOwnerRecord.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const rec = await ProductOwnerRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const data = cleanBody(req.body);
    // Zisti reálne zmeny → záznam do histórie
    const changes = [];
    Object.keys(data).forEach(k => {
      const before = rec[k] == null ? '' : String(rec[k]);
      const after = data[k] == null ? '' : String(data[k]);
      if (before !== after) { changes.push({ field: k, label: FIELDS[k], from: before, to: after }); rec[k] = data[k]; }
    });
    if (changes.length) rec.history.push({ at: new Date(), user: userName(req), action: 'update', changes });
    await rec.save();
    res.json(rec);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await ProductOwnerRecord.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
