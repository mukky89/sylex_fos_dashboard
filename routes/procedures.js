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
  VerticalPositionRelativeFrom, TextWrappingType, TextWrappingSide,
  Header, Footer, PageNumber, TabStopType, TabStopPosition
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
// Firemná paleta SYLEX (podľa vzoru PP FOS OS3155)
const NAVY = '1A1A2E';   // tmavá navy — titul, hlavičky tabuliek, názvy sekcií
const LIME = '97BF0D';   // limetková — čísla sekcií, akcenty
const BODY = '333333';   // text
const ZEBRA = 'F7FAF0';  // svetlozelený pruh (zebra v tabuľkách)
const SECBAR = 'F4F8EB'; // pruh nadpisu sekcie
const GRIDLINE = 'EEEEEE';
const FONT = 'Arial';
const ACCENT = LIME;
const LINK_COLOR = '3B6D11';
const LOGO_PATH = path.join(PUBLIC_DIR, 'assets', 'guides', 'sylex-logo.png');

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return ''; }
};
const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// Tenké sivé orámovanie pre dátové tabuľky
const gridBorders = (color = GRIDLINE) => ({
  top: { style: BorderStyle.SINGLE, size: 2, color },
  bottom: { style: BorderStyle.SINGLE, size: 2, color },
  left: { style: BorderStyle.SINGLE, size: 2, color },
  right: { style: BorderStyle.SINGLE, size: 2, color },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color },
});

const sectionHeading = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 260, after: 100 },
  children: [new TextRun({ text, bold: true, color: ACCENT, font: FONT })]
});

