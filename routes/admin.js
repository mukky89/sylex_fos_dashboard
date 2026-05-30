const express     = require('express');
const HeaderLink  = require('../models/HeaderLink');
const AppConfig   = require('../models/AppConfig');
const SensorReading = require('../models/SensorReading');
const { DEFAULT_LINKS } = require('../config/defaults');

// Factory — receives in-memory sensorCfg so config changes take effect immediately
module.exports = function(sensorCfg) {
  const router = express.Router();

  // ── Header Links ────────────────────────────────────────────────────────────
  router.get('/links', async (req, res) => {
    try {
      const links = await HeaderLink.find().sort({ order: 1, createdAt: 1 });
      res.json(links);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/links', async (req, res) => {
    try {
      const count = await HeaderLink.countDocuments();
      const link  = await HeaderLink.create({ ...req.body, order: count });
      res.json(link);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Must come BEFORE /links/:id to avoid 'reorder' being treated as an id
  router.put('/links/reorder', async (req, res) => {
    // body: [{ _id, order }, ...]
    try {
      await Promise.all((req.body || []).map(({ _id, order }) =>
        HeaderLink.findByIdAndUpdate(_id, { order })
      ));
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Reset all links to factory defaults — wipes existing, inserts DEFAULT_LINKS
  router.post('/links/reset-defaults', async (req, res) => {
    try {
      await HeaderLink.deleteMany({});
      await HeaderLink.insertMany(DEFAULT_LINKS);
      res.json({ ok: true, count: DEFAULT_LINKS.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.put('/links/:id', async (req, res) => {
    try {
      const link = await HeaderLink.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!link) return res.status(404).json({ error: 'Link nenájdený' });
      res.json(link);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.delete('/links/:id', async (req, res) => {
    try {
      await HeaderLink.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // ── App Config ───────────────────────────────────────────────────────────────
  router.get('/config', async (req, res) => {
    try {
      const cfg = await AppConfig.find().sort({ group: 1, key: 1 });
      res.json(cfg);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.put('/config/:key', async (req, res) => {
    try {
      const cfg = await AppConfig.findOneAndUpdate(
        { key: req.params.key },
        { value: req.body.value },
        { new: true, upsert: true }
      );
      // Sync in-memory sensor config immediately
      if (req.params.key === 'sensor.ip')       sensorCfg.ip       = String(req.body.value);
      if (req.params.key === 'sensor.path')     sensorCfg.path     = String(req.body.value);
      if (req.params.key === 'sensor.interval') sensorCfg.interval = Number(req.body.value);
      res.json(cfg);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Bulk config save (sensor form)
  router.put('/config', async (req, res) => {
    try {
      const entries = req.body; // [{ key, value }]
      await Promise.all(entries.map(({ key, value }) =>
        AppConfig.findOneAndUpdate({ key }, { value }, { new: true, upsert: true })
      ));
      // Sync in-memory
      entries.forEach(({ key, value }) => {
        if (key === 'sensor.ip')       sensorCfg.ip       = String(value);
        if (key === 'sensor.path')     sensorCfg.path     = String(value);
        if (key === 'sensor.interval') sensorCfg.interval = Number(value);
      });
      res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // ── Sensor History ────────────────────────────────────────────────────────────
  router.delete('/sensor/history', async (req, res) => {
    try {
      const result = await SensorReading.deleteMany({});
      res.json({ deleted: result.deletedCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/sensor/stats', async (req, res) => {
    try {
      const total    = await SensorReading.countDocuments();
      const oldest   = await SensorReading.findOne().sort({ timestamp: 1 }).select('timestamp').lean();
      const newest   = await SensorReading.findOne().sort({ timestamp: -1 }).select('timestamp').lean();
      res.json({ total, oldest: oldest?.timestamp, newest: newest?.timestamp });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Ukážkové dáta (Novinky / WIKI / Postupy) ──────────────────────────────────
  router.post('/seed-samples', async (req, res) => {
    try {
      const { seedSamples } = require('../scripts/seedSamples');
      const result = await seedSamples();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
