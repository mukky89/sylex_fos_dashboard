const express = require('express');
const router = express.Router();
const WorkCenter = require('../models/WorkCenter');
const ShiftReport = require('../models/ShiftReport');
const Routing = require('../models/Routing');

const WC_STATUS = ['running', 'setup', 'idle', 'maintenance', 'down'];
const DT_REASONS = ['none', 'breakdown', 'setup', 'material', 'quality', 'noOperator', 'changeover', 'other'];

const num = v => { const n = Number(v); return isNaN(n) ? 0 : n; };
const clampPct = v => Math.max(0, Math.min(100, Math.round(v)));

// ── OEE pre jeden zmenový výkaz: Dostupnosť × Výkon × Kvalita ──
function computeOee(r) {
  const planned = num(r.plannedMinutes);
  const downtime = Math.min(num(r.downtimeMinutes), planned);
  const runtime = Math.max(0, planned - downtime);
  const good = num(r.goodQty), scrap = num(r.scrapQty);
  const total = good + scrap;

  const availability = planned > 0 ? runtime / planned : 0;

  let performance;
  if (num(r.idealRate) > 0 && runtime > 0) performance = total / (r.idealRate * runtime / 60);
  else if (num(r.targetQty) > 0)           performance = total / r.targetQty;
  else                                     performance = total > 0 ? 1 : 0;
  performance = Math.max(0, Math.min(1, performance));

  const quality = total > 0 ? good / total : 0;
  const oee = availability * performance * quality;

  return {
    runtime, total,
    availability: clampPct(availability * 100),
    performance:  clampPct(performance * 100),
    quality:      clampPct(quality * 100),
    oee:          clampPct(oee * 100)
  };
}
function withOee(doc) { const o = doc.toObject ? doc.toObject() : doc; return { ...o, kpi: computeOee(o) }; }

