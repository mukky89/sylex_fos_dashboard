const mongoose = require('mongoose');
// Vzdialené pripojenia — PC dostupné cez RustDesk
const remotePcSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },    // názov PC (napr. Výroba — navíjačka)
  rustdeskId: { type: String, required: true, trim: true },    // RustDesk ID (9 číslic)
  password:   { type: String, default: '' },                   // trvalé heslo (voliteľné, zobrazené maskovane)
  location:   { type: String, default: '', trim: true },       // umiestnenie (dielňa, kancelária...)
  user:       { type: String, default: '', trim: true },       // kto PC používa
  os:         { type: String, default: 'Windows', trim: true },
  ip:         { type: String, default: '', trim: true },       // lokálna IP (info)
  tags:       [String],
  note:       { type: String, default: '' },
  order:      { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('RemotePc', remotePcSchema);
