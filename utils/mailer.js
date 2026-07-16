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
const https = require('https');

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

// Odoslanie cez Brevo HTTP API. Používa vstavaný modul `https`, aby to fungovalo
// na každej verzii Node (nie je závislé od globálneho `fetch`).
function sendViaBrevoApi({ to, subject, html, text }) {
  const payload = {
    sender: { name: SENDER_NAME, email: senderEmail() },
    to: [{ email: to }],
    subject
  };
  if (html) payload.htmlContent = html;
  if (text) payload.textContent = text;
  const body = JSON.stringify(payload);

  return new Promise(resolve => {
    const req = https.request({
      method: 'POST',
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 20000
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ sent: true });
        else resolve({ sent: false, error: `Brevo API ${res.statusCode}: ${String(data).slice(0, 300)}` });
      });
    });
    req.on('error', e => resolve({ sent: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ sent: false, error: 'Brevo API timeout (20s)' }); });
    req.write(body);
    req.end();
  });
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

// Escape textu, ktorý vkladáme do HTML (ochrana proti rozbitiu šablóny / injektáži).
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Šablóna overovacieho e-mailu.
// Table-based, inline štýly, bulletproof CTA (vrátane VML pre Outlook),
// preheader a responzívne správanie — aby vyzeral rovnako v Gmaile aj Outlooku.
function verificationEmail({ name, verifyUrl, logoUrl }) {
  const who = name ? `Ahoj ${esc(name)},` : 'Ahoj,';
  const url = esc(verifyUrl);
  const preheader = 'Potvrď svoju e-mailovú adresu a aktivuj prístup do FOS Dashboardu.';
  // Logo SYLEX vpravo v hlavičke — cez absolútnu URL (obrázky v maile potrebujú hostovanú adresu).
  // Ak nepoznáme verejnú adresu appky, ponecháme textový fallback „SYLEX".
  const brandCell = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="SYLEX" height="30" style="display:block;height:30px;width:auto;border:0;outline:none;text-decoration:none;">`
    : `SYLEX`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Overenie e-mailu — FOS Dashboard</title>
<!--[if mso]><style>*{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;line-height:100%;outline:none;text-decoration:none}
  body{margin:0!important;padding:0!important;width:100%!important}
  a{color:#0e7490}
  @media only screen and (max-width:600px){
    .container{width:100%!important}
    .px{padding-left:24px!important;padding-right:24px!important}
    .btn a{display:block!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#eef2f7;">${esc(preheader)}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(13,18,37,.10);">

          <!-- Header -->
          <tr>
            <td style="background:#0d1225;background:linear-gradient(135deg,#0d1225 0%,#122043 100%);padding:30px 40px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:.3px;color:#f0f9ff;">
                    FOS&nbsp;<span style="color:#67e8f9;">Dashboard</span>
                  </td>
                  <td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">
                    ${brandCell}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent line -->
          <tr><td style="height:4px;line-height:4px;font-size:0;background:#22d3ee;background:linear-gradient(90deg,#22d3ee,#0891b2);">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:38px 40px 8px;font-family:Arial,Helvetica,sans-serif;color:#1e293b;" class="px">
              <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">${who}</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#475569;">
                tvoj účet vo <strong style="color:#0f172a;">FOS Dashboarde</strong> bol vytvorený.
                Ostáva už len jeden krok — potvrď, že tento e-mail patrí tebe.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:24px 40px 12px;" class="px">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:260px;" arcsize="16%" strokecolor="#0891b2" fillcolor="#0891b2">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Overiť e-mail</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:10px;background:#0891b2;background:linear-gradient(135deg,#0891b2,#0e7490);box-shadow:0 6px 16px rgba(8,145,178,.35);">
                    <a href="${url}" style="display:inline-block;padding:15px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Overiť e-mail</a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:16px 40px 8px;font-family:Arial,Helvetica,sans-serif;" class="px">
              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Ak tlačidlo nefunguje, skopíruj tento odkaz do prehliadača:</p>
              <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;">
                <a href="${url}" style="color:#0e7490;text-decoration:underline;">${url}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:24px 40px 0;" class="px"><div style="border-top:1px solid #e2e8f0;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

          <!-- Note -->
          <tr>
            <td style="padding:16px 40px 34px;font-family:Arial,Helvetica,sans-serif;" class="px">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                🔒 Odkaz je platný <strong style="color:#64748b;">24 hodín</strong>.
                Ak si účet nevytváral(a) ty, tento e-mail pokojne ignoruj — nič sa nestane.
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;">
          <tr>
            <td align="center" style="padding:20px 40px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#94a3b8;">
              FOS Dashboard · SYLEX Fiber Optics<br>
              Táto správa bola odoslaná automaticky, prosím neodpovedaj na ňu.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: 'Overenie e-mailu — FOS Dashboard',
    text: `${name ? `Ahoj ${name},` : 'Ahoj,'}\n\n`
      + `tvoj účet vo FOS Dashboarde bol vytvorený. Potvrď svoju e-mailovú adresu otvorením odkazu:\n\n`
      + `${verifyUrl}\n\n`
      + `Odkaz je platný 24 hodín. Ak si účet nevytváral(a) ty, tento e-mail ignoruj.\n\n`
      + `FOS Dashboard · SYLEX Fiber Optics`,
    html
  };
}

// Formát dátumu D.M.YYYY zo stringu 'YYYY-MM-DD' alebo Date.
function fmtDate(d) {
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-');
  return y && m && day ? `${Number(day)}.${Number(m)}.${y}` : s;
}

const PRIO_LABEL = { low: 'Nízka', normal: 'Normálna', high: 'Vysoká', critical: 'Kritická' };
const PRIO_COLOR = { low: '#64748b', normal: '#3b82f6', high: '#ef4444', critical: '#b91c1c' };

// Jeden riadok úlohy v denníku e-mailu — farebná bodka podľa priority + názov (+ termín pri zmeškaných).
function digestTaskRow(t, showDue) {
  const color = PRIO_COLOR[t.priority] || PRIO_COLOR.normal;
  const prio = PRIO_LABEL[t.priority] || PRIO_LABEL.normal;
  const meta = [t.project, t.customer].filter(Boolean).map(esc).join(' · ');
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #eef1f5;width:10px;vertical-align:top;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-top:6px;"></span>
    </td>
    <td style="padding:9px 0 9px 10px;border-bottom:1px solid #eef1f5;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:14px;font-weight:700;color:#0f172a;">${esc(t.title)}</div>
      ${meta ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${meta}</div>` : ''}
    </td>
    <td style="padding:9px 0;border-bottom:1px solid #eef1f5;text-align:right;white-space:nowrap;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
      ${showDue && t.due ? `<div style="font-size:12px;font-weight:700;color:#dc2626;">${esc(fmtDate(t.due))}</div>` : ''}
      <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:.03em;">${esc(prio)}</div>
    </td>
  </tr>`;
}

// Sekcia s nadpisom (farba podľa naliehavosti) + zoznam úloh alebo prázdny stav.
function digestSection(label, color, tasks, showDue) {
  const rows = tasks.length
    ? tasks.map(t => digestTaskRow(t, showDue)).join('')
    : `<tr><td colspan="3" style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;">Žiadne úlohy.</td></tr>`;
  return `
  <tr>
    <td style="padding:22px 40px 4px;" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${color};padding-bottom:6px;">${esc(label)} <span style="color:#94a3b8;font-weight:700;">(${tasks.length})</span></td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td>
  </tr>`;
}

