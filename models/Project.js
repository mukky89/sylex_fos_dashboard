const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  code:        { type: String, default: '', trim: true },     // kód projektu
  description: { type: String, default: '' },
  workflow:    { type: String, enum: ['development', 'sales'], default: 'development' }, // typ workflow projektu
  phase:       { type: String, default: 'koncept' },           // aktuálny stage v rámci workflow
  owner:       { type: String, default: '', trim: true },     // zodpovedný
  priority:    { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  startDate:   { type: Date,   default: null },               // začiatok (pre Gantt)
  deadline:    { type: Date,   default: null },
  deliverables:{ type: [String], default: [] },               // splnené štandardné výstupy (BOO, BOM, ...)
  folder:      { type: String, default: '' },                 // cesta/odkaz (napr. G:\Projekty\...)
  tags:        [String],
  links:       [{ label: String, url: String }],
  notes:       { type: String, default: '' },
  active:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
