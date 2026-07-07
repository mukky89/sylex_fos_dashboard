const mongoose = require('mongoose');

// Jeden záznam histórie zmien (kto, kedy, čo sa zmenilo)
const historyEntrySchema = new mongoose.Schema({
  at:      { type: Date, default: Date.now },
  user:    { type: String, default: '' },        // meno používateľa, ktorý zmenu urobil
  action:  { type: String, default: 'update' },  // create | update
  changes: [{ field: String, label: String, from: String, to: String }]
}, { _id: false });

// Vlastníci produktov — podľa Excelu (hárok „final"): ZOZNAM Product Ownerov
const productOwnerRecordSchema = new mongoose.Schema({
  nr:          { type: Number, default: null },   // NR — poradové číslo
  kind:        { type: String, default: '' },     // Druh (Sensor, S-line, ...)
  cat1:        { type: String, default: '' },     // Kategória 1 (Strain, Scan, ...)
  cat2:        { type: String, default: '' },     // Kategória 2 (Temperature, Switch, ...)
  product:     { type: String, default: '' },     // Výrobok (kód)
  description: { type: String, default: '' },     // Popis výrobku
  owner:       { type: String, default: '' },     // Product Owner
  owner2:      { type: String, default: '' },     // Product Owner (2)
  backup:      { type: String, default: '' },     // Backup Owner
  status:      { type: String, default: '' },     // STAV (NOK / WIP / DONE)
  todo:        { type: String, default: '' },     // TODO
  note:        { type: String, default: '' },     // interná poznámka
  history:     { type: [historyEntrySchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('ProductOwnerRecord', productOwnerRecordSchema);
