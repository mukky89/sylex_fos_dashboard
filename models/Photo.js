const mongoose = require('mongoose');
// Fotky z výroby — galéria s kategóriami (typy produktov), tagmi a autorom
const photoSchema = new mongoose.Schema({
  title:        { type: String, default: '', trim: true },     // názov / popis fotky
  url:          { type: String, required: true },               // /uploads/photos/...
  originalName: { type: String, default: '' },                  // pôvodný názov súboru
  mimeType:     { type: String, default: '' },
  size:         { type: Number, default: 0 },                   // bajty
  width:        { type: Number, default: 0 },
  height:       { type: Number, default: 0 },
  category:     { type: mongoose.Schema.Types.ObjectId, ref: 'PhotoCategory', default: null }, // typ produktu
  tags:         [String],
  author:       { type: String, default: '' },                  // meno, kto fotku pridal
  networkPath:  { type: String, default: '' },                  // odkaz na folder na sieti (\\server\...)
  note:         { type: String, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Photo', photoSchema);
