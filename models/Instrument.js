const mongoose = require('mongoose');

const instrumentSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  serial:          { type: String, default: '', trim: true },
  type:            { type: String, default: '', trim: true },
  location:        { type: String, default: '', trim: true },
  responsible:     { type: String, default: '', trim: true },
  lastCalibration: { type: Date, default: null },
  nextCalibration: { type: Date, default: null },
  intervalMonths:  { type: Number, default: 12 },
  note:            { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Instrument', instrumentSchema);
