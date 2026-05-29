const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  temperature: { type: Number, default: null },
  humidity:    { type: Number, default: null },
  timestamp:   { type: Date,   default: Date.now }
});

// Auto-delete readings older than 30 days
sensorReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
