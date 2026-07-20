const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const mailer = require('../utils/mailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const ROLES = ['user', 'admin', 'obchod', 'kvalita', 'technologia'];
const normRole = r => ROLES.includes(r) ? r : 'user';

// Zoznam mien používateľov pre výbery (PO/BO, priradenia) — dostupné každému prihlásenému
router.get('/options', requireAuth, async (req, res) => {
  try { res.json(await User.find({ active: true }).select('name username email').sort({ name: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try { res.json(await User.find().select('-passwordHash -verifyToken').sort({ username: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Pripraví (a podľa možnosti odošle) overovací e-mail. Vráti { emailSent, verifyUrl }.
async function issueVerification(user, req) {
  const token = crypto.randomBytes(32).toString('hex');
  user.verifyToken = token;
  user.verifyExpires = new Date(Date.now() + VERIFY_TTL_MS);
  user.emailVerified = false;
  await user.save();
  const base = mailer.baseUrl(req);
  const verifyUrl = `${base}/api/auth/verify-email?token=${token}`;
  const logoUrl = base ? `${base}/img/sylex-logo.png` : '';
  const tpl = mailer.verificationEmail({ name: user.name, verifyUrl, logoUrl });
  const r = await mailer.sendMail({ to: user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
  return { emailSent: r.sent, verifyUrl, mailError: r.error };
}

router.post('/', async (req, res) => {
  try {
    const username = (req.body.username || '').toLowerCase().trim();
    const email = (req.body.email || '').toLowerCase().trim();
    if (!username || !(req.body.password || '').length) return res.status(400).json({ error: 'Meno a heslo sú povinné' });
    if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Neplatný e-mail' });
    if (await User.exists({ username })) return res.status(400).json({ error: 'Používateľ s týmto menom už existuje' });
    if (email && await User.exists({ email })) return res.status(400).json({ error: 'Používateľ s týmto e-mailom už existuje' });

    const u = await User.create({
      username, email, name: req.body.name || '',
      role: normRole(req.body.role),
      active: req.body.active !== undefined ? !!req.body.active : true,
      passwordHash: await bcrypt.hash(req.body.password, 10),
      emailVerified: false
    });

    let verify = null;
    // Odošli overovací e-mail, ak je email a admin to nevypol
    if (email && req.body.sendVerification !== false) {
      verify = await issueVerification(u, req);
    }
    res.status(201).json({
      id: u._id, _id: u._id, username: u.username, email: u.email, name: u.name, role: u.role, active: u.active,
      emailVerified: u.emailVerified,
      emailSent: verify ? verify.emailSent : false,
      verifyUrl: verify ? verify.verifyUrl : null,
      mailError: verify ? verify.mailError : null,
      smtpConfigured: mailer.isConfigured()
    });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (req.body.name !== undefined) u.name = req.body.name;
    if (req.body.role) u.role = normRole(req.body.role);
    if (req.body.active !== undefined) u.active = !!req.body.active;
    if (req.body.password) u.passwordHash = await bcrypt.hash(req.body.password, 10);

    let verify = null;
    if (req.body.email !== undefined) {
      const email = (req.body.email || '').toLowerCase().trim();
      if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Neplatný e-mail' });
      if (email && email !== u.email && await User.exists({ email, _id: { $ne: u._id } }))
        return res.status(400).json({ error: 'Používateľ s týmto e-mailom už existuje' });
      const changed = email !== u.email;
      u.email = email;
      if (!email) { u.emailVerified = false; u.verifyToken = ''; u.verifyExpires = null; }
      else if (changed) {
        u.emailVerified = false;
        if (req.body.sendVerification !== false) verify = await issueVerification(u, req);
      }
    }
    await u.save();
    const out = u.toObject(); delete out.passwordHash; delete out.verifyToken;
    if (verify) { out.emailSent = verify.emailSent; out.verifyUrl = verify.verifyUrl; out.mailError = verify.mailError; out.smtpConfigured = mailer.isConfigured(); }
    res.json(out);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// (Znovu)odoslanie overovacieho e-mailu
router.post('/:id/send-verification', async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (!u.email) return res.status(400).json({ error: 'Používateľ nemá e-mail' });
    if (u.emailVerified) return res.json({ ok: true, alreadyVerified: true });
    const verify = await issueVerification(u, req);
    res.json({ ok: true, emailSent: verify.emailSent, verifyUrl: verify.verifyUrl, mailError: verify.mailError, smtpConfigured: mailer.isConfigured() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Nemôžeš zmazať sám seba' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
