const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  department:  { type: String, default: '', trim: true },   // oddelenie / kategória
  author:      { type: String, default: '', trim: true },
  date:        { type: Date,   default: Date.now },
  purpose:     { type: String, default: '' },               // cieľ / účel
  tools:       [{ name: String, note: String }],            // pomôcky / nástroje
  risks:       [String],                                     // riziká / upozornenia
  steps:       [{
    text:     { type: String, default: '' },                // rich HTML popis operácie
    note:     { type: String, default: '' },                // krátka poznámka
    image:    { type: String, default: '' },                // URL importovaného obrázka
    imagePos: { type: String, default: 'below' },           // below | left | right (rozloženie obrázka voči textu)
    caption:  { type: String, default: '' },                // popis obrázka (Obrázok N: ...)
    warnings: [String],                                      // kľúče typov upozornení
    ppe:      [String]                                       // kľúče ochranných pomôcok
  }],
  attachments: [{ label: String, url: String }],            // prílohy / odkazy
  status:      { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  // Platnosť pracovného postupu (sekcia 17 — schvaľovanie a revízie)
  validity: {
    preparedBy:   { type: String, default: '' },            // Vypracoval (meno + funkcia / oddelenie)
    approvedBy:   { type: String, default: '' },            // Schválil (meno vedúceho výroby)
    validFrom:    { type: Date },                            // Platnosť od (dátum schválenia)
    nextRevision: { type: Date },                            // Nasledujúca revízia (max. 2 roky od vydania)
    unit:         { type: String, default: '' },            // Útvar (napr. Výroba FOS, SYLEX s.r.o., Bratislava)
    revision:     { type: String, default: '' }             // Revízia / Zmena (napr. A / 00)
  }
}, { timestamps: true });

module.exports = mongoose.model('Procedure', procedureSchema);
