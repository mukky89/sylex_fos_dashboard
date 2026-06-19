const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Datasheet = require('../models/Datasheet');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun
} = require('docx');
const { htmlToParagraphs } = require('./procedures');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ACCENT = '0891B2';
const sizeOf = require('image-size');
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return ''; } };

// ── CRUD ──
router.get('/', async (req, res) => { try { res.json(await Datasheet.find().sort({ updatedAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/:id', async (req, res) => { try { const d = await Datasheet.findById(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await Datasheet.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
router.put('/:id', async (req, res) => { try { const d = await Datasheet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/:id', async (req, res) => { try { await Datasheet.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// ── WORD export ──
function sect(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, children: [new TextRun({ text, bold: true, color: ACCENT })] }); }
function imageParagraph(url) {
  try {
    if (!url || !url.startsWith('/uploads/')) return null;
    const fp = path.join(PUBLIC_DIR, url); if (!fs.existsSync(fp)) return null;
    const data = fs.readFileSync(fp); let dim = {}; try { dim = sizeOf(data); } catch {}
    let w = dim.width || 460, h = dim.height || 300; const maxW = 460; if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    let ext = (path.extname(fp).slice(1) || 'png').toLowerCase(); if (ext === 'jpg') ext = 'jpeg';
    return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new ImageRun({ data, transformation: { width: w, height: h }, type: ext })] });
  } catch { return null; }
}

function buildDatasheetDoc(p) {
  const ch = [];
  ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'DATASHEET', bold: true, size: 24, color: ACCENT, characterSpacing: 40 })] }));
  ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: p.title || '', bold: true, size: 40 })] }));
  if (p.tagline) ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: p.tagline, italics: true, color: '64748B', size: 22 })] }));

  ch.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ['Part number', p.partNumber], ['Model', p.model], ['Kategória', p.category],
      ['Verzia', p.version], ['Dátum', fmtDate(p.date)], ['Stav', p.status === 'released' ? 'Released' : 'Draft']
    ].filter(r => r[1]).map(([k, v]) => new TableRow({ children: [
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })] }),
      new TableCell({ margins: { top: 40, bottom: 40, left: 100, right: 100 }, children: [new Paragraph(String(v))] })
    ] }))
  }));

  if ((p.description || '').trim()) { ch.push(sect('Popis')); const para = htmlToParagraphs(p.description, { figNo: 0, figures: [], toc: [] }); para.length ? ch.push(...para) : ch.push(new Paragraph(p.description.replace(/<[^>]+>/g, ' '))); }

  const feats = (p.features || []).filter(x => (x || '').trim());
  if (feats.length) { ch.push(sect('Vlastnosti')); feats.forEach(f => ch.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(f)] }))); }

  const specs = (p.specs || []).filter(s => (s.param || '').trim());
  if (specs.length) {
    ch.push(sect('Špecifikácie'));
    const hc = (t) => new TableCell({ shading: { fill: 'EEF2F6' }, margins: { top: 40, bottom: 40, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] });
    const c = (t) => new TableCell({ margins: { top: 40, bottom: 40, left: 100, right: 100 }, children: [new Paragraph(t || '')] });
    ch.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ tableHeader: true, children: [hc('Parameter'), hc('Hodnota'), hc('Jednotka')] }),
      ...specs.map(s => new TableRow({ children: [c(s.param), c(s.value), c(s.unit)] }))
    ] }));
  }

  const apps = (p.applications || []).filter(x => (x || '').trim());
  if (apps.length) { ch.push(sect('Aplikácie')); apps.forEach(a => ch.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(a)] }))); }

  if ((p.dimensions || '').trim()) { ch.push(sect('Rozmery')); p.dimensions.split('\n').forEach(l => ch.push(new Paragraph(l))); }

  const ord = (p.ordering || []).filter(o => (o.code || o.description || '').trim());
  if (ord.length) {
    ch.push(sect('Objednávacie informácie'));
    const hc = (t) => new TableCell({ shading: { fill: 'EEF2F6' }, margins: { top: 40, bottom: 40, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] });
    const c = (t) => new TableCell({ margins: { top: 40, bottom: 40, left: 100, right: 100 }, children: [new Paragraph(t || '')] });
    ch.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ tableHeader: true, children: [hc('Kód'), hc('Popis')] }),
      ...ord.map(o => new TableRow({ children: [c(o.code), c(o.description)] }))
    ] }));
  }

  (p.images || []).forEach(img => { const ip = imageParagraph(img.url); if (ip) { ch.push(ip); if (img.caption) ch.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: img.caption, italics: true, size: 18, color: '64748B' })] })); } });

  if ((p.notes || '').trim()) { ch.push(sect('Poznámky')); p.notes.split('\n').forEach(l => ch.push(new Paragraph(l))); }

  ch.push(new Paragraph({ spacing: { before: 320 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D6DCE4' } }, children: [new TextRun({ text: `SYLEX · ${p.title || ''} · ${fmtDate(new Date())}`, italics: true, size: 16, color: '94A3B8' })] }));

  return new Document({ creator: 'FOS Dashboard', title: p.title || 'Datasheet', styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } }, sections: [{ properties: {}, children: ch }] });
}

router.get('/:id/docx', async (req, res) => {
  try {
    const p = await Datasheet.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });
    const buffer = await Packer.toBuffer(buildDatasheetDoc(p));
    // ASCII fallback bez diakritiky (Content-Disposition musí byť latin1) + plný UTF-8 názov cez RFC 5987
    const ascii = ((p.title || 'datasheet').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_') || 'datasheet');
    const utf8 = encodeURIComponent(`Datasheet_${(p.title || 'datasheet').replace(/\s+/g, '_')}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Datasheet_${ascii}.docx"; filename*=UTF-8''${utf8}`);
    res.send(buffer);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.buildDatasheetDoc = buildDatasheetDoc;
