const express = require('express');
const router = express.Router();
const Guide = require('../models/Guide');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle
} = require('docx');
const { htmlToParagraphs } = require('./procedures');

const ACCENT = '6366F1';
const fmtDate = (d) => { try { return d ? new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; } catch { return ''; } };

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Zoznam — bez ťažkého obsahu revízií (len počet)
    const guides = await Guide.find().sort({ updatedAt: -1 }).lean();
    guides.forEach(g => { g.revCount = (g.revisions || []).length; delete g.revisions; });
    res.json(guides);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const g = await Guide.findById(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json(g);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    data.rev = 1;
    // Prvá revízia = počiatočný snapshot
    data.revisions = [{
      rev: 1, date: new Date(), author: data.author || '',
      note: req.body.revNote || 'Prvá verzia',
      title: data.title || '', summary: data.summary || '', content: data.content || ''
    }];
    delete data.revNote;
    const g = await Guide.create(data);
    res.status(201).json(g);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Úprava pracovnej verzie (NEvytvára revíziu)
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.revisions; delete data.rev; delete data.revNote;
    const g = await Guide.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json(g);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Vytvorenie novej revízie (milník) — snapshot aktuálneho obsahu
router.post('/:id/revisions', async (req, res) => {
  try {
    const g = await Guide.findById(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    // Najprv ulož prípadné zmeny pracovnej verzie z requestu
    if (typeof req.body.title === 'string')   g.title = req.body.title;
    if (typeof req.body.summary === 'string') g.summary = req.body.summary;
    if (typeof req.body.content === 'string') g.content = req.body.content;
    if (typeof req.body.category === 'string') g.category = req.body.category;
    if (typeof req.body.author === 'string')  g.author = req.body.author;
    if (typeof req.body.status === 'string')  g.status = req.body.status;
    if (Array.isArray(req.body.attachments))  g.attachments = req.body.attachments;

    const nextRev = (g.rev || g.revisions.length || 0) + 1;
    g.rev = nextRev;
    g.revisions.push({
      rev: nextRev, date: new Date(),
      author: req.body.author || g.author || '',
      note: req.body.note || `Revízia ${nextRev}`,
      title: g.title, summary: g.summary, content: g.content
    });
    await g.save();
    res.json(g);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Obnova obsahu z konkrétnej revízie do pracovnej verzie
router.post('/:id/restore/:rev', async (req, res) => {
  try {
    const g = await Guide.findById(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    const rv = (g.revisions || []).find(r => r.rev === Number(req.params.rev));
    if (!rv) return res.status(404).json({ error: 'Revízia nenájdená' });
    g.title = rv.title || g.title;
    g.summary = rv.summary || '';
    g.content = rv.content || '';
    await g.save();
    res.json(g);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const g = await Guide.findByIdAndDelete(req.params.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WORD export ─────────────────────────────────────────────────────────────
function metaRow(k, v) {
  return new TableRow({ children: [
    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'EEF2F6' }, margins: { top: 50, bottom: 50, left: 110, right: 110 }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })] }),
    new TableCell({ margins: { top: 50, bottom: 50, left: 110, right: 110 }, children: [new Paragraph(String(v == null ? '' : v))] })
  ] });
}
function sect(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, children: [new TextRun({ text, bold: true, color: ACCENT })] }); }

function buildGuideDoc(g, opts = {}) {
  // opts.rev = konkrétna revízia (inak aktuálna pracovná verzia)
  const src = opts.revision || g;
  const ch = [];
  ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'NÁVOD', bold: true, size: 24, color: ACCENT, characterSpacing: 40 })] }));
  ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: src.title || g.title || '', bold: true, size: 40 })] }));
  if (src.summary && src.summary.trim()) ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: src.summary, italics: true, color: '64748B', size: 22 })] }));

  ch.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      metaRow('Kategória', g.category),
      metaRow('Autor', g.author),
      metaRow('Dátum', fmtDate(opts.revision ? opts.revision.date : g.date)),
      metaRow('Revízia', 'r' + (opts.revision ? opts.revision.rev : g.rev)),
      metaRow('Stav', { active: 'Aktívny', draft: 'Koncept', archived: 'Archivovaný' }[g.status] || g.status)
    ]
  }));

  const content = src.content || '';
  if (content.trim()) {
    ch.push(sect('Obsah'));
    const para = htmlToParagraphs(content, { figNo: 0, figures: [], toc: [] });
    if (para.length) ch.push(...para);
    else ch.push(new Paragraph(content.replace(/<[^>]+>/g, ' ')));
  }

  const atts = (g.attachments || []).filter(a => (a.label || a.url || '').trim());
  if (atts.length) {
    ch.push(sect('Prílohy / Odkazy'));
    atts.forEach(a => {
      const parts = [new TextRun({ text: a.label || a.url })];
      if (a.label && a.url) parts.push(new TextRun({ text: `  —  ${a.url}`, color: '64748B' }));
      ch.push(new Paragraph({ bullet: { level: 0 }, children: parts }));
    });
  }

  // História revízií
  const revs = (g.revisions || []);
  if (revs.length) {
    ch.push(sect('História revízií'));
    ch.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['Rev.', 'Dátum', 'Autor', 'Popis zmeny'].map(h =>
          new TableCell({ shading: { fill: 'EEF2F6' }, margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })) }),
        ...revs.slice().sort((a, b) => b.rev - a.rev).map(r => new TableRow({ children: [
          new TableCell({ margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: [new Paragraph('r' + r.rev)] }),
          new TableCell({ margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: [new Paragraph(fmtDate(r.date))] }),
          new TableCell({ margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: [new Paragraph(r.author || '')] }),
          new TableCell({ margins: { top: 40, bottom: 40, left: 90, right: 90 }, children: [new Paragraph(r.note || '')] })
        ] }))
      ]
    }));
  }

  ch.push(new Paragraph({ spacing: { before: 360 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D6DCE4' } }, children: [new TextRun({ text: `Vygenerované z FOS Dashboard · ${fmtDate(new Date())}`, italics: true, size: 16, color: '94A3B8' })] }));

  return new Document({
    creator: 'FOS Dashboard',
    title: g.title || 'Návod',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ properties: {}, children: ch }]
  });
}

async function sendDocx(res, g, opts) {
  const doc = buildGuideDoc(g, opts);
  const buffer = await Packer.toBuffer(doc);
  const revStr = opts && opts.revision ? '_r' + opts.revision.rev : '';
  // ASCII fallback bez diakritiky (Content-Disposition musí byť latin1) + plný UTF-8 názov cez RFC 5987
  const ascii = ((g.title || 'navod').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_') || 'navod');
  const utf8 = encodeURIComponent(`Navod_${(g.title || 'navod').replace(/\s+/g, '_')}${revStr}.docx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="Navod_${ascii}${revStr}.docx"; filename*=UTF-8''${utf8}`);
  res.send(buffer);
}

router.get('/:id/docx', async (req, res) => {
  try {
    const g = await Guide.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ error: 'Not found' });
    await sendDocx(res, g);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/revisions/:rev/docx', async (req, res) => {
  try {
    const g = await Guide.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ error: 'Not found' });
    const revision = (g.revisions || []).find(r => r.rev === Number(req.params.rev));
    if (!revision) return res.status(404).json({ error: 'Revízia nenájdená' });
    await sendDocx(res, g, { revision });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.buildGuideDoc = buildGuideDoc;
