const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  email:        { type: String, default: '', lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name:         { type: String, default: '', trim: true },
  role:         { type: String, enum: ['user', 'admin', 'obchod', 'kvalita', 'technologia'], default: 'user' },
  active:       { type: Boolean, default: true },
  // Moduly, ktoré používateľ vidí v navigácii (kľúče modulov z frontendu).
  // Predvolene len Kalendár a Úlohy; rola admin vidí vždy všetko bez ohľadu na zoznam.
  modules:      { type: [String], default: () => ['calendar', 'tasks'] },
  // Overenie emailu
  emailVerified: { type: Boolean, default: false },
  verifyToken:   { type: String, default: '' },
  verifyExpires: { type: Date, default: null }
}, { timestamps: true });

// Unikátny email len pre neprázdne hodnoty (viac používateľov môže mať prázdny email).
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string', $gt: '' } } }
);

module.exports = mongoose.model('User', userSchema);
