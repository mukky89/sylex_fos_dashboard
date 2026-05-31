const mongoose = require('mongoose');
const contactSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  company: { type: String, default: '', trim: true },
  email:   { type: String, default: '', trim: true },
  phone:   { type: String, default: '', trim: true },
  status:  { type: String, enum: ['lead', 'active', 'inactive'], default: 'lead' },
  note:    { type: String, default: '' },
  tags:    [String]
}, { timestamps: true });
module.exports = mongoose.model('Contact', contactSchema);
