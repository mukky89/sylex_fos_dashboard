const mongoose = require('mongoose');

// Jedna archivovaná revízia návodu (snapshot obsahu v čase)
const revisionSchema = new mongoose.Schema({
  rev:     { type: Number, required: true },
  date:    { type: Date,   default: Date.now },
  author:  { type: String, default: '' },
  note:    { type: String, default: '' },   // changelog / popis zmeny
  title:   { type: String, default: '' },
  summary: { type: String, default: '' },
  content: { type: String, default: '' }    // rich HTML snapshot
}, { _id: false });

const guideSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  category:    { type: String, default: '', trim: true },   // kategória / oblasť
  author:      { type: String, default: '', trim: true },
  date:        { type: Date,   default: Date.now },
  summary:     { type: String, default: '' },               // krátky úvod / popis
  content:     { type: String, default: '' },               // hlavný rich-text obsah (formáty, farby, obrázky)
  rev:         { type: Number, default: 1 },                 // číslo aktuálnej revízie
  revisions:   [revisionSchema],                             // história revízií (milníky)
  attachments: [{ label: String, url: String }],            // prílohy / odkazy
  status:      { type: String, enum: ['active', 'draft', 'archived'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Guide', guideSchema);
