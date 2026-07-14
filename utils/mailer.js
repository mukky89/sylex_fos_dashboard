/**
 * Odosielanie e-mailov cez SMTP (nodemailer).
 * Konfigurácia cez env premenné (nastav na Railway):
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ('true' pre 465),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (napr. "FOS Dashboard <no-reply@sylex.sk>")
 *   APP_URL (verejná adresa appky, napr. https://fos.sylex.sk) — pre odkazy v mailoch
 *
 * Ak SMTP nie je nakonfigurované, appka funguje ďalej — odkaz na overenie sa
 * vráti do UI (admin ho môže skopírovať a poslať ručne). Nič nespadne.
 */
const nodemailer = require('nodemailer');

let _transport = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport() {
  if (!isConfigured()) return null;
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return _transport;
}

function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@sylex.sk';
}

// Verejná adresa appky — z env alebo z requestu (fallback).
function baseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  if (req) {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host) return `${proto}://${host}`;
  }
  return '';
}

// Odošle e-mail. Vráti { sent: bool, error?: string }.
async function sendMail({ to, subject, html, text }) {
  const t = transport();
  if (!t) return { sent: false, error: 'SMTP nie je nakonfigurované' };
  try {
    await t.sendMail({ from: fromAddress(), to, subject, html, text: text || undefined });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message };
  }
}

// Šablóna overovacieho e-mailu (jednoduchý brandovaný HTML).
function verificationEmail({ name, verifyUrl }) {
  const who = name ? `Ahoj ${name},` : 'Ahoj,';
  return {
    subject: 'Overenie e-mailu — FOS Dashboard',
    text: `${who}\n\nPotvrď svoj e-mail otvorením odkazu:\n${verifyUrl}\n\nOdkaz je platný 24 hodín.\n\nFOS Dashboard · SYLEX`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
  <div style="background:#0d1225;color:#f0f9ff;padding:22px 26px;border-radius:12px 12px 0 0">
    <div style="font-size:1.3rem;font-weight:800;letter-spacing:.02em">FOS <span style="color:#67e8f9">Dashboard</span></div>
    <div style="font-size:.8rem;color:#94a3b8;margin-top:2px">SYLEX · Fiber Optics</div>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 26px">
    <p style="margin:0 0 14px">${who}</p>
    <p style="margin:0 0 18px">tvoj účet bol vytvorený. Prosím potvrď svoju e-mailovú adresu kliknutím na tlačidlo nižšie:</p>
    <p style="margin:0 0 22px"><a href="${verifyUrl}" style="display:inline-block;background:#0891b2;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:700">Overiť e-mail</a></p>
    <p style="margin:0 0 6px;font-size:.82rem;color:#64748b">Ak tlačidlo nefunguje, skopíruj tento odkaz do prehliadača:</p>
    <p style="margin:0 0 18px;font-size:.8rem;word-break:break-all"><a href="${verifyUrl}" style="color:#0891b2">${verifyUrl}</a></p>
    <p style="margin:0;font-size:.78rem;color:#94a3b8">Odkaz je platný 24 hodín. Ak si účet nevytváral(a) ty, tento e-mail ignoruj.</p>
  </div>
</div>`
  };
}

module.exports = { isConfigured, sendMail, verificationEmail, baseUrl };
