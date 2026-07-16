const mongoose = require('mongoose');

// ── Číselníky (stavy workflow, priority, typy) ────────────────────────────────
// Workflow stavy ticketu — poradie zodpovedá životnému cyklu požiadavky.
const GPN_STATUSES = [
  'new',              // Nová
  'waiting_review',   // Čaká na kontrolu
  'in_progress',      // Rozpracované
  'waiting_info',     // Čaká na doplnenie informácií (vrátené obchodníkovi)
  'ready_approval',   // Pripravené na schválenie
  'approved',         // Schválené
  'completed',        // Dokončené
  'closed'            // Uzavreté
];
const GPN_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const GPN_TYPES = ['new', 'modify']; // Nové GPN / Úprava existujúceho GPN

// Kľúče položiek checklistu výrobnej dokumentácie (pevné poradie).
const GPN_CHECKLIST_KEYS = [
  'gpn',            // Vytvorené GPN
  'prod_drawing',   // Výrobný výkres
  'pack_drawing',   // Baliaci výkres
  'bom',            // BOM
  'boo',            // BOO
  'fos_card',       // FOS karta
  'drawings_approved', // Schválenie výkresov
  'docs_complete'   // Dokumentácia kompletná
];

// ── Vnorené schémy ────────────────────────────────────────────────────────────
// Jeden kábel v požiadavke (produkt môže obsahovať viac káblov).
const cableSchema = new mongoose.Schema({
  cableType: { type: String, default: '' },   // typ kábla
  count:     { type: Number, default: 1 },     // počet káblov
  length:    { type: String, default: '' },    // dĺžka jednotlivých káblov
  color:     { type: String, default: '' },    // farba
  marking:   { type: String, default: '' }     // označenie
}, { _id: true });

// Konektor na jednej strane kábla (A / B) — pri produkte môže byť viac zostáv.
const connectorSchema = new mongoose.Schema({
  connectorA:  { type: String, default: '' },  // typ konektora A
  connectorB:  { type: String, default: '' },  // typ konektora B
  orientation: { type: String, default: '' },  // orientácia
  pinout:      { type: String, default: '' }   // pinout (ak je potrebný)
}, { _id: true });

// Príloha (výkres, fotka, špecifikácia, datasheet...). Súbor sa ukladá na disk,
// v DB je len metadáta + relatívna cesta k súboru.
const attachmentSchema = new mongoose.Schema({
  category: { type: String, default: 'other' }, // drawing/photo/spec/datasheet/other
  name:     { type: String, default: '' },      // pôvodný názov súboru
  url:      { type: String, default: '' },       // /uploads/gpn/... alebo externý odkaz
  size:     { type: Number, default: 0 },
  mime:     { type: String, default: '' },
  by:       { type: String, default: '' },       // kto pridal
  at:       { type: Date, default: Date.now }
}, { _id: true });

// Položka checklistu výrobnej dokumentácie.
const checklistItemSchema = new mongoose.Schema({
  key:    { type: String, required: true },     // jeden z GPN_CHECKLIST_KEYS
  done:   { type: Boolean, default: false },
  note:   { type: String, default: '' },
  doneBy: { type: String, default: '' },
  doneAt: { type: Date, default: null }
}, { _id: true });

// Komentár v diskusii ticketu.
const commentSchema = new mongoose.Schema({
  by:   { type: String, default: '' },          // meno autora
  byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  text: { type: String, default: '' },
  at:   { type: Date, default: Date.now }
}, { _id: true });

// Záznam histórie (kto, kedy, čo zmenil).
const historySchema = new mongoose.Schema({
  by:     { type: String, default: '' },
  byId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, default: '' },        // strojový kód udalosti (created/status/assigned/...)
  field:  { type: String, default: '' },
  from:   { type: String, default: '' },
  to:     { type: String, default: '' },
  note:   { type: String, default: '' },
  at:     { type: Date, default: Date.now }
}, { _id: true });

// ── Hlavná schéma ticketu ─────────────────────────────────────────────────────
const gpnRequestSchema = new mongoose.Schema({
  number:   { type: String, unique: true, index: true },   // GPN-2026-0001

  // Základné údaje
  type:        { type: String, enum: GPN_TYPES, default: 'new' },
  existingGpn: { type: String, default: '' },   // pri úprave — ktoré GPN sa upravuje
  priority:    { type: String, enum: GPN_PRIORITIES, default: 'normal' },
  reason:      { type: String, default: '' },   // dôvod požiadavky
  description: { type: String, default: '' },   // popis

  // Produkt
  product:        { type: String, default: '' },
  productVariant: { type: String, default: '' },
  customer:       { type: String, default: '' },
  project:        { type: String, default: '' },

  // Káble & konektory
  cables:     { type: [cableSchema], default: [] },
  connectors: { type: [connectorSchema], default: [] },

  // Materiál
  material: {
    tubing:    { type: String, default: '' },
    sleeve:    { type: String, default: '' },
    label:     { type: String, default: '' },
    heatShrink:{ type: String, default: '' },
    other:     { type: String, default: '' }
  },

  // Prílohy
  attachments: { type: [attachmentSchema], default: [] },

  // Dodatočné informácie
  deadline:   { type: Date, default: null },
  notes:      { type: String, default: '' },
  special:    { type: String, default: '' },   // špeciálne požiadavky

  // Workflow
  status:   { type: String, enum: GPN_STATUSES, default: 'new', index: true },
  resultGpn:{ type: String, default: '' },     // výsledné vytvorené GPN (vyplní technológ)

  // Ľudia
  requester:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  requesterName: { type: String, default: '' },
  assignee:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assigneeName:  { type: String, default: '' },

  // Checklist dokumentácie
  checklist: { type: [checklistItemSchema], default: [] },

  // Diskusia + história
  comments: { type: [commentSchema], default: [] },
  history:  { type: [historySchema], default: [] }
}, { timestamps: true });

gpnRequestSchema.statics.STATUSES = GPN_STATUSES;
gpnRequestSchema.statics.PRIORITIES = GPN_PRIORITIES;
gpnRequestSchema.statics.TYPES = GPN_TYPES;
gpnRequestSchema.statics.CHECKLIST_KEYS = GPN_CHECKLIST_KEYS;

module.exports = mongoose.model('GpnRequest', gpnRequestSchema);
