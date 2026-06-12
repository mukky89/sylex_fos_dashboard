const mongoose = require('mongoose');

// Uzol topológie: interrogátor / splitter / prepojovacia / senzory
const bbNodeSchema = new mongoose.Schema({
  nid:   { type: String, required: true },
  type:  { type: String, enum: ['interrogator', 'splitter', 'patch', 'sensors'], default: 'splitter' },
  label: { type: String, default: '' },
  x:     { type: Number, default: 60 },
  y:     { type: Number, default: 60 }
}, { _id: false });

// Kábel (optické prepojenie) medzi uzlami
const bbLinkSchema = new mongoose.Schema({
  lid:    { type: String, required: true },
  from:   { type: String, required: true },
  to:     { type: String, required: true },
  fibers: { type: Number, default: 4 },     // počet vlákien
  length: { type: Number, default: 0 },     // dĺžka v metroch
  label:  { type: String, default: '' }     // voliteľný vlastný popis (inak "N f @ Lm")
}, { _id: false });

const backboneSchema = new mongoose.Schema({
  name:  { type: String, required: true, default: 'Backbone' },
  nodes: { type: [bbNodeSchema], default: [] },
  links: { type: [bbLinkSchema], default: [] },
  note:  { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Backbone', backboneSchema);
