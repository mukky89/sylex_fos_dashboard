const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try { res.json(await Question.find().sort({ answered: 1, createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Anonymné — neukladáme req.user
router.post('/', async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Prázdna otázka' });
    res.status(201).json(await Question.create({ text }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const upd = {};
    if (req.body.answer !== undefined) { upd.answer = req.body.answer; upd.answered = !!(req.body.answer || '').trim(); }
    const d = await Question.findByIdAndUpdate(req.params.id, upd, { new: true });
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', requireAdmin, async (req, res) => {
  try { await Question.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
