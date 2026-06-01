const mongoose = require('mongoose');
// Anonymná otázka — zámerne NEukladá autora
const questionSchema = new mongoose.Schema({
  text:     { type: String, required: true, trim: true },
  answer:   { type: String, default: '' },
  answered: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Question', questionSchema);
