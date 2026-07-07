const express = require('express');
const router = express.Router();
const ProductionOrder = require('../models/ProductionOrder');

const STAGES = ['plan', 'material', 'production', 'qc', 'done', 'shipped'];
function clampPct(v) { const n = Math.round(Number(v)); return isNaN(n) ? 0 : Math.max(0, Math.min(100, n)); }
function autoProgress(b) {
  // ak nie je zadaný progress a je množstvo, dopočítaj
  if (b.qtyPlanned > 0 && (b.progress === undefined || b.progress === null || b.progress === 0))
    return clampPct(b.qtyDone / b.qtyPlanned * 100);
  return clampPct(b.progress);
}

router.get('/', async (req, res) => {
  try { res.json(await ProductionOrder.find().sort({ order: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Súhrn / KPI — musí byť pred /:id
router.get('/summary', async (req, res) => {
  try {
    const all = await ProductionOrder.find().lean();
    const now = new Date(new Date().toDateString());
    const active = all.filter(o => !['done', 'shipped'].includes(o.stage));
    const inProd = all.filter(o => o.stage === 'production');
    const notShipped = all.filter(o => o.stage !== 'shipped');
    const overdue = notShipped.filter(o => o.due && new Date(o.due) < now);
    const soon = new Date(now.getTime() + 7 * 864e5);
    const dueSoon = notShipped.filter(o => o.due && new Date(o.due) >= now && new Date(o.due) <= soon);
    const qtyPlanned = all.reduce((s, o) => s + (o.qtyPlanned || 0), 0);
    const qtyDone = all.reduce((s, o) => s + (o.qtyDone || 0), 0);
    const byStage = {}; STAGES.forEach(s => byStage[s] = all.filter(o => o.stage === s).length);
    // Kalibračné listy — expedované výrobky, ktoré potrebujú odoslať kalibračné listy
    const shipped = all.filter(o => o.stage === 'shipped');
    const calibNeeded = shipped.filter(o => o.calibrationRequired);
    const calibPending = calibNeeded.filter(o => o.calibrationStatus !== 'sent');
    const calibSent = calibNeeded.filter(o => o.calibrationStatus === 'sent');
    // vyťaženie pracovísk (počet aktívnych + plánované ks)
    const lines = {};
    active.forEach(o => {
      const k = o.workstation || '— nepriradené —';
      lines[k] = lines[k] || { name: k, orders: 0, qty: 0 };
      lines[k].orders++; lines[k].qty += (o.qtyPlanned || 0);
    });
    res.json({
      total: all.length, active: active.length, inProduction: inProd.length,
      overdue: overdue.length, dueSoon: dueSoon.length,
      qtyPlanned, qtyDone, fulfillment: qtyPlanned ? Math.round(qtyDone / qtyPlanned * 100) : 0,
      shipped: shipped.length, calibNeeded: calibNeeded.length,
      calibPending: calibPending.length, calibSent: calibSent.length,
      byStage, lines: Object.values(lines).sort((a, b) => b.orders - a.orders)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function nextNumber() {
  const year = new Date().getFullYear();
  const prefix = `VZ-${year}-`;
  const last = await ProductionOrder.findOne({ number: new RegExp('^' + prefix) }).sort({ number: -1 }).select('number').lean();
  let n = 1;
  if (last && last.number) { const m = last.number.match(/(\d+)$/); if (m) n = parseInt(m[1]) + 1; }
  return prefix + String(n).padStart(3, '0');
}

router.post('/', async (req, res) => {
  try {
    const last = await ProductionOrder.findOne().sort({ order: -1 }).select('order').lean();
    const data = { ...req.body };
    if (!data.number) data.number = await nextNumber();
    data.progress = autoProgress(data);
    data.order = (last?.order || 0) + 1;
    res.status(201).json(await ProductionOrder.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Hromadné preusporiadanie / presun fázy (drag & drop) — pred /:id
router.put('/reorder', async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    await Promise.all(items.map(it => {
      const upd = { order: Number(it.order) || 0 };
      if (STAGES.includes(it.stage)) upd.stage = it.stage;
      return ProductionOrder.updateOne({ _id: it.id }, { $set: upd });
    }));
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const o = await ProductionOrder.findById(req.params.id);
    if (!o) return res.status(404).json({ error: 'Not found' });
    ['number', 'product', 'customer', 'salesOrder', 'unit', 'workstation', 'assignee', 'priority', 'stage', 'note',
     'division', 'drawing', 'sensor', 'orderStatus', 'delayReason',
     'calibrationStatus', 'calibrationOwner', 'calibrationNote'].forEach(k => { if (req.body[k] !== undefined) o[k] = req.body[k]; });
    if (req.body.calibrationRequired !== undefined) o.calibrationRequired = !!req.body.calibrationRequired;
    ['qtyPlanned', 'qtyDone', 'normHours'].forEach(k => { if (req.body[k] !== undefined) o[k] = Number(req.body[k]) || 0; });
    ['start', 'due', 'produceBy', 'requiredDate', 'agreedDate', 'deliveryDate', 'producedDate', 'shippedDate', 'calibrationSentDate'].forEach(k => { if (req.body[k] !== undefined) o[k] = req.body[k] || null; });
    if (req.body.order !== undefined) o.order = Number(req.body.order) || 0;
    if (req.body.progress !== undefined) o.progress = clampPct(req.body.progress);
    else if (req.body.qtyDone !== undefined && o.qtyPlanned > 0) o.progress = clampPct(o.qtyDone / o.qtyPlanned * 100);
    await o.save();
    res.json(o);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await ProductionOrder.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
