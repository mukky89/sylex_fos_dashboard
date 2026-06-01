const express = require('express');
const router = express.Router();
const ProductOwner = require('../models/ProductOwner');

router.get('/', async (req, res) => {
  try {
    const list = await ProductOwner.find()
      .populate('po', 'name username').populate('bo', 'name username')
      .sort({ product: 1, validFrom: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try {
    const b = { ...req.body, po: req.body.po || null, bo: req.body.bo || null };
    const d = await ProductOwner.create(b);
    res.status(201).json(await d.populate([{ path: 'po', select: 'name username' }, { path: 'bo', select: 'name username' }]));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const b = { ...req.body, po: req.body.po || null, bo: req.body.bo || null };
    const d = await ProductOwner.findByIdAndUpdate(req.params.id, b, { new: true, runValidators: true })
      .populate('po', 'name username').populate('bo', 'name username');
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await ProductOwner.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
