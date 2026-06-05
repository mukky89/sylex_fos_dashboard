const mongoose = require('mongoose');

// Rezervácia / beh testu na zariadení (využitie v čase)
const bookingSchema = new mongoose.Schema({
  equipment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  title:       { type: String, required: true, trim: true },   // názov testu
  order:       { type: String, default: '' },                  // objednávka / zákazka
  customer:    { type: String, default: '' },                  // zákazník
  start:       { type: Date, required: true },
  end:         { type: Date, required: true },
  status:      { type: String, enum: ['planned', 'running', 'done', 'cancelled'], default: 'planned' },
  profile:     { type: String, default: '' },                  // napr. "85 °C / 85 % RH"
  note:        { type: String, default: '' },
  createdBy:   { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
