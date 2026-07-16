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

  // ── Import návodov z firemných dokumentov ─────────────────────────────────────
  router.post('/seed-guides', async (req, res) => {
    try {
      const { seedGuides } = require('../scripts/seedGuides');
      const result = await seedGuides();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Ukážkové rezervácie (Vyťaženie technológií) ───────────────────────────────
  router.post('/seed-bookings', async (req, res) => {
    try {
      const { seedBookings } = require('../scripts/seedBookings');
      const result = await seedBookings();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Ukážkové výrobné zákazky (Plánovanie výroby) ──────────────────────────────
  router.post('/seed-production', async (req, res) => {
    try {
      const { seedProduction } = require('../scripts/seedProduction');
      const result = await seedProduction();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/seed-manufacturing', async (req, res) => {
    try {
      const { seedManufacturing } = require('../scripts/seedManufacturing');
      const result = await seedManufacturing();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/seed-sales', async (req, res) => {
    try {
      const { seedSales } = require('../scripts/seedSales');
      const result = await seedSales();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/seed-routings', async (req, res) => {
    try {
      const { seedRoutings } = require('../scripts/seedRoutings');
      const result = await seedRoutings();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/seed-workflows', async (req, res) => {
    try {
      const { seedProductWorkflows } = require('../scripts/seedProductWorkflows');
      const result = await seedProductWorkflows();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/seed-gpn', async (req, res) => {
    try {
      const { seedGpn } = require('../scripts/seedGpn');
      const result = await seedGpn();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Import Vlastníkov produktov z Excelu (force=true zmaže a nahrá nanovo)
  router.post('/seed-product-owners', async (req, res) => {
    try {
      const { seedProductOwners } = require('../scripts/seedProductOwners');
      const result = await seedProductOwners({ force: !!(req.body && req.body.force) });
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/seed-backbones', async (req, res) => {
    try {
      const { seedBackbones } = require('../scripts/seedBackbones');
      const result = await seedBackbones();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Ukážkové projekty (Vývoj výrobkov) — každý s predajným aj vývojovým procesom ──
  router.post('/seed-projects', async (req, res) => {
    try {
      const { seedProjects } = require('../scripts/seedProjects');
      const result = await seedProjects();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Import výrobných zákaziek z prílohy IO (zmaže všetky a nahradí) ──
  router.post('/import-production', async (req, res) => {
    try {
      const { importProduction } = require('../scripts/importProduction');
      const result = await importProduction();
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Diagnostika e-mailu (Brevo/SMTP) ─────────────────────────────────────────
  const mailer = require('../utils/mailer');
  const mask = v => v ? (String(v).length > 8 ? String(v).slice(0, 4) + '…' + String(v).slice(-2) : '••••') : '';
  // Stav konfigurácie — hodnoty citlivých kľúčov sú maskované.
  router.get('/mail-status', (req, res) => {
    res.json({
      configured: mailer.isConfigured(),
      method: process.env.BREVO_API_KEY ? 'Brevo HTTP API' : (process.env.SMTP_HOST || process.env.EMAIL_PASSWORD ? 'SMTP' : '—'),
      env: {
        BREVO_API_KEY: process.env.BREVO_API_KEY ? mask(process.env.BREVO_API_KEY) : '',
        EMAIL_SENDER:  process.env.EMAIL_SENDER || '',
        SMTP_HOST:     process.env.SMTP_HOST || '',
        SMTP_PORT:     process.env.SMTP_PORT || '',
        SMTP_USER:     process.env.SMTP_USER || '',
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '••••' : '',
        SMTP_PASS:     process.env.SMTP_PASS ? '••••' : '',
        APP_URL:       process.env.APP_URL || ''
      },
      baseUrl: mailer.baseUrl(req)
    });
  });
  // Test — odošle skutočný e-mail a vráti presný výsledok/chybu z Brevo.
  router.post('/mail-test', async (req, res) => {
    const to = String((req.body && req.body.to) || process.env.EMAIL_SENDER || '').trim();
    if (!to) return res.status(400).json({ ok: false, error: 'Zadaj adresu príjemcu (to).' });
    const r = await mailer.sendMail({
      to,
      subject: 'Test e-mailu — FOS Dashboard',
      html: '<p>Toto je <strong>testovací e-mail</strong> z FOS Dashboard. Ak ho vidíš, odosielanie funguje. ✅</p>',
      text: 'Testovací e-mail z FOS Dashboard. Ak ho vidíš, odosielanie funguje.'
    });
    res.status(r.sent ? 200 : 502).json({ ok: r.sent, error: r.error || null, to, method: process.env.BREVO_API_KEY ? 'Brevo HTTP API' : 'SMTP' });
  });

  // ── Denný súhrn úloh (e-mail) ─────────────────────────────────────────────────
  const { runTaskDigest } = require('../utils/taskDigest');
  router.get('/task-digest/status', async (req, res) => {
    try {
      const flag = await AppConfig.findOne({ key: 'taskDigest.lastSentDate' }).lean();
      res.json({ lastSentDate: flag ? flag.value : null, hour: process.env.TASK_DIGEST_HOUR || '07:00', mailConfigured: mailer.isConfigured() });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // Okamžite spustí súhrn pre všetkých používateľov (testovanie/ručné vyvolanie) — mimo plánu.
  router.post('/task-digest/run-now', async (req, res) => {
    try {
      const result = await runTaskDigest({ appUrl: mailer.baseUrl(req) });
      res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
