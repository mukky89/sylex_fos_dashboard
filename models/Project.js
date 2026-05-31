const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  code:        { type: String, default: '', trim: true },     // kód projektu
  description: { type: String, default: '' },
  phase:       { type: String, enum: ['koncept', 'prototyp', 'testovanie', 'vyroba', 'ukoncene'], default: 'koncept' },
  owner:       { type: String, default: '', trim: true },     // zodpovedný
  priority:    { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  deadline:    { type: Date,   default: null },
  folder:      { type: String, default: '' },                 // cesta/odkaz (napr. G:\Projekty\...)
  tags:        [String],
  links:       [{ label: String, url: String }],
  notes:       { type: String, default: '' },
  active:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
