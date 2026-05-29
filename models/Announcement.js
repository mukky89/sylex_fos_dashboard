const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title:  { type: String, required: true, trim: true },
  body:   { type: String, default: '' },
  type:   { type: String, enum: ['info', 'important', 'success', 'warning'], default: 'info' },
  date:   { type: Date,   default: Date.now },
  pinned: { type: Boolean, default: false },
  author: { type: String, default: '', trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
