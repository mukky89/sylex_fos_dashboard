const mongoose = require('mongoose');

// Podúloha (checklist položka) — vnorená v úlohe
const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  done:  { type: Boolean, default: false }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  project:     { type: String, default: '' },   // projekt
  customer:    { type: String, default: '' },   // zákazník
  note:        { type: String, default: '' },   // poznámka
  progress:    { type: Number, default: 0, min: 0, max: 100 },  // % dokončenia
  status:      { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' }, // kanban stĺpec
  order:       { type: Number, default: 0 },    // poradie (drag & drop)
  due:         { type: Date, default: null },
  priority:    { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  subtasks:    { type: [subtaskSchema], default: [] },   // podúlohy / checklist
  done:        { type: Boolean, default: false },
  doneAt:      { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