// Denný súhrn úloh — zmeškané / dnes / zajtra. Rovnaký vizuálny jazyk ako verifikačný e-mail.
function taskDigestEmail({ name, appUrl, overdue = [], today = [], tomorrow = [] }) {
  const who = name ? `Ahoj ${esc(name)},` : 'Ahoj,';
  const total = overdue.length + today.length + tomorrow.length;
  const preheader = overdue.length
    ? `Máš ${overdue.length} zmeškaných úloh a ${today.length} na dnes.`
    : `Na dnes máš ${today.length} úloh, na zajtra ${tomorrow.length}.`;
  const url = appUrl ? `${appUrl.replace(/\/+$/, '')}/#tasks` : '';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Denný súhrn úloh — FOS Dashboard</title>
<!--[if mso]><style>*{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;line-height:100%;outline:none;text-decoration:none}
  body{margin:0!important;padding:0!important;width:100%!important}
  a{color:#0e7490}
  @media only screen and (max-width:600px){ .container{width:100%!important} .px{padding-left:24px!important;padding-right:24px!important} .btn a{display:block!important} }
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#eef2f7;">${esc(preheader)}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(13,18,37,.10);">

          <!-- Header -->
          <tr>
            <td style="background:#0d1225;background:linear-gradient(135deg,#0d1225 0%,#122043 100%);padding:30px 40px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:.3px;color:#f0f9ff;">FOS&nbsp;<span style="color:#67e8f9;">Dashboard</span></td>
                  <td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Denný súhrn</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:4px;line-height:4px;font-size:0;background:#22d3ee;background:linear-gradient(90deg,#22d3ee,#0891b2);">&nbsp;</td></tr>

          <!-- Body intro -->
          <tr>
            <td style="padding:32px 40px 4px;font-family:Arial,Helvetica,sans-serif;color:#1e293b;" class="px">
              <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#0f172a;">${who}</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
                ${total ? `tu je tvoj prehľad <strong style="color:#0f172a;">${esc(total)} úloh</strong>, ktoré potrebujú pozornosť.` : 'na dnes ani zajtra nemáš žiadne úlohy s termínom. 🎉'}
              </p>
            </td>
          </tr>

          ${overdue.length ? digestSection('Zmeškané', '#dc2626', overdue, true) : ''}
          ${digestSection('Dnes', '#0891b2', today, false)}
          ${digestSection('Zajtra', '#64748b', tomorrow, false)}

          <!-- CTA -->
          ${url ? `<tr>
            <td align="center" style="padding:26px 40px 8px;" class="px">
              <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr><td align="center" style="border-radius:10px;background:#0891b2;background:linear-gradient(135deg,#0891b2,#0e7490);box-shadow:0 6px 16px rgba(8,145,178,.35);">
                  <a href="${esc(url)}" style="display:inline-block;padding:14px 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Otvoriť Moje úlohy</a>
                </td></tr>
              </table>
            </td>
          </tr>` : ''}

          <tr><td style="padding:24px 40px 0;" class="px"><div style="border-top:1px solid #e2e8f0;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>
          <tr>
            <td style="padding:16px 40px 34px;font-family:Arial,Helvetica,sans-serif;" class="px">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                Tento denný súhrn dostávaš automaticky z FOS Dashboardu. Zmeniť si ho môžeš v Administrácii (upozornenia).
              </p>
            </td>
          </tr>

        </table>
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;">
          <tr><td align="center" style="padding:20px 40px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#94a3b8;">FOS Dashboard · SYLEX Fiber Optics</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [];
  textLines.push(who.replace(/,$/, ','), '');
  if (overdue.length) { textLines.push(`ZMEŠKANÉ (${overdue.length}):`); overdue.forEach(t => textLines.push(`- ${t.title} (termín ${fmtDate(t.due)})`)); textLines.push(''); }
  textLines.push(`DNES (${today.length}):`); today.forEach(t => textLines.push(`- ${t.title}`)); textLines.push('');
  textLines.push(`ZAJTRA (${tomorrow.length}):`); tomorrow.forEach(t => textLines.push(`- ${t.title}`));
  if (url) { textLines.push('', `Otvoriť Moje úlohy: ${url}`); }

  return {
    subject: overdue.length ? `⚠ ${overdue.length} zmeškaných úloh + dnešný prehľad — FOS Dashboard` : `Dnešný prehľad úloh (${today.length}) — FOS Dashboard`,
    text: textLines.join('\n'),
    html
  };
}

module.exports = { isConfigured, sendMail, verificationEmail, taskDigestEmail, baseUrl };
