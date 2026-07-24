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
    // Prihlásiť sa dá menom alebo e-mailom (pole identifier / username).
    const identifier = (req.body.identifier || req.body.username || '').toLowerCase().trim();
    const password = req.body.password || '';
    if (!identifier) return res.status(401).json({ error: 'Nesprávne meno alebo heslo' });
    const u = await User.findOne({ active: true, $or: [{ username: identifier }, { email: identifier }] });
    if (!u) return res.status(401).json({ error: 'Nesprávne meno alebo heslo' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Nesprávne meno alebo heslo' });
    res.json({ token: sign(u), user: { id: u._id, username: u.username, email: u.email, name: u.name, role: u.role, modules: u.modules, emailVerified: u.emailVerified } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Overenie e-mailu cez odkaz z e-mailu — verejné (bez prihlásenia). Vráti HTML stránku.
router.get('/verify-email', async (req, res) => {
  const token = String(req.query.token || '');
  const page = (ok, title, msg) => `<!DOCTYPE html><html lang="sk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1225;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:34px 40px;max-width:420px;text-align:center}
.logo-img{height:46px;width:auto;display:block;margin:0 auto 14px}
.logo{font-size:1.4rem;font-weight:800;margin-bottom:18px}.logo span{color:#67e8f9}
.ico{font-size:3rem;margin-bottom:10px}.t{font-size:1.15rem;font-weight:700;margin:0 0 8px;color:${ok ? '#4ade80' : '#fca5a5'}}
.m{font-size:.9rem;color:#94a3b8;line-height:1.5}a{display:inline-block;margin-top:20px;color:#67e8f9;text-decoration:none;font-weight:700}</style></head>
<body><div class="card"><img class="logo-img" src="/img/sylex-logo.svg" alt="SYLEX"><div class="logo">FOS <span>Dashboard</span></div><div class="ico">${ok ? '✅' : '⚠️'}</div>
<p class="t">${title}</p><p class="m">${msg}</p><a href="/">← Prejsť na prihlásenie</a></div></body></html>`;
  try {
    if (!token) return res.status(400).send(page(false, 'Chýbajúci token', 'Odkaz na overenie je neplatný.'));
    const u = await User.findOne({ verifyToken: token });
    if (!u) return res.status(400).send(page(false, 'Neplatný odkaz', 'Tento overovací odkaz už nie je platný. Požiadaj administrátora o nový.'));
    if (u.verifyExpires && u.verifyExpires < new Date())
      return res.status(400).send(page(false, 'Odkaz vypršal', 'Platnosť overovacieho odkazu vypršala. Požiadaj administrátora o nový.'));
    u.emailVerified = true;
    u.verifyToken = '';
    u.verifyExpires = null;
    await u.save();
    res.send(page(true, 'E-mail overený', `Ďakujeme, ${u.name || u.username}. Tvoja e-mailová adresa bola úspešne overená. Môžeš sa prihlásiť.`));
  } catch (e) {
    res.status(500).send(page(false, 'Chyba', 'Pri overovaní nastala chyba. Skús to znova neskôr.'));
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id).select('username email name role modules emailVerified');
    if (!u) return res.json({ user: { id: req.user.id, username: req.user.username, name: req.user.name, role: req.user.role } });
    res.json({ user: { id: u._id, username: u.username, email: u.email, name: u.name, role: u.role, modules: u.modules, emailVerified: u.emailVerified } });
  } catch { res.json({ user: { id: req.user.id, username: req.user.username, name: req.user.name, role: req.user.role } }); }
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
