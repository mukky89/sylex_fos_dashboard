const mongoose = require('mongoose');

// Číselník projektov a zákazníkov (per-user) — naplní sa automaticky pri uložení úlohy,
// aby boli hodnoty ponúknuté aj pri vytváraní ďalších úloh (aj keď medzitým staré úlohy zaniknú).
const taskCatalogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['customer', 'project'], required: true },
  name: { type: String, required: true, trim: true }
}, { timestamps: true });

taskCatalogSchema.index({ user: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('TaskCatalog', taskCatalogSchema);
