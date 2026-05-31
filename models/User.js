const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name:         { type: String, default: '', trim: true },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  active:       { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
