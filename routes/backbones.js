const express = require('express');
const router = express.Router();
const Backbone = require('../models/Backbone');

router.get('/', async (req, res) => {
  try { res.json(await Backbone.find().sort({ name: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const bb = await Backbone.findById(req.params.id);
    if (!bb) return res.status(404).json({ error: 'Not found' });
    res.json(bb);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json(await Backbone.create(sanitize(req.body))); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const data = sanitize(req.body);
    const bb = await Backbone.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!bb) return res.status(404).json({ error: 'Not found' });
    res.json(bb);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Backbone.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

function sanitize(b) {
  const out = {};
  if (b.name !== undefined) out.name = String(b.name || 'Backbone').trim() || 'Backbone';
  if (b.note !== undefined) out.note = String(b.note || '');
  if (Array.isArray(b.nodes)) out.nodes = b.nodes.map(n => ({
    nid: String(n.nid), type: String(n.type || 'splitter'),
    label: String(n.label || ''), x: Number(n.x) || 0, y: Number(n.y) || 0
  }));
  if (Array.isArray(b.links)) out.links = b.links.map(l => ({
    lid: String(l.lid), from: String(l.from), to: String(l.to),
    fibers: Number(l.fibers) || 0, length: Number(l.length) || 0, label: String(l.label || ''),
    parts: Array.isArray(l.parts) ? l.parts.map(String) : []
  }));
  return out;
}

module.exports = router;
