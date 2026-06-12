const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const ical = require('node-ical');
const CalendarEvent = require('../models/CalendarEvent');
const IcsFeed = require('../models/IcsFeed');

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

// ════════════════════════ EXTERNÉ ICS FEEDY (Outlook → dashboard) ════════════════════════
router.get('/feeds', async (req, res) => {
  try { res.json(await IcsFeed.find().sort({ createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/feeds', async (req, res) => {
  try {
    let url = String(req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Chýba URL ICS feedu.' });
    if (url.startsWith('webcal://')) url = 'https://' + url.slice('webcal://'.length);
    const feed = await IcsFeed.create({ url, label: (req.body.label || 'Outlook').trim(), color: req.body.color || '#7c3aed' });
    delete _icsCache[feed.url];
    res.status(201).json(feed);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/feeds/:id', async (req, res) => {
  try {
    const f = await IcsFeed.findById(req.params.id); if (!f) return res.status(404).json({ error: 'Not found' });
    ['label', 'color'].forEach(k => { if (req.body[k] !== undefined) f[k] = req.body[k]; });
    if (req.body.active !== undefined) f.active = !!req.body.active;
    await f.save(); res.json(f);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/feeds/:id', async (req, res) => {
  try { await IcsFeed.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Test pripojenia feedu (bez uloženia) — vráti počet udalostí
router.post('/feeds/test', async (req, res) => {
  try {
    let url = String(req.body.url || '').trim();
    if (url.startsWith('webcal://')) url = 'https://' + url.slice('webcal://'.length);
    const data = await ical.async.fromURL(url);
    const count = Object.values(data).filter(e => e && e.type === 'VEVENT').length;
    res.json({ ok: true, count });
  } catch (e) { res.status(400).json({ error: 'Feed sa nepodarilo načítať: ' + e.message }); }
});

// jednoduchá cache (5 min) na externé feedy
const _icsCache = {};
async function fetchIcs(url) {
  const c = _icsCache[url];
  if (c && Date.now() - c.ts < 5 * 60 * 1000) return c.data;
  const data = await ical.async.fromURL(url);
  _icsCache[url] = { ts: Date.now(), data };
  return data;
}
// dátum + čas v pásme Európa/Bratislava (server beží v UTC) → { ymd, hm }
const TZ = 'Europe/Bratislava';
function localParts(d) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).reduce((o, x) => { o[x.type] = x.value; return o; }, {});
  return { ymd: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}

// Externé udalosti zo všetkých aktívnych feedov, normalizované do tvaru kalendára (read-only)
router.get('/external', async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 864e5);
    const to   = req.query.to   ? new Date(req.query.to)   : new Date(Date.now() + 120 * 864e5);
    const feeds = await IcsFeed.find({ active: true }).lean();
    const out = [];
    for (const f of feeds) {
      let data;
      try { data = await fetchIcs(f.url); } catch (e) { continue; }
      for (const k in data) {
        const ev = data[k];
        if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;
        const allDay = ev.datetype === 'date';
        const dur = (ev.end && ev.start) ? (ev.end.getTime() - ev.start.getTime()) : 0;
        // dátumy výskytu (opakované cez RRULE, inak jeden)
        let starts = [];
        if (ev.rrule) {
          try { starts = ev.rrule.between(new Date(from.getTime() - dur), to, true); } catch (e) { starts = []; }
        } else if (ev.end ? (ev.end >= from && ev.start <= to) : (ev.start >= from && ev.start <= to)) {
          starts = [ev.start];
        }
        // vynechaj zrušené výskyty (EXDATE)
        const ex = ev.exdate || {};
        starts.forEach(sd => {
          const exKey = new Date(sd).toISOString().slice(0, 10);
          if (Object.keys(ex).some(d => new Date(ex[d] || d).toISOString().slice(0, 10) === exKey)) return;
          const endD = dur ? new Date(sd.getTime() + dur) : null;
          let dateStr, timeStr, endStr;
          if (allDay) {
            dateStr = new Date(sd).toISOString().slice(0, 10);
            endStr  = endD ? new Date(endD.getTime() - 864e5).toISOString().slice(0, 10) : null;  // ICS all-day DTEND je exkluzívny
            timeStr = '';
          } else {
            const sp = localParts(sd); dateStr = sp.ymd; timeStr = sp.hm;
            endStr  = endD ? localParts(endD).ymd : null;
          }
          out.push({
            external: true, source: f.label || 'Outlook', color: f.color || '#7c3aed', type: 'outlook',
            title: ev.summary || '(bez názvu)',
            date: dateStr,
            endDate: endStr && endStr !== dateStr ? endStr : null,
            allDay,
            time: timeStr,
            note: [ev.location, (ev.description || '').replace(/\s+/g, ' ').trim()].filter(Boolean).join(' · ').slice(0, 300)
          });
        });
      }
    }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
