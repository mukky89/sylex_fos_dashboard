const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const CalendarEvent = require('../models/CalendarEvent');

const TYPE_LABELS = {
  event: 'Udalosť', meeting: 'Porada / Meeting', dovolenka: 'Dovolenka',
  sluzobka: 'Služobná cesta', homeoffice: 'Home office', pn: 'PN / Lekár'
};
const fmtDateSk = (d) => d ? new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

// Excel export — všetky udalosti (voliteľne ?from=&to=)
router.get('/export.xlsx', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from) filter.date = { ...(filter.date || {}), $gte: new Date(from) };
    if (to)   filter.date = { ...(filter.date || {}), $lte: new Date(to) };
    const events = await CalendarEvent.find(filter).sort({ date: 1, time: 1 }).lean();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'FOS Dashboard';
    const ws = wb.addWorksheet('Kalendár');
    ws.columns = [
      { header: 'Dátum od',  key: 'from',  width: 14 },
      { header: 'Dátum do',  key: 'to',    width: 14 },
      { header: 'Čas',       key: 'time',  width: 10 },
      { header: 'Typ',       key: 'type',  width: 18 },
      { header: 'Názov',     key: 'title', width: 34 },
      { header: 'Osoba',     key: 'person',width: 22 },
      { header: 'Poznámka',  key: 'note',  width: 40 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } };
    ws.getRow(1).alignment = { vertical: 'middle' };

    events.forEach(e => {
      ws.addRow({
        from:   fmtDateSk(e.date),
        to:     e.endDate ? fmtDateSk(e.endDate) : '',
        time:   e.allDay ? 'celodenná' : (e.time || ''),
        type:   TYPE_LABELS[e.type] || e.type || '',
        title:  e.title || '',
        person: e.person || '',
        note:   e.note || ''
      });
    });
    ws.autoFilter = { from: 'A1', to: 'G1' };

    const buffer = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Kalendar_${stamp}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — optionally filter by month range (?from=ISO&to=ISO)
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      // Vyber udalosti, ktoré akokoľvek zasahujú do okna [from, to]
      const start = from ? new Date(from) : new Date('1970-01-01');
      const end   = to   ? new Date(to)   : new Date('2999-12-31');
      filter.$or = [
        { date: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } },
        { date: { $lte: start }, endDate: { $gte: end } }
      ];
    }
    const events = await CalendarEvent.find(filter).sort({ date: 1, time: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const event = new CalendarEvent(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