function metaRow(label, value) {
  const cell = (children, opts = {}) => new TableCell({
    width: { size: opts.w || 50, type: WidthType.PERCENTAGE },
    shading: opts.head ? { fill: SECBAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children
  });
  return new TableRow({
    children: [
      cell([new Paragraph({ children: [new TextRun({ text: label, bold: true, color: NAVY, font: FONT, size: 19 })] })], { w: 30, head: true }),
      cell([new Paragraph({ children: [new TextRun({ text: String(value || '—'), color: BODY, font: FONT, size: 19 })] })], { w: 70 })
    ]
  });
}

// ── Obrázky ───────────────────────────────────────────────────────────────────
function readImageData(url, maxW = 460) {
  try {
    if (!url || !(url.startsWith('/uploads/') || url.startsWith('/assets/'))) return null;
    const fp = path.normalize(path.join(PUBLIC_DIR, url));
    if (!fp.startsWith(PUBLIC_DIR)) return null; // ochrana proti path traversal
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
  // Číslo sekcie (napr. „5.") zvýrazni limetkovou, názov navy — pruh v svetlozelenej
  const m = String(text).match(/^(\d+\.)\s*(.*)$/);
  const runs = [];
  if (m) {
    runs.push(new TextRun({ text: m[1] + '  ', bold: true, color: LIME, size: 28, font: FONT }));
    runs.push(new Bookmark({ id: anchor, children: [new TextRun({ text: m[2].toUpperCase(), bold: true, color: NAVY, size: 28, font: FONT })] }));
  } else {
    runs.push(new Bookmark({ id: anchor, children: [new TextRun({ text: String(text).toUpperCase(), bold: true, color: NAVY, size: 28, font: FONT })] }));
  }
  return new Paragraph({
    spacing: { before: 300, after: 140 },
    shading: { fill: SECBAR },
    border: {
      left: { style: BorderStyle.SINGLE, size: 28, color: LIME, space: 10 },
      top: { style: BorderStyle.SINGLE, size: 10, color: SECBAR, space: 6 },
      bottom: { style: BorderStyle.SINGLE, size: 10, color: SECBAR, space: 6 },
      right: { style: BorderStyle.SINGLE, size: 10, color: SECBAR, space: 6 },
    },
    children: runs
  });
}

function buildDoc(p) {
  const ctx = { figNo: 0, figures: [], toc: [] };
  const body = [];

  // ── Pomocníci ──
  const headCell = (text) => new TableCell({ shading: { fill: NAVY }, margins: { top: 70, bottom: 70, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: String(text || ''), bold: true, color: 'FFFFFF', size: 18, font: FONT })] })] });
  const cell = (text, zebra) => new TableCell({ shading: zebra ? { fill: ZEBRA } : undefined, margins: { top: 55, bottom: 55, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: String(text || ''), size: 18, color: BODY, font: FONT })] })] });
  const dataTable = (headers, rows) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: gridBorders(), rows: [
    new TableRow({ tableHeader: true, children: headers.map(headCell) }),
    ...rows.map((r, i) => new TableRow({ children: r.map(c => cell(c, i % 2 === 1)) }))
  ] });
  const filled = (arr, keys) => (arr || []).filter(o => keys.some(k => (o[k] || '').toString().trim()));
  let secNo = 0;
  const numHeading = (title, anchor) => bookmarkedHeading(`${++secNo}. ${title}`, anchor, ctx, 1);

  // Metadáta
  body.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ...(p.procNumber ? [metaRow('Číslo PP', p.procNumber)] : []),
      ...(p.edition ? [metaRow('Vydanie', p.edition)] : []),
      metaRow('Oddelenie / kategória', p.department),
      metaRow('Autor', p.author),
      metaRow('Vlastník', p.owner),
      metaRow('Dátum', fmtDate(p.date)),
      metaRow('Stav', { active: 'Aktívny', draft: 'Koncept', archived: 'Archivovaný' }[p.status] || p.status)
    ]
  }));

  // História zmien
  const changeLog = filled(p.changeLog, ['version', 'change', 'date', 'reason', 'author']);
  if (changeLog.length) {
    body.push(bookmarkedHeading('História zmien', 'sec_changelog', ctx, 1));
    body.push(dataTable(['Verzia', 'Zmena', 'Dátum', 'Dôvod zmeny', 'Vypracoval'],
      changeLog.map(c => [c.version, c.change, c.date ? fmtDate(c.date) : '', c.reason, c.author])));
  }

  if (p.purpose && p.purpose.trim()) {
    body.push(numHeading('Účel', 'sec_purpose'));
    p.purpose.split('\n').forEach(line => body.push(new Paragraph({ children: [new TextRun(line)] })));
  }

  if (p.scope && p.scope.trim()) {
    body.push(numHeading('Rozsah platnosti', 'sec_scope'));
    p.scope.split('\n').forEach(line => body.push(new Paragraph({ children: [new TextRun(line)] })));
  }

  const relatedDocs = filled(p.relatedDocs, ['document', 'description', 'reference']);
  if (relatedDocs.length) {
    body.push(numHeading('Súvisiace dokumenty a normy', 'sec_reldocs'));
    body.push(dataTable(['Dokument / Norma', 'Popis', 'Číslo / Odkaz'], relatedDocs.map(d => [d.document, d.description, d.reference])));
  }

  if (p.definitions && p.definitions.trim()) {
    body.push(numHeading('Definície a skratky', 'sec_defs'));
    p.definitions.split('\n').forEach(line => body.push(new Paragraph({ children: [new TextRun(line)] })));
  }

  const equipment = filled(p.equipment, ['no', 'name', 'description', 'calibration']);
  if (equipment.length) {
    body.push(numHeading('Špeciálne vybavenie', 'sec_equip'));
    body.push(dataTable(['č.', 'Názov položky', 'Popis / P/N', 'Kalibrácia'], equipment.map(e => [e.no, e.name, e.description, e.calibration])));
  }

  const materials = filled(p.materials, ['no', 'name', 'description', 'partNumber', 'quantity']);
  if (materials.length) {
    body.push(numHeading('Materiály a spotrebný materiál', 'sec_mat'));
    body.push(dataTable(['č.', 'Názov', 'Popis', 'Sylex PN', 'Množstvo'], materials.map(m => [m.no, m.name, m.description, m.partNumber, m.quantity])));
  }

  const tools = (p.tools || []).filter(t => (t.name || '').trim());
  if (tools.length) {
    body.push(bookmarkedHeading('Potrebné pomôcky / nástroje', 'sec_tools', ctx, 1));
    body.push(dataTable(['Pomôcka / nástroj', 'Poznámka'], tools.map(t => [t.name, t.note])));
  }

  const prep = (p.prepChecklist || []).filter(x => (x || '').trim());
  if (prep.length) {
    body.push(numHeading('Príprava pracoviska a zariadení', 'sec_prep'));
    prep.forEach(x => body.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun('☐  ' + x)] })));
  }

  // Postup
  const steps = (p.steps || []).filter(s => stripHtml(s.text) || /<img/i.test(s.text || '') || s.image || (s.note || '').trim() || (s.warnings && s.warnings.length) || (s.ppe && s.ppe.length));
  if (steps.length) {
    body.push(numHeading('Postup montáže', 'sec_steps'));
    let curSection = null, subPrefix = null, subCount = 0, globalNo = 0;
    steps.forEach((s, i) => {
      const num = i + 1;
      if ((s.section || '') && s.section !== curSection) {
        curSection = s.section;
        const mm = curSection.match(/^\s*(\d+(?:\.\d+)*)/);
        subPrefix = mm ? mm[1] : null;
        subCount = 0;
        body.push(new Paragraph({ spacing: { before: 220, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: LIME, space: 4 } }, children: [new TextRun({ text: curSection, bold: true, color: NAVY, size: 24, font: FONT })] }));
      }
      // Normálne číslovanie operácie: hierarchické podľa podsekcie (napr. 8.1.1), inak sekvenčné
      let numLabel;
      if (subPrefix) { subCount++; numLabel = subPrefix + '.' + subCount; }
      else { globalNo++; numLabel = String(globalNo); }
      const label = firstHeadingText(s.text) || 'Operácia ' + numLabel;
      ctx.toc.push({ label: `${numLabel} — ${label}`, anchor: 'op_' + num, level: 2 });
      body.push(new Paragraph({ spacing: { before: 160, after: 40 },
        children: [new Bookmark({ id: 'op_' + num, children: [
          new TextRun({ text: numLabel, bold: true, color: NAVY, size: 22, font: FONT })
        ] })] }));

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

  const safety = filled(p.safety, ['risk', 'source', 'measure']);
  if (safety.length) {
    body.push(numHeading('Bezpečnosť pri práci (BOZP)', 'sec_safety'));
    body.push(dataTable(['Riziko', 'Zdroj', 'Opatrenie'], safety.map(s => [s.risk, s.source, s.measure])));
  }

  const risks = (p.risks || []).filter(r => (r || '').trim());
  if (risks.length) {
    body.push(bookmarkedHeading('Ďalšie riziká / upozornenia', 'sec_risks', ctx, 1));
    risks.forEach(r => body.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(r)] })));
  }

  const waste = filled(p.waste, ['waste', 'category', 'disposal']);
  if (waste.length) {
    body.push(numHeading('Nakladanie s odpadmi', 'sec_waste'));
    body.push(dataTable(['Odpad', 'Kategória', 'Likvidácia'], waste.map(w => [w.waste, w.category, w.disposal])));
  }

  const maintenance = filled(p.maintenance, ['equipment', 'interval', 'task', 'responsible']);
  if (maintenance.length) {
    body.push(numHeading('Údržba zariadení a prípravku', 'sec_maint'));
    body.push(dataTable(['Zariadenie', 'Interval', 'Úkon', 'Zodpovedný'], maintenance.map(m => [m.equipment, m.interval, m.task, m.responsible])));
  }

  const troubleshooting = filled(p.troubleshooting, ['problem', 'cause', 'solution']);
  if (troubleshooting.length) {
    body.push(numHeading('Riešenie problémov', 'sec_trouble'));
    body.push(dataTable(['Problém', 'Príčina', 'Riešenie'], troubleshooting.map(t => [t.problem, t.cause, t.solution])));
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

  // Platnosť pracovného postupu (schvaľovanie + revízie)
  const v = p.validity || {};
  const hasValidity = v.preparedBy || v.approvedBy || v.validFrom || v.nextRevision || v.unit || v.revision || p.author;
  if (hasValidity) {
    body.push(bookmarkedHeading('Platnosť pracovného postupu', 'sec_validity', ctx, 1));
    body.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        metaRow('Vypracoval', v.preparedBy || p.author || '—'),
        metaRow('Schválil', v.approvedBy || '—'),
        metaRow('Platnosť od', v.validFrom ? fmtDate(v.validFrom) : '—'),
        metaRow('Nasledujúca revízia', v.nextRevision ? fmtDate(v.nextRevision) : '— (max. 2 roky od vydania)'),
        metaRow('Útvar', v.unit || '—'),
        metaRow('Revízia / Zmena', v.revision || '—')
      ]
    }));
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

  // Logo SYLEX (ak existuje)
  let logoRun = null;
  try {
    if (fs.existsSync(LOGO_PATH)) {
      logoRun = new ImageRun({ data: fs.readFileSync(LOGO_PATH), transformation: { width: 178, height: 45 }, type: 'png' });
    }
  } catch (e) {}
  if (logoRun) children.push(new Paragraph({ spacing: { after: 160 }, children: [logoRun] }));

  // Titulný pruh — navy s bielym názvom
  children.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    shading: { fill: NAVY },
    border: {
      left: { style: BorderStyle.SINGLE, size: 30, color: LIME, space: 12 },
      top: { style: BorderStyle.SINGLE, size: 30, color: NAVY, space: 10 },
      bottom: { style: BorderStyle.SINGLE, size: 30, color: NAVY, space: 10 },
      right: { style: BorderStyle.SINGLE, size: 30, color: NAVY, space: 10 },
    },
    children: [new TextRun({ text: p.title || 'Pracovný postup', bold: true, size: 40, color: 'FFFFFF', font: FONT })]
  }));
  const eyebrow = ['PRACOVNÝ POSTUP'];
  if (p.procNumber) eyebrow.push(p.procNumber);
  if (p.edition) eyebrow.push('Vydanie ' + p.edition);
  if (p.validity && p.validity.revision) eyebrow.push('Revízia ' + p.validity.revision);
  children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: eyebrow.join('   ·   '), bold: true, size: 18, color: LIME, characterSpacing: 16, font: FONT })] }));

  // Obsah dokumentu (prelinkované odrážky)
  if (ctx.toc.length) {
    children.push(new Paragraph({ spacing: { before: 60, after: 100 }, children: [new TextRun({ text: 'OBSAH', bold: true, size: 24, color: NAVY, characterSpacing: 20, font: FONT })] }));
    ctx.toc.forEach(t => {
      children.push(new Paragraph({
        indent: { left: t.level === 2 ? 480 : 120 }, spacing: { after: 20 },
        children: [new InternalHyperlink({ anchor: t.anchor, children: [new TextRun({ text: (t.level === 2 ? '– ' : '• ') + t.label, color: LINK_COLOR, underline: {}, font: FONT })] })]
      }));
    });
    children.push(new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIME } }, children: [new TextRun('')] }));
  }

  body.forEach(x => children.push(x));

  children.push(new Paragraph({ spacing: { before: 360 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: GRIDLINE } }, children: [new TextRun({ text: `Vygenerované z FOS Dashboard · ${fmtDate(new Date())}`, italics: true, size: 16, color: '888888', font: FONT })] }));

  // Hlavička a pätička dokumentu
  const header = new Header({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRIDLINE, space: 4 } },
    children: [
      new TextRun({ text: (p.procNumber || 'Pracovný postup') + (p.validity && p.validity.revision ? '   ·   Revízia ' + p.validity.revision : ''), size: 16, color: '888888', font: FONT }),
      new TextRun({ text: '\tSensors and Sensing Systems', size: 16, color: '97BF0D', bold: true, font: FONT }),
    ]
  })] });
  const footer = new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: GRIDLINE, space: 4 } },
    children: [
      new TextRun({ text: 'Strana ', size: 16, color: '888888', font: FONT }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888', font: FONT }),
      new TextRun({ text: ' z ', size: 16, color: '888888', font: FONT }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '888888', font: FONT }),
    ]
  })] });

  return new Document({
    creator: 'FOS Dashboard',
    title: p.title || 'Pracovný postup',
    styles: { default: { document: { run: { font: FONT, size: 20, color: BODY } } } },
    sections: [{ properties: {}, headers: { default: header }, footers: { default: footer }, children }]
  });
}


router.get('/:id/docx', async (req, res) => {
  try {
    const p = await Procedure.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });

    const doc = buildDoc(p);
    const buffer = await Packer.toBuffer(doc);

    // ASCII fallback bez diakritiky (Content-Disposition musí byť latin1) + plný UTF-8 názov cez RFC 5987
    const base = (p.title || 'postup').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const ascii = (base.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_') || 'postup');
    const utf8 = encodeURIComponent(`Postup_${(p.title || 'postup').replace(/\s+/g, '_')}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Postup_${ascii}.docx"; filename*=UTF-8''${utf8}`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.buildDoc = buildDoc; // exported for testing / reuse
module.exports.htmlToParagraphs = htmlToParagraphs; // znovupoužitie v datasheetoch
