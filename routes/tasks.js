const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try { res.json(await Task.find({ user: req.user.id }).sort({ done: 1, due: 1, createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try {
    const t = await Task.create({
      user: req.user.id, title: req.body.title, description: req.body.description || '',
      due: req.body.due || null, priority: req.body.priority || 'normal'
    });
    res.status(201).json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const t = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    ['title', 'description', 'due', 'priority'].forEach(k => { if (req.body[k] !== undefined) t[k] = req.body[k]; });
    if (req.body.done !== undefined) { t.done = !!req.body.done; t.doneAt = t.done ? new Date() : null; }
    await t.save();
    res.json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
