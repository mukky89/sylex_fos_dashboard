const express = require('express');
const router = express.Router();
const GithubRepo = require('../models/GithubRepo');

// ── CRUD — GitHub projekty a odkazy ──
router.get('/', async (req, res) => {
  try { res.json(await GithubRepo.find().sort({ order: 1, name: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await GithubRepo.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const r = await GithubRepo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await GithubRepo.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
