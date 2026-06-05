const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Equipment = require('../models/Equipment');

// Zoznam rezervácií — voliteľne v rozsahu ?from=&to= (prekrývajúce sa)
router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.from || req.query.to) {
      const from = req.query.from ? new Date(req.query.from) : new Date('1970-01-01');
      const to   = req.query.to ? new Date(req.query.to) : new Date('2999-01-01');
      // rezervácia sa prekrýva s oknom, ak start < to && end > from
      q.start = { $lt: to };
      q.end   = { $gt: from };
    }
    res.json(await Booking.find(q).populate('equipment', 'name code type color').sort({ start: 1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Súhrn vyťaženia za obdobie ?from=&to=
router.get('/utilization', async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 864e5);
    const to   = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 7 * 864e5);
    const windowMs = Math.max(1, to - from);
    const eqs = await Equipment.find({ active: true }).sort({ order: 1 }).lean();
    const bookings = await Booking.find({ start: { $lt: to }, end: { $gt: from }, status: { $ne: 'cancelled' } }).lean();
    const result = eqs.map(eq => {
      const bs = bookings.filter(b => String(b.equipment) === String(eq._id));
      let usedMs = 0;
      bs.forEach(b => {
        const s = Math.max(new Date(b.start).getTime(), from.getTime());
        const e = Math.min(new Date(b.end).getTime(), to.getTime());
        if (e > s) usedMs += (e - s);
      });
      return {
        _id: eq._id, name: eq.name, code: eq.code, type: eq.type, color: eq.color,
        usedHours: Math.round(usedMs / 36e5 * 10) / 10,
        count: bs.length,
        utilization: Math.round(usedMs / windowMs * 100)
      };
    });
    res.json({ from, to, windowHours: Math.round(windowMs / 36e5), equipment: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body.start || !req.body.end || new Date(req.body.end) <= new Date(req.body.start))
      return res.status(400).json({ error: 'Neplatný časový rozsah (koniec musí byť po začiatku).' });
    res.status(201).json(await Booking.create({ ...req.body, createdBy: req.user?.name || req.user?.username || '' }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    if (req.body.start && req.body.end && new Date(req.body.end) <= new Date(req.body.start))
      return res.status(400).json({ error: 'Neplatný časový rozsah.' });
    const b = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('equipment', 'name code type color');
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Booking.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
