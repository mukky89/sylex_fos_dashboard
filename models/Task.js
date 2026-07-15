const mongoose = require('mongoose');

// Podúloha (checklist položka) — vnorená v úlohe
const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  done:  { type: Boolean, default: false }
}, { _id: true });

// Aktualizácia / poznámka k stavu úlohy — nemenný, časovo a autorsky označený záznam (denník)
const taskUpdateSchema = new mongoose.Schema({
  text:       { type: String, required: true, trim: true },
  authorName: { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  project:     { type: String, default: '' },   // projekt
  customer:    { type: String, default: '' },   // zákazník
  note:        { type: String, default: '' },   // poznámka
  progress:    { type: Number, default: 0, min: 0, max: 100 },  // % dokončenia
  status:      { type: String, enum: ['todo', 'inprogress', 'blocked', 'review', 'done', 'cancelled'], default: 'todo' }, // kanban stĺpec
  order:       { type: Number, default: 0 },    // poradie (drag & drop)
  due:         { type: Date, default: null },
  priority:    { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
  subtasks:    { type: [subtaskSchema], default: [] },   // podúlohy / checklist
  updates:     { type: [taskUpdateSchema], default: [] },   // denník aktualizácií (kto, kedy, čo)
  tags:        { type: [String], default: [] },
  parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },   // nadradená úloha (hierarchia)
  dependsOn:   { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], default: [] },  // závislosti
  done:        { type: Boolean, default: false },
  doneAt:      { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
