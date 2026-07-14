/**
 * Odosielanie e-mailov cez Brevo (Sendinblue).
 * Rovnaký prístup ako repozitár DBFOOD:
 *   - ak je nastavený BREVO_API_KEY → odosielame cez Brevo HTTP API (HTTPS/443),
 *     funguje aj tam, kde je SMTP blokovaný (napr. Railway),
 *   - inak fallback na SMTP cez nodemailer (smtp-relay.brevo.com).
 *
 * Env premenné (nastavené na Railway podľa DBFOOD):
 *   BREVO_API_KEY   — API kľúč Brevo (preferovaná cesta cez HTTP API)
 *   EMAIL_SENDER    — overená adresa odosielateľa (napr. no-reply@sylex.sk)
 *   SMTP_HOST       — default smtp-relay.brevo.com
 *   SMTP_PORT       — default 587
 *   SMTP_USER       — SMTP login (fallback: EMAIL_SENDER)
 *   EMAIL_PASSWORD  — SMTP heslo / kľúč (fallback: BREVO_API_KEY)
 *   APP_URL         — verejná adresa appky pre odkazy v mailoch
 */
const nodemailer = require('nodemailer');

const SENDER_NAME = 'FOS Dashboard';

function senderEmail() {
  return process.env.EMAIL_SENDER || process.env.SMTP_FROM || process.env.SMTP_USER || '';
}

function smtpPass() {
  return process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.BREVO_API_KEY || '';
}

// Máme dostatok konfigurácie na odoslanie mailu?
function isConfigured() {
  if (process.env.BREVO_API_KEY && senderEmail()) return true;
  if ((process.env.SMTP_HOST || process.env.BREVO_API_KEY) && senderEmail() && smtpPass()) return true;
  return false;
}

let _transport = null;
function transport() {
  if (_transport) return _transport;
  const port = Number(process.env.SMTP_PORT) || 587;
  _transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER || senderEmail(), pass: smtpPass() }
  });
  return _transport;
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

// Odoslanie cez Brevo HTTP API (natívny fetch — bez ďalšej závislosti).
async function sendViaBrevoApi({ to, subject, html, text }) {
  const payload = {
    sender: { name: SENDER_NAME, email: senderEmail() },
    to: [{ email: to }],
    subject
  };
  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { sent: false, error: `Brevo API ${res.status}: ${body.slice(0, 300)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message };
  } finally { clearTimeout(t); }
}

// Zjednotené odoslanie mailu. Vráti { sent: bool, error?: string }.
async function sendMail({ to, subject, html, text }) {
  if (!to) return { sent: false, error: 'Chýba príjemca' };
  if (!isConfigured()) return { sent: false, error: 'E-mail (Brevo/SMTP) nie je nakonfigurovaný' };

  // Preferuj Brevo HTTP API (funguje aj keď je SMTP blokovaný)
  if (process.env.BREVO_API_KEY && senderEmail()) {
    const r = await sendViaBrevoApi({ to, subject, html, text });
    if (r.sent) return r;
    // ak API zlyhá a máme SMTP heslo, skús fallback
    if (!smtpPass()) return r;
  }

  // Fallback: SMTP cez nodemailer
  try {
    await transport().sendMail({
      from: `"${SENDER_NAME}" <${senderEmail()}>`,
      to, subject, html, text: text || undefined
    });
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
