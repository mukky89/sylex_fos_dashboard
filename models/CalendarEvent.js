const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  person:   { type: String, default: '', trim: true },   // koho sa udalosť týka (kancelária)
  date:     { type: Date,   required: true },             // začiatok (deň)
  endDate:  { type: Date,   default: null },              // koniec — pre viacdňové udalosti (voliteľné)
  allDay:   { type: Boolean, default: true },
  time:     { type: String, default: '' },                // "HH:MM" — ak nie je celodenná
  color:    { type: String, default: '#00d4ff' },
  type:     { type: String, default: 'event' },           // event / dovolenka / sluzobka / meeting ...
  note:     { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
