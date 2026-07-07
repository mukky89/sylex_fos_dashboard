const mongoose = require('mongoose');

// Jeden krok výrobného workflow produktu (napr. Montáž, Zváranie, Kontrola...)
const stepSchema = new mongoose.Schema({
  name:    { type: String, default: '', trim: true },   // názov kroku (Montáž, Zváranie, ...)
  station: { type: String, default: '' },               // pracovisko / linka (voliteľné)
  note:    { type: String, default: '' },               // poznámka ku kroku
  status:  { type: String, enum: ['pending', 'active', 'done'], default: 'pending' } // stav kroku
}, { _id: true });

// Výrobné workflow produktu = kód/názov produktu + postupnosť krokov
const productWorkflowSchema = new mongoose.Schema({
  code:    { type: String, default: '', trim: true },   // kód produktu (napr. SAA-01)
  product: { type: String, default: '', trim: true },   // názov produktu (voliteľný)
  steps:   { type: [stepSchema], default: [] },          // postupnosť krokov
  active:  { type: Boolean, default: true },
  note:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ProductWorkflow', productWorkflowSchema);
