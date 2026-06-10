const mongoose = require('mongoose');

// Pracovisko / výrobná linka — živý stav dielne (modul Riadenie výroby / MES)
const workCenterSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },  // Linka A — montáž
  code:          { type: String, default: '', trim: true },     // WC-01
  kind:          { type: String, enum: ['line', 'machine', 'manual', 'assembly', 'inspection'], default: 'line' },
  status:        { type: String, enum: ['running', 'setup', 'idle', 'maintenance', 'down'], default: 'idle' },
  currentOrder:  { type: String, default: '' },                 // VZ-2026-001 / produkt
  operator:      { type: String, default: '' },                 // obsluha
  ratedCapacity: { type: Number, default: 0 },                  // ideálny výkon (ks/h)
  shiftTarget:   { type: Number, default: 0 },                  // cieľ na zmenu (ks)
  location:      { type: String, default: '' },                 // hala / sekcia
  active:        { type: Boolean, default: true },
  order:         { type: Number, default: 0 },                  // poradie zobrazenia
  statusSince:   { type: Date, default: Date.now },             // od kedy trvá aktuálny stav
  note:          { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('WorkCenter', workCenterSchema);
