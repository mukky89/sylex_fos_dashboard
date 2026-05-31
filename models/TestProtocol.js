const mongoose = require('mongoose');

const testProtocolSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  project:      { type: String, default: '', trim: true },
  product:      { type: String, default: '', trim: true },
  date:         { type: Date, default: Date.now },
  tester:       { type: String, default: '', trim: true },
  ptype:        { type: String, default: '', trim: true },   // typ testu
  result:       { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
  measurements: [{ name: String, value: String, unit: String, min: String, max: String, pass: Boolean }],
  note:         { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('TestProtocol', testProtocolSchema);
