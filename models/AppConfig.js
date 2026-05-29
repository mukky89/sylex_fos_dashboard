const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  label: { type: String, default: '' },
  group: { type: String, default: 'general' },
  type:  { type: String, default: 'string' }  // string|number|boolean
});

module.exports = mongoose.model('AppConfig', appConfigSchema);
