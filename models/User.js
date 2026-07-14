const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  email:        { type: String, default: '', lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name:         { type: String, default: '', trim: true },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  active:       { type: Boolean, default: true },
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
