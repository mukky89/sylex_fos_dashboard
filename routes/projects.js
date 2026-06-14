const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const AppConfig = require('../models/AppConfig');

const CFG_KEY = 'project.config';

router.get('/', async (req, res) => {
  try { res.json(await Project.find().sort({ updatedAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Konfigurácia workflow procesov a štandardných výstupov (editovateľná v admine)
router.get('/config', async (req, res) => {
  try { const c = await AppConfig.findOne({ key: CFG_KEY }); res.json(c ? c.value : null); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/config', async (req, res) => {
  try {
    const c = await AppConfig.findOneAndUpdate(
      { key: CFG_KEY },
      { value: req.body, label: 'Projekty — workflow a výstupy', group: 'projects' },
      { new: true, upsert: true });
    res.json(c.value);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Komentáre / záznamy zmien k procesom (sales/dev/deliv)
router.post('/:id/comments', async (req, res) => {
  try {
    const scope = String(req.body.scope || '');
    const text = String(req.body.text || '').trim();
    if (!['sales', 'dev', 'deliv'].includes(scope) || !text) return res.status(400).json({ error: 'Neplatný komentár' });
    const author = (req.user && (req.user.name || req.user.username)) || '';
    const d = await Project.findByIdAndUpdate(req.params.id,
      { $push: { comments: { scope, text, author, at: new Date() } } },
      { new: true });
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.status(201).json(d.comments);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id/comments/:cid', async (req, res) => {
  try {
    const d = await Project.findByIdAndUpdate(req.params.id,
      { $pull: { comments: { _id: req.params.cid } } }, { new: true });
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d.comments);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try { const d = await Project.findById(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await Project.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try { const d = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { const d = await Project.findByIdAndDelete(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
