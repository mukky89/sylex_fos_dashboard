const mongoose = require('mongoose');
const sensorTypeSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },   // napr. SC-01
  lambda0:     { type: Number, default: 1550 },                // nezaťažená λB [nm]
  sEps:        { type: Number, default: 1.2 },                 // citlivosť na pnutie [pm/µε]
  sTemp:       { type: Number, default: 10 },                  // citlivosť na teplotu [pm/°C]
  gaugeFactor: { type: Number, default: null },
  rangeEps:    { type: Number, default: 2500 },                // typický rozsah ±µε
  note:        { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('SensorType', sensorTypeSchema);
