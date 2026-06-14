const mongoose = require('mongoose');

// Komentár / záznam zmeny ku konkrétnemu procesu (sales / dev / deliv)
const projectCommentSchema = new mongoose.Schema({
  scope:  { type: String, enum: ['sales', 'dev', 'deliv'], required: true },
  text:   { type: String, required: true },
  author: { type: String, default: '' },
  at:     { type: Date, default: Date.now }
}, { _id: true });

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  code:        { type: String, default: '', trim: true },     // kód projektu
  description: { type: String, default: '' },
  workflow:    { type: String, enum: ['development', 'sales'], default: 'development' }, // primárny track (legacy/analytika)
  phase:       { type: String, default: 'koncept' },           // primárny stage (legacy/analytika)
  salesStage:  { type: String, default: '' },                  // primárny/reprezentatívny stage predaja ('' = neaktívny)
  devStage:    { type: String, default: '' },                  // primárny/reprezentatívny stage vývoja ('' = neaktívny)
  salesDone:   { type: [String], default: undefined },         // hotové stupne predaja (môžu byť nepostupné)
  devDone:     { type: [String], default: undefined },         // hotové stupne vývoja (môžu byť nepostupné)
  owner:       { type: String, default: '', trim: true },     // zodpovedný
  priority:    { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  startDate:   { type: Date,   default: null },               // začiatok (pre Gantt)
  deadline:    { type: Date,   default: null },
  deliverables:{ type: [String], default: [] },               // splnené štandardné výstupy (BOO, BOM, ...)
  folder:      { type: String, default: '' },                 // cesta/odkaz (napr. G:\Projekty\...)
  tags:        [String],
  links:       [{ label: String, url: String }],
  comments:    { type: [projectCommentSchema], default: [] },  // komentáre/zmeny k procesom a výstupom
  notes:       { type: String, default: '' },
  active:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
