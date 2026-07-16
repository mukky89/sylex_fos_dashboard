/**
 * Denný e-mailový súhrn úloh — pre každého používateľa s vyplneným a overeným
 * e-mailom pošle prehľad zmeškaných úloh, úloh na dnes a na zajtra (podľa poľa
 * `due` na modeli Task). Bez úloh s termínom sa e-mail danému používateľovi
 * neposiela (žiadny spam, keď nie je čo riešiť).
 *
 * Časovanie behu (server.js) — nie obsah tohto súboru.
 */
const User = require('../models/User');
const Task = require('../models/Task');
const mailer = require('./mailer');

// Dátum vo formáte 'YYYY-MM-DD' pre daný časový posun (v dňoch) od dnešného dátumu.
function ymdOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Zostaví a rozošle denný súhrn všetkým používateľom s e-mailom. Vráti { sent, skipped, errors }.
async function runTaskDigest({ appUrl } = {}) {
  const users = await User.find({ active: true, email: { $exists: true, $ne: '' } }).lean();
  const todayKey = ymdOffset(0), tomorrowKey = ymdOffset(1);
  let sent = 0, skipped = 0;
  const errors = [];
  for (const u of users) {
    try {
      const tasks = await Task.find({ user: u._id, done: false, status: { $ne: 'cancelled' }, due: { $ne: null } }).lean();
      const overdue = tasks.filter(t => String(t.due).slice(0, 10) < todayKey);
      const today = tasks.filter(t => String(t.due).slice(0, 10) === todayKey);
      const tomorrow = tasks.filter(t => String(t.due).slice(0, 10) === tomorrowKey);
      if (!overdue.length && !today.length && !tomorrow.length) { skipped++; continue; }
      const { subject, html, text } = mailer.taskDigestEmail({ name: u.name || u.username, appUrl, overdue, today, tomorrow });
      const r = await mailer.sendMail({ to: u.email, subject, html, text });
      if (r.sent) sent++; else errors.push({ user: u.username, error: r.error });
    } catch (e) { errors.push({ user: u.username, error: e.message }); }
  }
  return { sent, skipped, errors };
}

module.exports = { runTaskDigest };
