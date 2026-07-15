const express = require('express');
const router = express.Router();
const NotifDismiss = require('../models/NotifDismiss');

router.get('/dismissed', async (req, res) => {
  try {
    const rows = await NotifDismiss.find({ user: req.user.id }).select('key').lean();
    res.json({ keys: rows.map(r => r.key) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/dismiss', async (req, res) => {
  try {
    const keys = [...new Set((Array.isArray(req.body.keys) ? req.body.keys : []).map(String).filter(Boolean))];
    await Promise.all(keys.map(key => NotifDismiss.updateOne(
      { user: req.user.id, key },
      { $setOnInsert: { user: req.user.id, key } },
      { upsert: true }
    )));
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
