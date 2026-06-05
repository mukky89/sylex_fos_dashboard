const mongoose = require('mongoose');

// Výrobná zákazka (production / work order)
const productionOrderSchema = new mongoose.Schema({
  number:     { type: String, default: '', trim: true },     // VZ-2026-001 (auto ak prázdne)
  product:    { type: String, required: true, trim: true },  // čo sa vyrába
  customer:   { type: String, default: '' },                 // zákazník
  salesOrder: { type: String, default: '' },                 // objednávka / zákazka
  qtyPlanned: { type: Number, default: 0 },                  // plánované množstvo
  qtyDone:    { type: Number, default: 0 },                  // vyrobené množstvo
  unit:       { type: String, default: 'ks' },
  workstation:{ type: String, default: '' },                 // linka / pracovisko
  assignee:   { type: String, default: '' },                 // zodpovedný
  priority:   { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  stage:      { type: String, enum: ['plan', 'material', 'production', 'qc', 'done', 'shipped'], default: 'plan' },
  start:      { type: Date, default: null },                 // plánovaný štart
  due:        { type: Date, default: null },                 // termín dokončenia
  progress:   { type: Number, default: 0, min: 0, max: 100 },
  note:       { type: String, default: '' },
  order:      { type: Number, default: 0 }                   // poradie v stĺpci (drag & drop)
}, { timestamps: true });

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
