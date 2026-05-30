// SYLEX FOS — TipTap editor pre operácie pracovných postupov.
// Build: npm run build:editor  →  public/js/editor.bundle.js (global: SylexEditor)
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TextStyle, Color, FontFamily } from '@tiptap/extension-text-style';

// Obrázok s podporou zarovnania (left / center / right) — renderuje data-align + class
const SylexImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: el => el.getAttribute('data-align') || 'center',
        renderHTML: attrs => ({ 'data-align': attrs.align || 'center', class: 'sx-img-' + (attrs.align || 'center') }),
      },
    };
  },
});
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

const ICONS = {
  undo: '↶', redo: '↷', bold: 'B', italic: 'I', underline: 'U', strike: 'S',
  h1: 'H1', h2: 'H2', h3: 'H3', ul: '• Zoznam', ol: '1. Zoznam',
  quote: '❝', code: '⌗', link: '🔗', image: '🖼', table: '▦', clear: '✕ formát'
};

function btn(label, title, onClick, name) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tt-btn';
  if (name) b.dataset.name = name;
  b.title = title || label;
  b.textContent = label;
  b.addEventListener('mousedown', (e) => { e.preventDefault(); });
  b.addEventListener('click', (e) => { e.preventDefault(); onClick(); });
  return b;
}

