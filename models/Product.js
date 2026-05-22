const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  model: { type: String, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: { type: String, default: '' },
  content: { type: String, default: '' }, // rich HTML content
  images: [{ url: String, caption: String }],
  tags: [String],
  version: { type: String, default: '' },
  status: { type: String, enum: ['active', 'discontinued', 'development'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
