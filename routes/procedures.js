const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Procedure = require('../models/Procedure');
const { WARNING_TYPES, PPE_TYPES } = require('../config/procedureMeta');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  ImageRun, ExternalHyperlink
} = require('docx');
const { parse } = require('node-html-parser');
const sizeOf = require('image-size');

const WARN_MAP = Object.fromEntries(WARNING_TYPES.map(w => [w.key, w]));
const PPE_MAP  = Object.fromEntries(PPE_TYPES.map(w => [w.key, w]));

// ── META (typy upozornení + ochranných pomôcok) — MUSÍ byť pred /:id ──────────
router.get('/meta', (req, res) => {
  res.json({ warnings: WARNING_TYPES, ppe: PPE_TYPES });
});

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
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ACCENT = '0891B2';
const LINK_COLOR = '0563C1';

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return ''; }
};
const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

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

// Načítaj obrázok z /uploads a vráť ImageRun (alebo null)
function readImageRun(url, maxW = 460) {
  try {
    if (!url || !url.startsWith('/uploads/')) return null;
    const fp = path.join(PUBLIC_DIR, url);
    if (!fs.existsSync(fp)) return null;
    const data = fs.readFileSync(fp);
    let dim = {}; try { dim = sizeOf(data); } catch {}
    let w = dim.width || maxW, h = dim.height || Math.round(maxW * 0.6);
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    let ext = (path.extname(fp).slice(1) || 'png').toLowerCase();
    if (ext === 'jpg') ext = 'jpeg';
    if (!['png', 'jpeg', 'gif', 'bmp'].includes(ext)) ext = 'png';
    return new ImageRun({ data, transformation: { width: w, height: h }, type: ext });
  } catch { return null; }
}
function imageParagraph(url) {
  const run = readImageRun(url);
  return run ? new Paragraph({ spacing: { before: 60, after: 120 }, children: [run] }) : null;
}

// Rekurzívne pozbieraj inline runs (s formátovaním) z HTML uzla
function collectInline(node, fmt, out) {
  (node.childNodes || []).forEach(child => {
    if (child.nodeType === 3) { // text
      const t = child.text;
      if (t && t.replace(/ /g, ' ').length) out.push(new TextRun({ text: t, ...fmt }));
      return;
    }
    if (child.nodeType !== 1) return;
    const tag = (child.tagName || '').toLowerCase();
    if (tag === 'br') { out.push(new TextRun({ text: '', break: 1 })); return; }
    if (tag === 'img') { const r = readImageRun(child.getAttribute('src')); if (r) out.push(r); return; }
    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      const inner = [];
      collectInline(child, { ...fmt, color: LINK_COLOR, underline: {} }, inner);
      if (href) out.push(new ExternalHyperlink({ link: href, children: inner.length ? inner : [new TextRun({ text: child.text, color: LINK_COLOR, underline: {} })] }));
      else out.push(...inner);
      return;
    }
    const nf = { ...fmt };
    if (tag === 'b' || tag === 'strong') nf.bold = true;
    if (tag === 'i' || tag === 'em')     nf.italics = true;
    if (tag === 'u')                     nf.underline = {};
    if (tag === 's' || tag === 'strike' || tag === 'del') nf.strike = true;
    if (tag === 'code')                  nf.font = 'Consolas';
    collectInline(child, nf, out);
  });
}
function inlineRuns(node, fmt = {}) { const out = []; collectInline(node, fmt, out); return out; }

// HTML (Quill output) → pole Paragraph
function htmlToParagraphs(html) {
  if (!stripHtml(html) && !/<img/i.test(html || '')) return [];
  const root = parse(html, { lowerCaseTagName: true });
  const paras = [];

  const pushBlock = (node) => {
    const tag = (node.tagName || '').toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      node.querySelectorAll('li').forEach((li, idx) => {
        const runs = inlineRuns(li);
        if (ordered) {
          paras.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 40 },
            children: [new TextRun({ text: `${idx + 1}. `, bold: true }), ...runs] }));
        } else {
          paras.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 },
            children: runs.length ? runs : [new TextRun('')] }));
        }
      });
      return;
    }
    if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
      const sizeMap = { h1: 30, h2: 27, h3: 24, h4: 22 };
      paras.push(new Paragraph({ spacing: { before: 120, after: 60 },
        children: inlineRuns(node, { bold: true, size: sizeMap[tag] }) }));
      return;
    }
    if (tag === 'blockquote') {
      paras.push(new Paragraph({ indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 14, color: 'CBD5E1', space: 10 } },
        children: inlineRuns(node, { italics: true, color: '475569' }) }));
      return;
    }
    if (tag === 'pre') {
      paras.push(new Paragraph({ shading: { fill: 'F1F5F9' },
        children: [new TextRun({ text: node.text, font: 'Consolas', size: 20 })] }));
      return;
    }
    const runs = inlineRuns(node);
    paras.push(new Paragraph({ spacing: { after: 60 }, children: runs.length ? runs : [new TextRun('')] }));
  };

  (root.childNodes || []).forEach(node => {
    if (node.nodeType === 3) { const t = node.text; if (t && t.trim()) paras.push(new Paragraph({ children: [new TextRun(t)] })); return; }
    if (node.nodeType === 1) pushBlock(node);
  });
  return paras;
}

