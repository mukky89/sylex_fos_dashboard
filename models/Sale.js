const mongoose = require('mongoose');

// Predajný záznam — podklad pre tržby, ziskovosť a analytiku predaja
const saleSchema = new mongoose.Schema({
  date:      { type: Date, default: Date.now, index: true },
  customer:  { type: String, default: '', trim: true },
  product:   { type: String, default: '', trim: true },
  category:  { type: String, default: 'Ostatné', trim: true },  // FBG senzory / Interrogátory / Káble / Služby ...
  qty:       { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },   // predajná cena za kus (€)
  unitCost:  { type: Number, default: 0 },   // náklad na kus (€)
  invoice:   { type: String, default: '' },  // číslo faktúry
  note:      { type: String, default: '' }
}, { timestamps: true });

// Pomocné virtuály
saleSchema.virtual('revenue').get(function () { return (this.qty || 0) * (this.unitPrice || 0); });
saleSchema.virtual('cost').get(function () { return (this.qty || 0) * (this.unitCost || 0); });
saleSchema.virtual('profit').get(function () { return this.revenue - this.cost; });

module.exports = mongoose.model('Sale', saleSchema);
