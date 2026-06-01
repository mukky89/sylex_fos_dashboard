const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Procedure = require('../models/Procedure');
const { WARNING_TYPES, PPE_TYPES } = require('../config/procedureMeta');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  ImageRun, ExternalHyperlink, Bookmark, InternalHyperlink,
  HorizontalPositionAlign, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, TextWrappingType, TextWrappingSide
} = require('docx');

// Konverzia CSS farby na docx hex (RRGGBB)
function cssColorToHex(c) {
  if (!c) return null;
  c = c.trim();
  let m = c.match(/^#([0-9a-fA-F]{6})$/); if (m) return m[1].toUpperCase();
  m = c.match(/^#([0-9a-fA-F]{3})$/); if (m) return m[1].split('').map(x => x + x).join('').toUpperCase();
  m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return [m[1], m[2], m[3]].map(n => Math.max(0, Math.min(255, +n)).toString(16).padStart(2, '0')).join('').toUpperCase();
  return null;
}
function cleanFontName(f) {
  if (!f) return null;
  return f.split(',')[0].replace(/['"]/g, '').trim() || null;
}
function parseInlineStyle(el, fmt) {
  const style = (el.getAttribute && el.getAttribute('style')) || '';
  if (!style) return fmt;
  const nf = { ...fmt };
  const cm = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
  if (cm) { const hex = cssColorToHex(cm[1]); if (hex) nf.color = hex; }
  const fm = style.match(/font-family:\s*([^;]+)/i);
  if (fm) { const fn = cleanFontName(fm[1]); if (fn) nf.font = fn; }
  return nf;
}
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

// ── Obrázky ───────────────────────────────────────────────────────────────────
function readImageData(url, maxW = 460) {
  try {
    if (!url || !url.startsWith('/uploads/')) return null;
    const fp = path.join(PUBLIC_DIR, url);
    if (!fs.existsSync(fp)) return null;
    const data = fs.readFileSync(fp);
    let dim = {}; try { dim = sizeOf(data); } catch (e) {}
    let w = dim.width || maxW, h = dim.height || Math.round(maxW * 0.6);
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    let ext = (path.extname(fp).slice(1) || 'png').toLowerCase();
    if (ext === 'jpg') ext = 'jpeg';
    if (!['png', 'jpeg', 'gif', 'bmp'].includes(ext)) ext = 'png';
    return { data, w, h, type: ext };
  } catch (e) { return null; }
}
function imageRunFrom(url, maxW) {
  const im = readImageData(url, maxW);
  if (!im) return null;
  return new ImageRun({ data: im.data, transformation: { width: im.w, height: im.h }, type: im.type });
}
// Plávajúci (obtekaný) obrázok — text obteká vľavo/vpravo
function floatingImageRun(im, align) {
  const right = align === 'right';
  return new ImageRun({
    data: im.data, transformation: { width: im.w, height: im.h }, type: im.type,
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, align: right ? HorizontalPositionAlign.RIGHT : HorizontalPositionAlign.LEFT },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
      wrap: { type: TextWrappingType.SQUARE, side: right ? TextWrappingSide.LEFT : TextWrappingSide.RIGHT },
      margins: { left: 91440, right: 91440, top: 0, bottom: 91440 },
    },
  });
}
const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT };

// Vráti pole odsekov: obrázok (s číslom/bookmarkom) + popis. Registruje figúru do ctx.
// align left/right → plávajúci obrázok (text obteká); center/below → blok + popis.
function figureParagraphs(url, ctx, { align = 'center', caption = '', maxW = 460, float = true } = {}) {
  const isFloat = float && (align === 'left' || align === 'right');
  const im = readImageData(url, isFloat ? Math.min(maxW, 270) : maxW);
  if (!im) return [];
  const n = ++ctx.figNo;
  const anchor = 'fig_' + n;
  ctx.figures.push({ n, anchor, caption });

  if (isFloat) {
    // Plávajúci obrázok — kotví v jednom odseku, okolitý text obteká
    return [new Paragraph({ spacing: { after: 0 },
      children: [new Bookmark({ id: anchor, children: [floatingImageRun(im, align)] })] })];
  }
  const run = new ImageRun({ data: im.data, transformation: { width: im.w, height: im.h }, type: im.type });
  const al = ALIGN[align] || AlignmentType.CENTER;
  return [
    new Paragraph({ alignment: al, spacing: { before: 80, after: 20 },
      children: [new Bookmark({ id: anchor, children: [run] })] }),
    new Paragraph({ alignment: al, spacing: { after: 120 },
      children: [new TextRun({ text: `Obrázok ${n}${caption ? ': ' + caption : ''}`, italics: true, size: 18, color: '64748B' })] }),
  ];
}

// Rekurzívne pozbieraj inline runs (s formátovaním) z HTML uzla
function collectInline(node, fmt, out) {
  (node.childNodes || []).forEach(child => {
    if (child.nodeType === 3) {
      const t = child.text;
      if (t && t.replace(/ /g, ' ').length) out.push(new TextRun({ text: t, ...fmt }));
      return;
    }
    if (child.nodeType !== 1) return;
    const tag = (child.tagName || '').toLowerCase();
    if (tag === 'br') { out.push(new TextRun({ text: '', break: 1 })); return; }
    if (tag === 'img') { const r = imageRunFrom(child.getAttribute('src'), 420); if (r) out.push(r); return; }
    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      const inner = [];
      collectInline(child, { ...fmt, color: LINK_COLOR, underline: {} }, inner);
      const kids = inner.length ? inner : [new TextRun({ text: child.text, color: LINK_COLOR, underline: {} })];
      const xref = href.match(/^#fig-(\d+)$/i);
      if (xref) out.push(new InternalHyperlink({ anchor: 'fig_' + xref[1], children: kids }));
      else if (href) out.push(new ExternalHyperlink({ link: href, children: kids }));
      else out.push(...inner);
      return;
    }
    let nf = parseInlineStyle(child, fmt);
    if (tag === 'b' || tag === 'strong') nf.bold = true;
    if (tag === 'i' || tag === 'em')     nf.italics = true;
    if (tag === 'u')                     nf.underline = {};
    if (tag === 's' || tag === 'strike' || tag === 'del') nf.strike = true;
    if (tag === 'code')                  nf.font = 'Consolas';
    collectInline(child, nf, out);
  });
}
function inlineRuns(node, fmt = {}) { const out = []; collectInline(node, fmt, out); return out; }

function imgAlignOf(el) {
  const a = (el.getAttribute('data-align') || '').toLowerCase();
  if (a === 'left' || a === 'right' || a === 'center') return a;
  return 'center';
}

// HTML (TipTap/Quill) → pole Paragraph (ctx pre figúry)
function htmlToParagraphs(html, ctx) {
  if (!stripHtml(html) && !/<img/i.test(html || '')) return [];
  const root = parse(html, { lowerCaseTagName: true });
  const paras = [];

  const pushBlock = (node) => {
    const tag = (node.tagName || '').toLowerCase();
    if (tag === 'img') { figureParagraphs(node.getAttribute('src'), ctx, { align: imgAlignOf(node), caption: node.getAttribute('alt') || '' }).forEach(p => paras.push(p)); return; }
    // odsek/blok obsahujúci IBA obrázok → figúra
    if ((tag === 'p' || tag === 'figure' || tag === 'div')) {
      const imgs = node.querySelectorAll ? node.querySelectorAll('img') : [];
      const txt = stripHtml(node.innerHTML || '');
      if (imgs.length && !txt) { imgs.forEach(im => figureParagraphs(im.getAttribute('src'), ctx, { align: imgAlignOf(im), caption: im.getAttribute('alt') || '' }).forEach(p => paras.push(p))); return; }
    }
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      node.querySelectorAll('li').forEach((li, idx) => {
        const runs = inlineRuns(li);
        if (ordered) paras.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 40 }, children: [new TextRun({ text: `${idx + 1}. `, bold: true }), ...runs] }));
        else paras.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: runs.length ? runs : [new TextRun('')] }));
      });
      return;
    }
    if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
      const sizeMap = { h1: 30, h2: 27, h3: 24, h4: 22 };
      paras.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: inlineRuns(node, { bold: true, size: sizeMap[tag] }) }));
      return;
    }
    if (tag === 'blockquote') {
      paras.push(new Paragraph({ indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 14, color: 'CBD5E1', space: 10 } }, children: inlineRuns(node, { italics: true, color: '475569' }) }));
      return;
    }
    if (tag === 'pre') {
      paras.push(new Paragraph({ shading: { fill: 'F1F5F9' }, children: [new TextRun({ text: node.text, font: 'Consolas', size: 20 })] }));
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

function firstHeadingText(html) {
  try {
    const root = parse(html || '', { lowerCaseTagName: true });
    const h = root.querySelector('h1, h2, h3');
    if (h && h.text.trim()) return h.text.trim();
  } catch (e) {}
  const t = stripHtml(html);
  return t ? t.slice(0, 60) : '';
}

// Farebné bloky upozornení / pomôcok
function warnPpeParagraphs(s) {
  const out = [];
  if (s.warnings && s.warnings.length) {
    const labels = s.warnings.map(k => WARN_MAP[k] ? `${WARN_MAP[k].icon} ${WARN_MAP[k].label}` : k).join('    ');
    out.push(new Paragraph({ shading: { fill: 'FDECEA' }, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: 'Upozornenia:  ', bold: true, color: 'C0392B' }), new TextRun({ text: labels })] }));
  }
  if (s.ppe && s.ppe.length) {
    const labels = s.ppe.map(k => PPE_MAP[k] ? `${PPE_MAP[k].icon} ${PPE_MAP[k].label}` : k).join('    ');
    out.push(new Paragraph({ shading: { fill: 'E8F5EC' }, spacing: { before: 40, after: 100 }, children: [new TextRun({ text: 'Ochranné pomôcky:  ', bold: true, color: '1F6F3D' }), new TextRun({ text: labels })] }));
  }
  return out;
}

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function bookmarkedHeading(text, anchor, ctx, level = 1) {
  ctx.toc.push({ label: text, anchor, level });
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    children: [new Bookmark({ id: anchor, children: [new TextRun({ text, bold: true, color: ACCENT })] })]
  });
}

