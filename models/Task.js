const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  due:         { type: Date, default: null },
  priority:    { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  done:        { type: Boolean, default: false },
  doneAt:      { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
