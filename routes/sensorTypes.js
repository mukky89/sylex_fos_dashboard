const express = require('express');
const router = express.Router();
const SensorType = require('../models/SensorType');
router.get('/', async (req, res) => { try { res.json(await SensorType.find().sort({ name: 1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await SensorType.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
router.put('/:id', async (req, res) => { try { const d = await SensorType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/:id', async (req, res) => { try { await SensorType.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
module.exports = router;
