const mongoose = require('mongoose');

// Termostatický kúpeľ / teplotný kalibrátor SIKA TP Premium (TP37 / TP3M).
// Komunikuje cez ethernet (REST-API na porte 8081, endpointy /ajax/...).
// V DB držíme len konfiguráciu zariadenia — živé dáta sa čítajú priamo
// zo zariadenia cez proxy v routes/thermalBath.js.
const thermalBathSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },      // napr. „Kalibrátor TP37 — lab"
  code:     { type: String, default: '', trim: true },         // interné označenie (napr. TP37-01)
  ip:       { type: String, required: true, trim: true },      // IPv4 adresa zariadenia v sieti
  port:     { type: Number, default: 8081 },                   // REST-API port (default 8081)
  model:    { type: String, default: '', trim: true },         // model (TP37450E, TP3M...) — informatívne
  location: { type: String, default: '', trim: true },
  note:     { type: String, default: '' },
  active:   { type: Boolean, default: true },
  order:    { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ThermalBath', thermalBathSchema);
