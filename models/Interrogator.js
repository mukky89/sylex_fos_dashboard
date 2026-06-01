const mongoose = require('mongoose');
const interrogatorSchema = new mongoose.Schema({
  serial:         { type: String, required: true, trim: true },     // sériové číslo (kľúč)
  model:          { type: String, default: 'S-line', trim: true },  // model / typ
  channels:       { type: Number, default: null },                  // počet kanálov
  firmware:       { type: String, default: '', trim: true },
  hwRevision:     { type: String, default: '', trim: true },
  manufacturedAt: { type: Date, default: null },                    // dátum výroby
  status:         { type: String, enum: ['sklad', 'predany', 'zakaznik', 'oprava', 'vyradeny'], default: 'sklad' },
  customer:       { type: String, default: '', trim: true },        // zákazník
  soldAt:         { type: Date, default: null },                    // dátum predaja
  soldTo:         { type: String, default: '', trim: true },        // komu predaný
  warrantyUntil:  { type: Date, default: null },                    // záruka do
  location:       { type: String, default: '', trim: true },        // kde sa nachádza
  notes:          { type: String, default: '' },
  repairs:        [{ date: Date, description: String, technician: String, cost: String }] // história opráv
}, { timestamps: true });
module.exports = mongoose.model('Interrogator', interrogatorSchema);
