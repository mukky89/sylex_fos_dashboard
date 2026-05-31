const mongoose = require('mongoose');

const prototypeSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  code:        { type: String, default: '', trim: true },
  version:     { type: String, default: '', trim: true },
  project:     { type: String, default: '', trim: true },
  date:        { type: Date, default: Date.now },
  description: { type: String, default: '' },
  results:     { type: String, default: '' },
  images:      [{ url: String, caption: String }],
  status:      { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Prototype', prototypeSchema);
