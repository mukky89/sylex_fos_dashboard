const mongoose = require('mongoose');

// Zdieľanie súborov pre zákazníkov — priečinok chránený heslom, prístupný cez /s/:token
const fileShareSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },   // názov zdieľania (zákazník / zákazka)
  note:         { type: String, default: '' },                  // interná poznámka
  token:        { type: String, required: true, unique: true, index: true }, // URL token (/s/:token)
  passwordHash: { type: String, required: true },               // bcrypt hash hesla (plaintext sa zobrazí len raz)
  files: [{
    storedName:   { type: String, required: true },             // názov na disku (bezpečný, generovaný)
    originalName: { type: String, required: true },             // pôvodný názov pre zákazníka
    size:         { type: Number, default: 0 },
    mime:         { type: String, default: '' },
    downloads:    { type: Number, default: 0 },
    uploadedAt:   { type: Date, default: Date.now }
  }],
  active:       { type: Boolean, default: true },               // vypnutie linku bez mazania
  expiresAt:    { type: Date, default: null },                  // voliteľná expirácia
  views:        { type: Number, default: 0 },                   // počet úspešných odomknutí
  downloads:    { type: Number, default: 0 },                   // celkový počet stiahnutí
  lastAccessAt: { type: Date, default: null },
  createdBy:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('FileShare', fileShareSchema);
