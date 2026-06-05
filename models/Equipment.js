const mongoose = require('mongoose');

// Zariadenie — klimatická komora / pec na vypekanie / iné
const equipmentSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  code:     { type: String, default: '' },                                  // napr. KK-01
  type:     { type: String, enum: ['chamber', 'oven', 'other'], default: 'chamber' },
  color:    { type: String, default: '#0891b2' },                           // farba pruhu v timeline
  location: { type: String, default: '' },
  note:     { type: String, default: '' },
  active:   { type: Boolean, default: true },
  order:    { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Equipment', equipmentSchema);
