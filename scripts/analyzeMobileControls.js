#!/usr/bin/env node
/**
 * analyzeMobileControls.js
 * -------------------------------------------------------------
 * Diagnostika ovládateľnosti appky z mobilu (dotykové zariadenia).
 *
 * Prehľadá frontend (public/js/app.js, public/index.html) a nájde miesta,
 * ktoré na dotykovom displeji NEFUNGUJÚ alebo sú problematické:
 *   1) Natívny HTML5 drag & drop (draggable + dragstart/drop) — na mobile
 *      sa z dotyku VÔBEC nespustí. Toto je hlavná príčina "neviem ovládať".
 *   2) Ťahanie postavené len na myšových eventoch (mousedown/mousemove)
 *      bez touch/pointer alternatívy.
 *   3) Chýbajúci touch polyfill / knižnica (SortableJS, DragDropTouch, …).
 *
 * Spustenie:  node scripts/analyzeMobileControls.js
 * -------------------------------------------------------------
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'public/js/app.js');
const INDEX = path.join(ROOT, 'public/index.html');

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n');
}

// Nájde funkciu, v ktorej sa daný riadok nachádza (najbližšia deklarácia vyššie).
function enclosingFn(lines, idx) {
  const re = /^(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/;
  for (let i = idx; i >= 0; i--) {
    const m = lines[i].match(re);
    if (m) return m[1];
  }
  return '(top-level)';
}

const appLines = readLines(APP_JS);
const indexText = fs.readFileSync(INDEX, 'utf8');

// ---- 1) Natívny HTML5 drag & drop ------------------------------------------
const DND_RE = /draggable\s*=\s*['"]?true|\.draggable\s*=\s*(?:true|!ro)|addEventListener\(\s*['"]dragstart|addEventListener\(\s*['"]drop['"]|ondragstart|ondrop=/;
const dndHits = [];
appLines.forEach((line, i) => {
  if (DND_RE.test(line)) {
    dndHits.push({ line: i + 1, fn: enclosingFn(appLines, i), text: line.trim().slice(0, 110) });
  }
});

// Zoskup podľa funkcie (feature).
const dndByFn = {};
for (const h of dndHits) (dndByFn[h.fn] ||= []).push(h);

// ---- 2) Myšové ťahanie bez touch/pointer -----------------------------------
const mouseDragHits = [];
appLines.forEach((line, i) => {
  if (/addEventListener\(\s*['"]mousedown|\.onmousedown|['"]mousedown['"]/.test(line)) {
    mouseDragHits.push({ line: i + 1, fn: enclosingFn(appLines, i), text: line.trim().slice(0, 110) });
  }
});

// ---- 3) Prítomnosť touch polyfillu / knižnice ------------------------------
const TOUCH_LIBS = ['DragDropTouch', 'drag-drop-touch', 'Sortable', 'sortablejs', 'interactjs', 'interact.js', 'jquery-ui-touch-punch'];
const hasTouchLib = TOUCH_LIBS.some((lib) => indexText.includes(lib) || appLines.some((l) => l.includes(lib)));

// Počty touch/pointer handlerov v app.js (orientačne).
const count = (re) => appLines.filter((l) => re.test(l)).length;
const touchCount = count(/addEventListener\(\s*['"]touch(start|move|end)/);
const pointerCount = count(/addEventListener\(\s*['"]pointer(down|move|up)|\.onpointer(down|move|up)/);

// ---- Výpis ------------------------------------------------------------------
const B = '\x1b[1m', R = '\x1b[31m', Y = '\x1b[33m', G = '\x1b[32m', C = '\x1b[36m', X = '\x1b[0m';
const line = (c = '─') => console.log(c.repeat(64));

console.log(`${B}${C}══ Analýza ovládateľnosti z mobilu — Sylex FOS Dashboard ══${X}\n`);

line('═');
console.log(`${B}1) Natívny HTML5 drag & drop (na dotyku NEFUNGUJE)${X}`);
line();
const featLabels = {
  renderCalMonth: 'Kalendár — presúvanie udalostí medzi dňami',
  setupStepDrag: 'Editor postupov — preraďovanie krokov',
  renderPjKanban: 'Projekty — Kanban (presun kariet medzi stĺpcami)',
  pjCard: 'Projekty — Kanban karta',
  renderTaskList: 'Úlohy — zoznam (preraďovanie riadkov)',
  taskKanbanCard: 'Úlohy — Kanban karta',
  renderTaskKanban: 'Úlohy — Kanban (presun kariet)',
  renderProdKanban: 'Výroba — Kanban zákaziek (presun stavov)',
};
if (Object.keys(dndByFn).length === 0) {
  console.log(`  ${G}Žiadne výskyty.${X}`);
} else {
  for (const [fn, hits] of Object.entries(dndByFn)) {
    // Vynechaj čistý upload súborov (drop súborov funguje aj bez draggable).
    const isFileDrop = hits.every((h) => /files|upload|fs-drop|gpn-drop|phFiles/i.test(h.text));
    const label = featLabels[fn] || fn;
    const tag = isFileDrop ? `${Y}(len drop súborov — na mobile sa nahráva cez tlačidlo)${X}` : `${R}⚠ blokuje dotykové ovládanie${X}`;
    console.log(`  ${B}${label}${X}  ${tag}`);
    console.log(`    fn: ${fn}()  ·  riadky: ${hits.map((h) => h.line).join(', ')}`);
  }
}

console.log('');
line('═');
console.log(`${B}2) Ťahanie len na myšových eventoch (bez touch/pointer)${X}`);
line();
if (mouseDragHits.length === 0) {
  console.log(`  ${G}Žiadne výskyty.${X}`);
} else {
  for (const h of mouseDragHits) {
    console.log(`  ${Y}•${X} ${h.fn}()  ·  riadok ${h.line}`);
    console.log(`      ${h.text}`);
  }
}

console.log('');
line('═');
console.log(`${B}3) Touch podpora / knižnice${X}`);
line();
console.log(`  Touch polyfill/knižnica pre DnD (Sortable/DragDropTouch/interact.js): ${hasTouchLib ? G + 'ÁNO' + X : R + 'NIE — chýba' + X}`);
console.log(`  Počet touch* handlerov (touchstart/move/end):  ${touchCount === 0 ? R + '0' + X : G + touchCount + X}`);
console.log(`  Počet pointer* handlerov (fungujú aj na dotyku): ${pointerCount}`);

console.log('');
line('═');
console.log(`${B}ZÁVER${X}`);
line();
const blocking = Object.entries(dndByFn).filter(([, hits]) => !hits.every((h) => /files|upload|fs-drop|gpn-drop|phFiles/i.test(h.text)));
console.log(`  Kritických oblastí s HTML5 drag&drop bez touch podpory: ${blocking.length ? R + blocking.length + X : G + '0' + X}`);
console.log(`  Hlavná príčina: natívny HTML5 \`draggable\` sa na dotykových`);
console.log(`  zariadeniach z prsta nespustí a nie je načítaný žiadny polyfill.`);
console.log(`  Riešenie: pridať touch most (DragDropTouch polyfill / SortableJS)`);
console.log(`  alebo prepísať drag na Pointer Events (fungujú myš aj dotyk).`);
console.log('');
