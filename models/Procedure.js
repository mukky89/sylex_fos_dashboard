const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  procNumber:  { type: String, default: '', trim: true },    // Číslo PP (napr. PP FOS 98/2024)
  edition:     { type: String, default: '', trim: true },    // Vydanie (rok, napr. 2026)
  department:  { type: String, default: '', trim: true },   // oddelenie / kategória
  author:      { type: String, default: '', trim: true },
  owner:       { type: String, default: '', trim: true },    // vlastník postupu (zodpovedná osoba, môže byť viac mien)
  date:        { type: Date,   default: Date.now },
  purpose:     { type: String, default: '' },               // 1. Účel / cieľ
  scope:       { type: String, default: '' },               // 2. Rozsah platnosti
  definitions: { type: String, default: '' },               // 4. Definície a skratky
  // Štruktúrované tabuľky — riadky ako voľné objekty (stĺpce sú editovateľné, viď tableCols)
  changeLog:   [mongoose.Schema.Types.Mixed],   // História zmien
  relatedDocs: [mongoose.Schema.Types.Mixed],   // 3. Súvisiace dokumenty a normy
  equipment:   [mongoose.Schema.Types.Mixed],   // 5. Špeciálne vybavenie
  materials:   [mongoose.Schema.Types.Mixed],   // 6. Materiály a spotrebný materiál
  // 7.1 Kontrolný zoznam pred začatím výroby
  prepChecklist: [String],
  tools:       [{ name: String, note: String }],            // pomôcky / nástroje
  risks:       [String],                                     // riziká / upozornenia (jednoduchý zoznam)
  safety:      [mongoose.Schema.Types.Mixed],   // 12. BOZP
  waste:       [mongoose.Schema.Types.Mixed],   // 13. Nakladanie s odpadmi
  maintenance: [mongoose.Schema.Types.Mixed],   // 14. Údržba zariadení
  troubleshooting: [mongoose.Schema.Types.Mixed], // 15. Riešenie problémov
  // Editovateľné definície stĺpcov tabuliek: { <kľúč tabuľky>: [{ key, label, flex, type }] }
  tableCols:   { type: mongoose.Schema.Types.Mixed, default: {} },
  steps:       [{
    section:  { type: String, default: '' },                // názov podsekcie (napr. „8.1 Príprava vlákna")
    text:     { type: String, default: '' },                // rich HTML popis operácie
    note:     { type: String, default: '' },                // krátka poznámka
    image:    { type: String, default: '' },                // URL importovaného obrázka
    imagePos: { type: String, default: 'below' },           // below | left | right (rozloženie obrázka voči textu)
    imgWidth: { type: Number },                              // šírka obrázka v % (úprava v náhľade)
    caption:  { type: String, default: '' },                // popis obrázka (Obrázok N: ...)
    warnings: [String],                                      // kľúče typov upozornení
    ppe:      [String]                                       // kľúče ochranných pomôcok
  }],
  attachments: [{ label: String, url: String }],            // prílohy / odkazy
  status:      { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  disabledSegments: [String],                                // vypnuté kategórie (vynechané z výstupu, dáta sa zachovajú)
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
