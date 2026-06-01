const mongoose = require('mongoose');
const datasheetSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },   // názov produktu
  partNumber:  { type: String, default: '', trim: true },
  model:       { type: String, default: '', trim: true },
  category:    { type: String, default: '', trim: true },
  version:     { type: String, default: '1.0', trim: true },
  status:      { type: String, enum: ['draft', 'released'], default: 'draft' },
  date:        { type: Date, default: Date.now },
  tagline:     { type: String, default: '' },                  // krátky podnadpis
  description: { type: String, default: '' },                  // rich HTML
  specs:       [{ param: String, value: String, unit: String }],
  features:    [String],
  applications:[String],
  ordering:    [{ code: String, description: String }],
  dimensions:  { type: String, default: '' },
  notes:       { type: String, default: '' },
  images:      [{ url: String, caption: String }]
}, { timestamps: true });
module.exports = mongoose.model('Datasheet', datasheetSchema);
