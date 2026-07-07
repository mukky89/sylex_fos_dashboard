const express = require('express');
const router = express.Router();
const ProductWorkflow = require('../models/ProductWorkflow');

const STEP_STATUS = ['pending', 'active', 'done'];

// Očisti a znormalizuj kroky z requestu
function normalizeSteps(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(s => ({
    name:    String(s.name || '').trim(),
    station: String(s.station || '').trim(),
    note:    String(s.note || '').trim(),
    status:  STEP_STATUS.includes(s.status) ? s.status : 'pending'
  })).filter(s => s.name);
}

// Doplní k dokumentu prehľad (počet krokov, hotové, % postupu)
function withStats(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const steps = o.steps || [];
  const done = steps.filter(s => s.status === 'done').length;
  const active = steps.filter(s => s.status === 'active').length;
  return {
    ...o,
    stats: {
      total: steps.length,
      done,
      active,
      progress: steps.length ? Math.round(done / steps.length * 100) : 0
    }
  };
}

router.get('/', async (req, res) => {
  try {
    const docs = await ProductWorkflow.find().sort({ code: 1, createdAt: 1 });
    res.json(docs.map(withStats));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = {
      code:    String(req.body.code || '').trim(),
      product: String(req.body.product || '').trim(),
      note:    String(req.body.note || '').trim(),
      steps:   normalizeSteps(req.body.steps)
    };
    if (!data.code && !data.product) return res.status(400).json({ error: 'Zadaj kód alebo názov produktu.' });
    res.status(201).json(withStats(await ProductWorkflow.create(data)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const w = await ProductWorkflow.findById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    ['code', 'product', 'note'].forEach(k => { if (req.body[k] !== undefined) w[k] = String(req.body[k]).trim(); });
    if (req.body.active !== undefined) w.active = !!req.body.active;
    if (req.body.steps !== undefined) w.steps = normalizeSteps(req.body.steps);
    await w.save();
    res.json(withStats(w));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Rýchla zmena stavu jedného kroku (klik na krok v detaile)
router.patch('/:id/steps/:stepId', async (req, res) => {
  try {
    if (!STEP_STATUS.includes(req.body.status)) return res.status(400).json({ error: 'Neplatný stav kroku' });
    const w = await ProductWorkflow.findById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    const step = w.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ error: 'Krok nenájdený' });
    step.status = req.body.status;
    await w.save();
    res.json(withStats(w));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await ProductWorkflow.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
