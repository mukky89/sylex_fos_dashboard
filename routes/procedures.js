const express = require('express');
const router = express.Router();
const Procedure = require('../models/Procedure');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle
} = require('docx');

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const procedures = await Procedure.find().sort({ updatedAt: -1 });
    res.json(procedures);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const procedure = await Procedure.findById(req.params.id);
    if (!procedure) return res.status(404).json({ error: 'Not found' });
    res.json(procedure);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const procedure = new Procedure(req.body);
    await procedure.save();
    res.status(201).json(procedure);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const procedure = await Procedure.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!procedure) return res.status(404).json({ error: 'Not found' });
    res.json(procedure);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const procedure = await Procedure.findByIdAndDelete(req.params.id);
    if (!procedure) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── WORD export ─────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return ''; }
};

const ACCENT = '0891B2';
const sectionHeading = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 260, after: 100 },
  children: [new TextRun({ text, bold: true, color: ACCENT })]
});

function metaRow(label, value) {
  const cell = (children, opts = {}) => new TableCell({
    width: { size: opts.w || 50, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children
  });
  return new TableRow({
    children: [
      cell([new Paragraph({ children: [new TextRun({ text: label, bold: true })] })], { w: 28 }),
      cell([new Paragraph(value || '—')], { w: 72 })
    ]
  });
}

function buildDoc(p) {
  const children = [];

  // Title block
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: 'PRACOVNÝ POSTUP', bold: true, size: 28, color: ACCENT, characterSpacing: 30 })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: p.title || '', bold: true, size: 36 })]
  }));

  // Metadata table
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      metaRow('Oddelenie / kategória', p.department),
      metaRow('Autor', p.author),
      metaRow('Dátum', fmtDate(p.date)),
      metaRow('Stav', { active: 'Aktívny', draft: 'Koncept', archived: 'Archivovaný' }[p.status] || p.status)
    ]
  }));

  // Cieľ / účel
  if (p.purpose && p.purpose.trim()) {
    children.push(sectionHeading('Cieľ / Účel'));
    p.purpose.split('\n').forEach(line =>
      children.push(new Paragraph({ children: [new TextRun(line)] }))
    );
  }

  // Pomôcky / nástroje
  const tools = (p.tools || []).filter(t => (t.name || '').trim());
  if (tools.length) {
    children.push(sectionHeading('Potrebné pomôcky / nástroje'));
    const headCell = (text) => new TableCell({
      shading: { fill: 'EEF2F6' },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
    });
    const cell = (text) => new TableCell({
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph(text || '')]
    });
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [headCell('Pomôcka / nástroj'), headCell('Poznámka')] }),
        ...tools.map(t => new TableRow({ children: [cell(t.name), cell(t.note)] }))
      ]
    }));
  }

  // Kroky
  const steps = (p.steps || []).filter(s => (s.text || '').trim());
  if (steps.length) {
    children.push(sectionHeading('Postup'));
    steps.forEach((s, i) => {
      children.push(new Paragraph({
        spacing: { before: 80, after: s.note ? 20 : 80 },
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, color: ACCENT }),
          new TextRun({ text: s.text })
        ]
      }));
      if (s.note && s.note.trim()) {
        children.push(new Paragraph({
          indent: { left: 360 },
          spacing: { after: 80 },
          children: [new TextRun({ text: s.note, italics: true, color: '64748B' })]
        }));
      }
    });
  }

  // Riziká / upozornenia
  const risks = (p.risks || []).filter(r => (r || '').trim());
  if (risks.length) {
    children.push(sectionHeading('Riziká / Upozornenia'));
    risks.forEach(r =>
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(r)] }))
    );
  }

  // Prílohy
  const atts = (p.attachments || []).filter(a => (a.label || a.url || '').trim());
  if (atts.length) {
    children.push(sectionHeading('Prílohy / Odkazy'));
    atts.forEach(a => {
      const parts = [new TextRun({ text: a.label || a.url })];
      if (a.label && a.url) parts.push(new TextRun({ text: `  —  ${a.url}`, color: '64748B' }));
      children.push(new Paragraph({ bullet: { level: 0 }, children: parts }));
    });
  }

  // Footer note
  children.push(new Paragraph({
    spacing: { before: 360 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D6DCE4' } },
    children: [new TextRun({
      text: `Vygenerované z FOS Dashboard · ${fmtDate(new Date())}`,
      italics: true, size: 16, color: '94A3B8'
    })]
  }));

  return new Document({
    creator: 'FOS Dashboard',
    title: p.title || 'Pracovný postup',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } }
    },
    sections: [{ properties: {}, children }]
  });
}

router.get('/:id/docx', async (req, res) => {
  try {
    const p = await Procedure.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });

    const doc = buildDoc(p);
    const buffer = await Packer.toBuffer(doc);

    const safe = (p.title || 'postup').replace(/[^a-zA-Z0-9áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ _-]/g, '').trim().replace(/\s+/g, '_') || 'postup';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Postup_${safe}.docx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.buildDoc = buildDoc; // exported for testing / reuse