function buildDoc(p) {
  const children = [];

  // Title block
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: 'PRACOVNÝ POSTUP', bold: true, size: 28, color: ACCENT, characterSpacing: 30 })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: p.title || '', bold: true, size: 36 })]
  }));

  // Metadata
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
    p.purpose.split('\n').forEach(line => children.push(new Paragraph({ children: [new TextRun(line)] })));
  }

  // Pomôcky / nástroje
  const tools = (p.tools || []).filter(t => (t.name || '').trim());
  if (tools.length) {
    children.push(sectionHeading('Potrebné pomôcky / nástroje'));
    const headCell = (text) => new TableCell({ shading: { fill: 'EEF2F6' },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] });
    const cell = (text) => new TableCell({ margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph(text || '')] });
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [headCell('Pomôcka / nástroj'), headCell('Poznámka')] }),
        ...tools.map(t => new TableRow({ children: [cell(t.name), cell(t.note)] }))
      ]
    }));
  }

  // Postup — kroky (rich text + obrázok + upozornenia + ochranné pomôcky)
  const steps = (p.steps || []).filter(s =>
    stripHtml(s.text) || /<img/i.test(s.text || '') || s.image || (s.note || '').trim() ||
    (s.warnings && s.warnings.length) || (s.ppe && s.ppe.length));
  if (steps.length) {
    children.push(sectionHeading('Postup'));
    steps.forEach((s, i) => {
      children.push(new Paragraph({ spacing: { before: 160, after: 40 },
        children: [new TextRun({ text: `Krok ${i + 1}`, bold: true, color: ACCENT, size: 24 })] }));

      const rich = htmlToParagraphs(s.text);
      if (rich.length) children.push(...rich);

      if ((s.note || '').trim()) children.push(new Paragraph({ spacing: { after: 40 },
        children: [new TextRun({ text: s.note, italics: true, color: '64748B' })] }));

      const imgP = imageParagraph(s.image); if (imgP) children.push(imgP);

      if (s.warnings && s.warnings.length) {
        const labels = s.warnings.map(k => WARN_MAP[k] ? `${WARN_MAP[k].icon} ${WARN_MAP[k].label}` : k).join('    ');
        children.push(new Paragraph({ shading: { fill: 'FDECEA' }, spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: 'Upozornenia:  ', bold: true, color: 'C0392B' }), new TextRun({ text: labels })] }));
      }
      if (s.ppe && s.ppe.length) {
        const labels = s.ppe.map(k => PPE_MAP[k] ? `${PPE_MAP[k].icon} ${PPE_MAP[k].label}` : k).join('    ');
        children.push(new Paragraph({ shading: { fill: 'E8F5EC' }, spacing: { before: 40, after: 100 },
          children: [new TextRun({ text: 'Ochranné pomôcky:  ', bold: true, color: '1F6F3D' }), new TextRun({ text: labels })] }));
      }
    });
  }

  // Riziká
  const risks = (p.risks || []).filter(r => (r || '').trim());
  if (risks.length) {
    children.push(sectionHeading('Riziká / Upozornenia'));
    risks.forEach(r => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(r)] })));
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

  // Footer
  children.push(new Paragraph({
    spacing: { before: 360 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D6DCE4' } },
    children: [new TextRun({ text: `Vygenerované z FOS Dashboard · ${fmtDate(new Date())}`, italics: true, size: 16, color: '94A3B8' })]
  }));

  return new Document({
    creator: 'FOS Dashboard',
    title: p.title || 'Pracovný postup',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
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
