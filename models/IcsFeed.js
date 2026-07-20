const mongoose = require('mongoose');

// Externý kalendárový ICS feed (napr. publikovaný Outlook kalendár) — len na čítanie
const icsFeedSchema = new mongoose.Schema({
  url:    { type: String, required: true, trim: true },        // publikovaný .ics odkaz
  label:  { type: String, default: 'Outlook', trim: true },    // názov zdroja
  color:  { type: String, default: '#7c3aed' },                // farba udalostí
  email:  { type: String, default: '', trim: true },           // e-mail osoby (pre pozvánky na stretnutie)
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('IcsFeed', icsFeedSchema);