function buildDoc(p) {
  const ctx = { figNo: 0, figures: [], toc: [] };
  const body = [];

  // Metadáta
  body.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      metaRow('Oddelenie / kategória', p.department),
      metaRow('Autor', p.author),
      metaRow('Dátum', fmtDate(p.date)),
      metaRow('Stav', { active: 'Aktívny', draft: 'Koncept', archived: 'Archivovaný' }[p.status] || p.status)
    ]
  }));

  if (p.purpose && p.purpose.trim()) {
    body.push(bookmarkedHeading('Cieľ / Účel', 'sec_purpose', ctx, 1));
    p.purpose.split('\n').forEach(line => body.push(new Paragraph({ children: [new TextRun(line)] })));
  }

  const tools = (p.tools || []).filter(t => (t.name || '').trim());
  if (tools.length) {
    body.push(bookmarkedHeading('Potrebné pomôcky / nástroje', 'sec_tools', ctx, 1));
    const headCell = (text) => new TableCell({ shading: { fill: 'EEF2F6' }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] });
    const cell = (text) => new TableCell({ margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph(text || '')] });
    body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ tableHeader: true, children: [headCell('Pomôcka / nástroj'), headCell('Poznámka')] }),
      ...tools.map(t => new TableRow({ children: [cell(t.name), cell(t.note)] }))
    ] }));
  }

  // Postup
  const steps = (p.steps || []).filter(s => stripHtml(s.text) || /<img/i.test(s.text || '') || s.image || (s.note || '').trim() || (s.warnings && s.warnings.length) || (s.ppe && s.ppe.length));
  if (steps.length) {
    body.push(bookmarkedHeading('Postup', 'sec_steps', ctx, 1));
    steps.forEach((s, i) => {
      const num = i + 1;
      const label = firstHeadingText(s.text) || 'Operácia ' + num;
      ctx.toc.push({ label: `Krok ${num} — ${label}`, anchor: 'op_' + num, level: 2 });
      body.push(new Paragraph({ spacing: { before: 160, after: 40 },
        children: [new Bookmark({ id: 'op_' + num, children: [new TextRun({ text: `Krok ${num}`, bold: true, color: ACCENT, size: 24 })] })] }));

      const pos = s.image ? (s.imagePos || 'below') : 'below';

      if (s.image && (pos === 'left' || pos === 'right')) {
        // Blok: text vľavo / obrázok vpravo (alebo naopak) — 2-stĺpcová tabuľka bez okrajov
        const textCellChildren = [];
        htmlToParagraphs(s.text, ctx).forEach(x => textCellChildren.push(x));
        if ((s.note || '').trim()) textCellChildren.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: s.note, italics: true, color: '64748B' })] }));
        if (!textCellChildren.length) textCellChildren.push(new Paragraph(''));
        const imgCellChildren = figureParagraphs(s.image, ctx, { align: 'center', caption: s.caption || '', maxW: 250 });
        if (!imgCellChildren.length) imgCellChildren.push(new Paragraph(''));
        const textCell = new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 60, right: 120 }, children: textCellChildren });
        const imgCell  = new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 120, right: 60 }, children: imgCellChildren });
        const cells = pos === 'right' ? [textCell, imgCell] : [imgCell, textCell];
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows: [new TableRow({ children: cells })] }));
        warnPpeParagraphs(s).forEach(x => body.push(x));
      } else {
        htmlToParagraphs(s.text, ctx).forEach(x => body.push(x));
        if ((s.note || '').trim()) body.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: s.note, italics: true, color: '64748B' })] }));
        if (s.image) figureParagraphs(s.image, ctx, { align: 'center', caption: s.caption || '' }).forEach(x => body.push(x));
        warnPpeParagraphs(s).forEach(x => body.push(x));
      }
    });
  }

  const risks = (p.risks || []).filter(r => (r || '').trim());
  if (risks.length) {
    body.push(bookmarkedHeading('Riziká / Upozornenia', 'sec_risks', ctx, 1));
    risks.forEach(r => body.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(r)] })));
  }

  const atts = (p.attachments || []).filter(a => (a.label || a.url || '').trim());
  if (atts.length) {
    body.push(bookmarkedHeading('Prílohy / Odkazy', 'sec_atts', ctx, 1));
    atts.forEach(a => {
      const parts = [new TextRun({ text: a.label || a.url })];
      if (a.label && a.url) parts.push(new TextRun({ text: `  —  ${a.url}`, color: '64748B' }));
      body.push(new Paragraph({ bullet: { level: 0 }, children: parts }));
    });
  }

  // Zoznam obrázkov (krížové odkazy)
  if (ctx.figures.length) {
    body.push(bookmarkedHeading('Zoznam obrázkov', 'sec_figs', ctx, 1));
    ctx.figures.forEach(f => {
      body.push(new Paragraph({ children: [new InternalHyperlink({ anchor: f.anchor, children: [new TextRun({ text: `Obrázok ${f.n}${f.caption ? ': ' + f.caption : ''}`, color: LINK_COLOR, underline: {} })] })] }));
    });
  }

  // ── Zostavenie dokumentu: titul + OBSAH + telo ──
  const children = [];
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'PRACOVNÝ POSTUP', bold: true, size: 28, color: ACCENT, characterSpacing: 30 })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: p.title || '', bold: true, size: 36 })] }));

  // Obsah dokumentu (prelinkované odrážky)
  if (ctx.toc.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 80 }, children: [new TextRun({ text: 'Obsah', bold: true, color: ACCENT })] }));
    ctx.toc.forEach(t => {
      children.push(new Paragraph({
        indent: { left: t.level === 2 ? 480 : 120 }, spacing: { after: 20 },
        children: [new InternalHyperlink({ anchor: t.anchor, children: [new TextRun({ text: (t.level === 2 ? '– ' : '• ') + t.label, color: LINK_COLOR, underline: {} })] })]
      }));
    });
    children.push(new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D6DCE4' } }, children: [new TextRun('')] }));
  }

  body.forEach(x => children.push(x));

  children.push(new Paragraph({ spacing: { before: 360 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D6DCE4' } }, children: [new TextRun({ text: `Vygenerované z FOS Dashboard · ${fmtDate(new Date())}`, italics: true, size: 16, color: '94A3B8' })] }));

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
module.exports.htmlToParagraphs = htmlToParagraphs; // znovupoužitie v datasheetoch