// ════════════════════════ PRACOVISKÁ ════════════════════════
router.get('/workcenters', async (req, res) => {
  try { res.json(await WorkCenter.find().sort({ order: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/workcenters', async (req, res) => {
  try {
    const last = await WorkCenter.findOne().sort({ order: -1 }).select('order').lean();
    const data = { ...req.body, order: (last?.order || 0) + 1, statusSince: new Date() };
    res.status(201).json(await WorkCenter.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/workcenters/:id', async (req, res) => {
  try {
    const wc = await WorkCenter.findById(req.params.id);
    if (!wc) return res.status(404).json({ error: 'Not found' });
    ['name', 'code', 'kind', 'currentOrder', 'operator', 'location', 'note'].forEach(k => { if (req.body[k] !== undefined) wc[k] = req.body[k]; });
    ['ratedCapacity', 'shiftTarget', 'order'].forEach(k => { if (req.body[k] !== undefined) wc[k] = num(req.body[k]); });
    if (req.body.active !== undefined) wc.active = !!req.body.active;
    if (req.body.status !== undefined && WC_STATUS.includes(req.body.status) && req.body.status !== wc.status) {
      wc.status = req.body.status; wc.statusSince = new Date();
    }
    await wc.save();
    res.json(wc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Rýchla zmena stavu pracoviska (klik na dielenskej tabuli)
router.patch('/workcenters/:id/status', async (req, res) => {
  try {
    if (!WC_STATUS.includes(req.body.status)) return res.status(400).json({ error: 'Neplatný stav' });
    const wc = await WorkCenter.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, statusSince: new Date(), ...(req.body.currentOrder !== undefined ? { currentOrder: req.body.currentOrder } : {}) },
      { new: true }
    );
    if (!wc) return res.status(404).json({ error: 'Not found' });
    res.json(wc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/workcenters/:id', async (req, res) => {
  try { await WorkCenter.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════ ZMENOVÉ VÝKAZY ════════════════════════
router.get('/reports', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(180, num(req.query.days) || 14));
    const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0);
    const docs = await ShiftReport.find({ date: { $gte: from } }).sort({ date: -1, createdAt: -1 });
    res.json(docs.map(withOee));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/reports', async (req, res) => {
  try { res.status(201).json(withOee(await ShiftReport.create({ ...req.body }))); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/reports/:id', async (req, res) => {
  try {
    const r = await ShiftReport.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    ['shift', 'workCenter', 'product', 'orderNumber', 'downtimeReason', 'operator', 'note'].forEach(k => { if (req.body[k] !== undefined) r[k] = req.body[k]; });
    ['plannedMinutes', 'downtimeMinutes', 'idealRate', 'goodQty', 'scrapQty', 'targetQty'].forEach(k => { if (req.body[k] !== undefined) r[k] = num(req.body[k]); });
    if (req.body.date !== undefined) r.date = req.body.date || new Date();
    await r.save();
    res.json(withOee(r));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/reports/:id', async (req, res) => {
  try { await ShiftReport.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════ NORMOVANÉ OPERÁCIE / TECHNOLOGICKÉ POSTUPY ════════════════════════
function normalizeOps(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(o => ({
    group: String(o.group || '').trim(),
    code: String(o.code || '').trim(),
    desc: String(o.desc || '').trim(),
    tPiece: num(o.tPiece),
    qty: num(o.qty) || 1,
    line: String(o.line || '').trim(),
    machine: !!o.machine,
    opNote: String(o.opNote || '').trim()
  })).filter(o => o.desc || o.code);
}
// t/výrobok pre operáciu = t/ks × ks × (strojový čas ? 1 : coeff)
function opTime(op, coeff) { return num(op.tPiece) * (num(op.qty) || 1) * (op.machine ? 1 : (coeff || 1)); }
function routingTotals(r) {
  const coeff = num(r.coeff) || 1.1;
  let total = 0; const byLine = {};
  (r.operations || []).forEach(op => {
    const t = opTime(op, coeff);
    total += t;
    const k = op.line || '— nepriradené —';
    byLine[k] = (byLine[k] || 0) + t;
  });
  return {
    items: (r.operations || []).length,
    totalMin: Math.round(total * 1000) / 1000,
    byLine: Object.entries(byLine).map(([line, min]) => ({ line, min: Math.round(min * 1000) / 1000 })).sort((a, b) => b.min - a.min)
  };
}
function withTotals(doc) { const o = doc.toObject ? doc.toObject() : doc; return { ...o, totals: routingTotals(o) }; }

router.get('/routings', async (req, res) => {
  try {
    const docs = await Routing.find().sort({ product: 1, createdAt: 1 });
    res.json(docs.map(withTotals));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/routings', async (req, res) => {
  try {
    const data = {
      product: req.body.product, code: req.body.code || '',
      coeff: num(req.body.coeff) || 1.1,
      operations: normalizeOps(req.body.operations),
      note: req.body.note || ''
    };
    res.status(201).json(withTotals(await Routing.create(data)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/routings/:id', async (req, res) => {
  try {
    const r = await Routing.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    ['product', 'code', 'note'].forEach(k => { if (req.body[k] !== undefined) r[k] = req.body[k]; });
    if (req.body.coeff !== undefined) r.coeff = num(req.body.coeff) || 1.1;
    if (req.body.active !== undefined) r.active = !!req.body.active;
    if (req.body.operations !== undefined) r.operations = normalizeOps(req.body.operations);
    await r.save();
    res.json(withTotals(r));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/routings/:id', async (req, res) => {
  try { await Routing.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════ SÚHRN / KPI ════════════════════════
router.get('/summary', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(180, num(req.query.days) || 7));
    const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const centers = await WorkCenter.find().lean();
    const reports = await ShiftReport.find({ date: { $gte: from } }).lean();

    // Živý stav pracovísk
    const byStatus = {}; WC_STATUS.forEach(s => byStatus[s] = 0);
    centers.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

    // OEE rollup za obdobie (priemer cez výkazy)
    const k = reports.map(computeOee);
    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const availability = avg(k.map(x => x.availability));
    const performance = avg(k.map(x => x.performance));
    const quality = avg(k.map(x => x.quality));
    const oee = avg(k.map(x => x.oee));

    // Dnešná produkcia
    const today = reports.filter(r => new Date(r.date) >= todayStart);
    const goodToday = today.reduce((s, r) => s + num(r.goodQty), 0);
    const scrapToday = today.reduce((s, r) => s + num(r.scrapQty), 0);
    const totalToday = goodToday + scrapToday;
    const targetToday = today.reduce((s, r) => s + num(r.targetQty), 0);
    const downtimeToday = today.reduce((s, r) => s + num(r.downtimeMinutes), 0);

    // Prestoje podľa dôvodu (za obdobie)
    const dt = {}; DT_REASONS.filter(r => r !== 'none').forEach(r => dt[r] = 0);
    reports.forEach(r => { if (r.downtimeReason && r.downtimeReason !== 'none') dt[r.downtimeReason] = (dt[r.downtimeReason] || 0) + num(r.downtimeMinutes); });
    const downtimeByReason = Object.entries(dt).map(([reason, minutes]) => ({ reason, minutes })).filter(x => x.minutes > 0).sort((a, b) => b.minutes - a.minutes);
    const downtimeTotal = downtimeByReason.reduce((s, x) => s + x.minutes, 0);

    // OEE podľa pracoviska
    const perWc = {};
    reports.forEach((r, i) => {
      const key = r.workCenter || '—';
      perWc[key] = perWc[key] || { name: key, oee: [], good: 0, scrap: 0, downtime: 0 };
      perWc[key].oee.push(k[i].oee);
      perWc[key].good += num(r.goodQty); perWc[key].scrap += num(r.scrapQty); perWc[key].downtime += num(r.downtimeMinutes);
    });
    const centersOee = Object.values(perWc).map(w => ({
      name: w.name, oee: avg(w.oee), good: w.good, scrap: w.scrap, downtime: w.downtime
    })).sort((a, b) => b.oee - a.oee);

    res.json({
      days,
      centersTotal: centers.length,
      running: byStatus.running || 0,
      byStatus,
      oee, availability, performance, quality,
      reportsCount: reports.length,
      goodToday, scrapToday,
      scrapRate: totalToday ? Math.round(scrapToday / totalToday * 100) : 0,
      targetToday, fulfillToday: targetToday ? Math.round(totalToday / targetToday * 100) : 0,
      downtimeToday, downtimeTotal, downtimeByReason,
      centersOee
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
