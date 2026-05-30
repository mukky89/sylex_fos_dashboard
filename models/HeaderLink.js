const mongoose = require('mongoose');

const headerLinkSchema = new mongoose.Schema({
  label:         { type: String, required: true },
  url:           { type: String, required: true },
  color:         { type: String, default: 'sp' },        // cyan|blue|purple|green|sp
  group:         { type: String, default: 'custom' },    // erp|sharepoint|custom
  hasDot:        { type: Boolean, default: false },
  pinned:        { type: Boolean, default: false },        // zobraziť priamo v hlavičke (mimo dropdownu)
  hasCredential: { type: Boolean, default: false },
  credentialKey: { type: String, default: '' },
  order:         { type: Number, default: 0 },
  active:        { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('HeaderLink', headerLinkSchema);
