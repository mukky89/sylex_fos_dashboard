const mongoose = require('mongoose');
// Kategórie fotiek — typy produktov (napr. Strain cable, Patchcordy, ...)
const photoCategorySchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true, unique: true },
  icon:  { type: String, default: '📦' },
  color: { type: String, default: '#0891b2' },
  order: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('PhotoCategory', photoCategorySchema);
