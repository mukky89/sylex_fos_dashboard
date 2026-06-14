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
