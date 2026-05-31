const mongoose = require('mongoose');
const crmEmailSchema = new mongoose.Schema({
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null, index: true },
  subject: { type: String, default: '(bez predmetu)', trim: true },
  from:    { type: String, default: '' },
  to:      { type: String, default: '' },
  date:    { type: Date, default: Date.now },
  body:    { type: String, default: '' },
  fileUrl: { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('CrmEmail', crmEmailSchema);
