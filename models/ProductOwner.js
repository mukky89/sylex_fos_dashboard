const mongoose = require('mongoose');
const productOwnerSchema = new mongoose.Schema({
  product:   { type: String, required: true, trim: true },
  po:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Product owner
  bo:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Backup owner
  note:      { type: String, default: '' },
  validFrom: { type: Date, default: null },
  validTo:   { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.model('ProductOwner', productOwnerSchema);
