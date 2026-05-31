const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, SECRET } = require('../middleware/auth');

function sign(u) {
  return jwt.sign({ id: u._id.toString(), username: u.username, name: u.name, role: u.role }, SECRET, { expiresIn: '30d' });
}

router.post('/login', async (req, res) => {
  try {
    const username = (req.body.username || '').toLowerCase().trim();
    const password = req.body.password || '';
    const u = await User.findOne({ username, active: true });
    if (!u) return res.status(401).json({ error: 'Nesprávne meno alebo heslo' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Nesprávne meno alebo heslo' });
    res.json({ token: sign(u), user: { id: u._id, username: u.username, name: u.name, role: u.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, name: req.user.name, role: req.user.role } });
});

// Zmena vlastného hesla
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    const ok = await bcrypt.compare(req.body.oldPassword || '', u.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Pôvodné heslo nesedí' });
    if ((req.body.newPassword || '').length < 4) return res.status(400).json({ error: 'Heslo min. 4 znaky' });
    u.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
    await u.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
