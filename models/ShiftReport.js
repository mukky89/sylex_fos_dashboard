const mongoose = require('mongoose');

// Zmenový výkaz — nahlásená skutočná výroba za zmenu (podklad pre OEE / prestoje / zmätkovitosť)
const shiftReportSchema = new mongoose.Schema({
  date:            { type: Date, default: Date.now },
  shift:           { type: String, enum: ['R', 'P', 'N'], default: 'R' },   // ranná / poobedná / nočná
  workCenter:      { type: String, required: true, trim: true },            // názov pracoviska
  product:         { type: String, default: '' },
  orderNumber:     { type: String, default: '' },                           // VZ-...
  plannedMinutes:  { type: Number, default: 480 },                          // plánovaný čas zmeny (min)
  downtimeMinutes: { type: Number, default: 0 },                            // celkové prestoje (min)
  downtimeReason:  { type: String, enum: ['none', 'breakdown', 'setup', 'material', 'quality', 'noOperator', 'changeover', 'other'], default: 'none' },
  idealRate:       { type: Number, default: 0 },                            // ideálny výkon (ks/h) pre výpočet Výkonu
  goodQty:         { type: Number, default: 0 },                            // dobré kusy
  scrapQty:        { type: Number, default: 0 },                            // nepodarky / NOK
  targetQty:       { type: Number, default: 0 },                            // cieľ ks (fallback pre Výkon)
  operator:        { type: String, default: '' },
  note:            { type: String, default: '' }
}, { timestamps: true });

shiftReportSchema.index({ date: -1 });

module.exports = mongoose.model('ShiftReport', shiftReportSchema);
