const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '📁' },
  color: { type: String, default: '#00d4ff' },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
