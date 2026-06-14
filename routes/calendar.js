const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const ical = require('node-ical');
const crypto = require('crypto');
const CalendarEvent = require('../models/CalendarEvent');
const IcsFeed = require('../models/IcsFeed');
const AppConfig = require('../models/AppConfig');

// ── Expanzia opakovaných udalostí v okne [start,end] ──
function _recurStep(d, freq, n) {
  const x = new Date(d);
  if (freq === 'daily') x.setDate(x.getDate() + n);
  else if (freq === 'weekly') x.setDate(x.getDate() + 7 * n);
  else if (freq === 'monthly') x.setMonth(x.getMonth() + n);
  else if (freq === 'yearly') x.setFullYear(x.getFullYear() + n);
  return x;
}
function expandRecur(ev, start, end) {
  const out = [];
  const base = new Date(ev.date);
  const durMs = ev.endDate ? (new Date(ev.endDate) - base) : 0;
  const until = ev.recurUntil ? new Date(ev.recurUntil) : end;
  const dayMs = 864e5;
  let i = 0;
  if (base < start) {
    if (ev.recurFreq === 'daily') i = Math.floor((start - base) / dayMs) - 1;
    else if (ev.recurFreq === 'weekly') i = Math.floor((start - base) / (7 * dayMs)) - 1;
    else if (ev.recurFreq === 'monthly') i = (start.getFullYear() - base.getFullYear()) * 12 + (start.getMonth() - base.getMonth()) - 1;
    else if (ev.recurFreq === 'yearly') i = (start.getFullYear() - base.getFullYear()) - 1;
    i = Math.max(0, i);
  }
  let guard = 0;
  while (guard++ < 800) {
    const occ = _recurStep(base, ev.recurFreq, i);
    if (occ > end || occ > until) break;
    const occEnd = durMs ? new Date(occ.getTime() + durMs) : null;
    if ((occEnd || occ) >= start && occ <= end) {
      const o = ev.toObject ? ev.toObject() : { ...ev };
      o.date = occ; o.endDate = occEnd; o.recurring = true;
      out.push(o);
    }
    i++;
  }
  return out;
}

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
    const start = from ? new Date(from) : new Date('1970-01-01');
    const end   = to   ? new Date(to)   : new Date('2999-12-31');
    // Neopakované — podľa rozsahu; opakované — expandované do okna
    const nonRecur = await CalendarEvent.find({ ...filter, recurFreq: { $in: ['none', null] } }).sort({ date: 1, time: 1 });
    const recur = await CalendarEvent.find({ recurFreq: { $in: ['daily', 'weekly', 'monthly', 'yearly'] }, $or: [{ recurUntil: null }, { recurUntil: { $gte: start } }] });
    const expanded = [];
    recur.forEach(ev => expanded.push(...expandRecur(ev, start, end)));
    res.json([...nonRecur.map(e => e.toObject()), ...expanded]);
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
          let dateStr, timeStr, endStr, endTimeStr = '';
          if (allDay) {
            dateStr = new Date(sd).toISOString().slice(0, 10);
            endStr  = endD ? new Date(endD.getTime() - 864e5).toISOString().slice(0, 10) : null;  // ICS all-day DTEND je exkluzívny
            timeStr = '';
          } else {
            const sp = localParts(sd); dateStr = sp.ymd; timeStr = sp.hm;
            if (endD) { const ep = localParts(endD); endStr = ep.ymd; endTimeStr = ep.hm; } else endStr = null;
          }
          out.push({
            external: true, source: f.label || 'Outlook', color: f.color || '#7c3aed', type: 'outlook',
            title: ev.summary || '(bez názvu)',
            date: dateStr,
            endDate: endStr && endStr !== dateStr ? endStr : null,
            allDay,
            time: timeStr,
            endTime: endTimeStr,
            note: [ev.location, (ev.description || '').replace(/\s+/g, ' ').trim()].filter(Boolean).join(' · ').slice(0, 300)
          });
        });
      }
    }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════ iCal EXPORT (dashboard → Outlook) ════════════════════════
async function getFeedToken(create) {
  let cfg = await AppConfig.findOne({ key: 'calendar.feedToken' });
  if (!cfg && create) cfg = await AppConfig.create({ key: 'calendar.feedToken', value: crypto.randomBytes(16).toString('hex'), group: 'calendar', label: 'ICS feed token' });
  return cfg ? cfg.value : null;
}
function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsDate(d) { const p = n => String(n).padStart(2, '0'); const x = new Date(d); return `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}`; }
function icsDateTime(d, hm) { const [h, mi] = (hm || '00:00').split(':'); const x = new Date(d); return `${icsDate(x)}T${String(h).padStart(2, '0')}${String(mi || '00').padStart(2, '0')}00`; }

// URL feedu pre používateľa (autentizované cez globálnu bránu)
router.get('/feed-url', async (req, res) => {
  try { res.json({ token: await getFeedToken(true) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Verejný .ics feed (token v query) — registrované ako výnimka z auth brány
router.get('/feed.ics', async (req, res) => {
  try {
    const tok = await getFeedToken(false);
    if (!tok || req.query.token !== tok) return res.status(403).send('Neplatný token');
    const events = await CalendarEvent.find().lean();
    const FREQ = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sylex//FOS Dashboard//SK', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:FOS Dashboard'];
    const stamp = icsDateTime(new Date(), `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`);
    events.forEach(e => {
      lines.push('BEGIN:VEVENT', `UID:${e._id}@fosdashboard`, `DTSTAMP:${stamp}`);
      if (e.allDay) {
        const endD = e.endDate ? new Date(new Date(e.endDate).getTime() + 864e5) : new Date(new Date(e.date).getTime() + 864e5);
        lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`, `DTEND;VALUE=DATE:${icsDate(endD)}`);
      } else {
        lines.push(`DTSTART:${icsDateTime(e.date, e.time)}`, `DTEND:${icsDateTime(e.endDate || e.date, e.endTime || e.time)}`);
      }
      lines.push(`SUMMARY:${icsEsc(e.title)}${e.person ? ' (' + icsEsc(e.person) + ')' : ''}`);
      if (e.note) lines.push(`DESCRIPTION:${icsEsc(e.note)}`);
      if (e.recurFreq && e.recurFreq !== 'none') lines.push(`RRULE:FREQ=${FREQ[e.recurFreq]}${e.recurUntil ? ';UNTIL=' + icsDate(e.recurUntil) + 'T235959Z' : ''}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="fos-dashboard.ics"');
    res.send(lines.join('\r\n'));
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;
