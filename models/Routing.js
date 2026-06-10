const mongoose = require('mongoose');

// Jedna normovaná operácia technologického postupu
const operationSchema = new mongoose.Schema({
  group:   { type: String, default: '' },    // Č — skupina / fáza (02, 03, 04, 05)
  code:    { type: String, default: '' },    // Kód operácie (1-23-21-00-00-001)
  desc:    { type: String, default: '' },    // Popis
  tPiece:  { type: Number, default: 0 },     // t/ks — norma v minútach na kus
  qty:     { type: Number, default: 1 },     // ks — počet v operácii
  line:    { type: String, default: '' },    // linka / pracovisko (Rezanie, FOS, Strojový čas)
  machine: { type: Boolean, default: false },// strojový čas → bez prirážky (koeficient 1,0)
  opNote:  { type: String, default: '' }     // Popis operácie
}, { _id: true });

// Technologický postup výrobku = zoznam normovaných operácií
const routingSchema = new mongoose.Schema({
  product:    { type: String, required: true, trim: true },  // názov výrobku
  code:       { type: String, default: '', trim: true },     // kód výrobku
  coeff:      { type: Number, default: 1.1 },                 // prirážka na ručné operácie (t/výrobok = t/ks × ks × coeff)
  operations: { type: [operationSchema], default: [] },
  active:     { type: Boolean, default: true },
  note:       { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Routing', routingSchema);
