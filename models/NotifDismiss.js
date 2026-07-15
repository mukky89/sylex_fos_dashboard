const mongoose = require('mongoose');

// Zapamätané (potvrdené) notifikácie per-user — aby neblikali ako "nové" navždy.
// Kľúč zahŕňa aj relevantný dátum/stav položky (napr. task:<id>:<due>), takže
// sa notifikácia znova zobrazí, ak sa dôvod zmení (napr. posunutý termín).
const notifDismissSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  key:  { type: String, required: true }
}, { timestamps: true });

notifDismissSchema.index({ user: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('NotifDismiss', notifDismissSchema);
