const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  person:   { type: String, default: '', trim: true },   // koho sa udalosť týka (kancelária)
  date:     { type: Date,   required: true },             // začiatok (deň)
  endDate:  { type: Date,   default: null },              // koniec — pre viacdňové udalosti (voliteľné)
  allDay:   { type: Boolean, default: true },
  time:     { type: String, default: '' },                // "HH:MM" — začiatok (ak nie je celodenná)
  endTime:  { type: String, default: '' },                // "HH:MM" — koniec (voliteľné)
  color:    { type: String, default: '#00d4ff' },
  type:     { type: String, default: 'event' },           // event / dovolenka / sluzobka / meeting ...
  note:     { type: String, default: '' },
  recurFreq:  { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'], default: 'none' },
  recurUntil: { type: Date, default: null },              // opakovať do (voliteľné)
  reminderMin:{ type: Number, default: 0 }                // pripomienka X minút pred (0 = žiadna)
}, { timestamps: true });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