// Vytvorí editor v zadanom elemente. Vráti handle { getHTML, setHTML, destroy }.
export function createEditor(mountEl, opts = {}) {
  const { content = '', placeholder = 'Podrobný popis operácie…', onImageRequest } = opts;

  mountEl.innerHTML = '';
  mountEl.classList.add('tt-wrap');
  const toolbar = document.createElement('div');
  toolbar.className = 'tt-toolbar';
  const area = document.createElement('div');
  area.className = 'tt-area';
  mountEl.appendChild(toolbar);
  mountEl.appendChild(area);

  const editor = new Editor({
    element: area,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle, Color, FontFamily,
      SylexImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
    ],
    content: content || '',
  });

  const chain = () => editor.chain().focus();
  const defs = [
    { ic: ICONS.undo,  t: 'Späť',        fn: () => chain().undo().run() },
    { ic: ICONS.redo,  t: 'Dopredu',     fn: () => chain().redo().run() },
    { sep: true },
    { ic: ICONS.h1, t: 'Nadpis 1', fn: () => chain().toggleHeading({ level: 1 }).run(), name: 'heading1' },
    { ic: ICONS.h2, t: 'Nadpis 2', fn: () => chain().toggleHeading({ level: 2 }).run(), name: 'heading2' },
    { ic: ICONS.h3, t: 'Nadpis 3', fn: () => chain().toggleHeading({ level: 3 }).run(), name: 'heading3' },
    { sep: true },
    { ic: ICONS.bold,      t: 'Tučné',        fn: () => chain().toggleBold().run(),      name: 'bold' },
    { ic: ICONS.italic,    t: 'Kurzíva',      fn: () => chain().toggleItalic().run(),    name: 'italic' },
    { ic: ICONS.underline, t: 'Podčiarknuté', fn: () => chain().toggleUnderline().run(), name: 'underline' },
    { ic: ICONS.strike,    t: 'Preškrtnuté',  fn: () => chain().toggleStrike().run(),    name: 'strike' },
    { sep: true },
    { ic: ICONS.ul,    t: 'Odrážkový zoznam', fn: () => chain().toggleBulletList().run(),  name: 'bulletList' },
    { ic: ICONS.ol,    t: 'Číslovaný zoznam', fn: () => chain().toggleOrderedList().run(), name: 'orderedList' },
    { ic: ICONS.quote, t: 'Citácia',          fn: () => chain().toggleBlockquote().run(),  name: 'blockquote' },
    { ic: ICONS.code,  t: 'Blok kódu',        fn: () => chain().toggleCodeBlock().run(),   name: 'codeBlock' },
    { sep: true },
    { ic: ICONS.link,  t: 'Odkaz', fn: () => {
        const prev = editor.getAttributes('link').href || '';
        const url = window.prompt('URL odkazu:', prev);
        if (url === null) return;
        if (url === '') { chain().extendMarkRange('link').unsetLink().run(); return; }
        chain().extendMarkRange('link').setLink({ href: url }).run();
      }, name: 'link' },
    { ic: ICONS.image, t: 'Obrázok', fn: async () => {
        if (typeof onImageRequest === 'function') {
          const url = await onImageRequest();
          if (url) chain().setImage({ src: url, align: 'center' }).run();
        }
      } },
    { ic: '⬅🖼', t: 'Obrázok vľavo (text vpravo)', fn: () => chain().updateAttributes('image', { align: 'left' }).run() },
    { ic: '🖼', t: 'Obrázok na stred', fn: () => chain().updateAttributes('image', { align: 'center' }).run() },
    { ic: '🖼➡', t: 'Obrázok vpravo (text vľavo)', fn: () => chain().updateAttributes('image', { align: 'right' }).run() },
    { ic: ICONS.table, t: 'Tabuľka 3×3', fn: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { custom: 'xref' },
    { sep: true },
    { custom: 'font' },
    { custom: 'color' },
    { sep: true },
    { ic: ICONS.clear, t: 'Vyčistiť formát', fn: () => chain().unsetAllMarks().clearNodes().run() },
  ];

  const buttons = [];
  defs.forEach(d => {
    if (d.sep) { const s = document.createElement('span'); s.className = 'tt-sep'; toolbar.appendChild(s); return; }
    if (d.custom === 'color') {
      const wrap = document.createElement('label');
      wrap.className = 'tt-color'; wrap.title = 'Farba textu';
      wrap.innerHTML = '<span>A</span>';
      const inp = document.createElement('input');
      inp.type = 'color'; inp.value = '#0891b2';
      inp.addEventListener('input', () => editor.chain().focus().setColor(inp.value).run());
      wrap.appendChild(inp);
      toolbar.appendChild(wrap);
      const clr = btn('A̶', 'Zrušiť farbu', () => editor.chain().focus().unsetColor().run());
      toolbar.appendChild(clr);
      return;
    }
    if (d.custom === 'font') {
      const sel = document.createElement('select');
      sel.className = 'tt-font'; sel.title = 'Písmo';
      const fonts = [['', 'Písmo'], ['Arial', 'Arial'], ['Calibri', 'Calibri'], ['Times New Roman', 'Times New Roman'], ['Georgia', 'Georgia'], ['Courier New', 'Courier New'], ['Verdana', 'Verdana']];
      fonts.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
      sel.addEventListener('change', () => {
        if (sel.value) editor.chain().focus().setFontFamily(sel.value).run();
        else editor.chain().focus().unsetFontFamily().run();
      });
      sel.addEventListener('mousedown', e => e.stopPropagation());
      toolbar.appendChild(sel);
      return;
    }
    if (d.custom === 'xref') {
      const b = btn('⛓ Obr.', 'Krížový odkaz na obrázok', () => {
        const n = window.prompt('Číslo obrázka, na ktorý odkázať (Obrázok N):', '');
        if (!n) return;
        const num = parseInt(n, 10);
        if (!num) return;
        editor.chain().focus().insertContent(`<a href="#fig-${num}">Obrázok ${num}</a>&nbsp;`).run();
      });
      toolbar.appendChild(b);
      return;
    }
    const b = btn(d.ic, d.t, d.fn, d.name);
    toolbar.appendChild(b);
    if (d.name) buttons.push(b);
  });

  const refresh = () => {
    buttons.forEach(b => {
      const n = b.dataset.name;
      let active = false;
      if (n === 'heading1') active = editor.isActive('heading', { level: 1 });
      else if (n === 'heading2') active = editor.isActive('heading', { level: 2 });
      else if (n === 'heading3') active = editor.isActive('heading', { level: 3 });
      else active = editor.isActive(n);
      b.classList.toggle('active', !!active);
    });
  };
  editor.on('transaction', refresh);
  editor.on('selectionUpdate', refresh);
  refresh();

  return {
    getHTML: () => editor.getHTML(),
    setHTML: (html) => editor.commands.setContent(html || ''),
    isEmpty: () => editor.isEmpty,
    focus: () => editor.commands.focus(),
    destroy: () => { try { editor.destroy(); } catch (e) {} },
    editor,
  };
}

export const version = '1.0';
