const express = require('express');
const router = express.Router();
const Instrument = require('../models/Instrument');

router.get('/', async (req, res) => {
  try { res.json(await Instrument.find().sort({ nextCalibration: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/:id', async (req, res) => {
  try { const d = await Instrument.findById(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await Instrument.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try { const d = await Instrument.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { const d = await Instrument.findByIdAndDelete(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
