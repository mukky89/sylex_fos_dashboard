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
    warnings: [String],                                      // kľúče typov upozornení
    ppe:      [String]                                       // kľúče ochranných pomôcok
  }],
  attachments: [{ label: String, url: String }],            // prílohy / odkazy
  status:      { type: String, enum: ['active', 'draft', 'archived'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Procedure', procedureSchema);
