/**
 * Zostavenie iCalendar pozvánky (METHOD:REQUEST) pre e-mailové pozvánky do Outlooku.
 * Príjemca dostane e-mail s .ics pozvánkou — Outlook ju zobrazí ako meeting
 * s tlačidlami Prijať/Odmietnuť a všetkými detailmi (dátum, čas, účastníci).
 *
 * Časy sa interpretujú ako lokálny čas Europe/Bratislava a prevádzajú na UTC,
 * takže sedia bez ohľadu na časové pásmo servera (Railway beží v UTC).
 */
const TZ = 'Europe/Bratislava';

function pad(n) { return String(n).padStart(2, '0'); }

// O koľko minút je dané časové pásmo pred UTC v danom okamihu (rieši aj letný čas).
function tzOffsetMin(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = dtf.formatToParts(date).reduce((a, x) => (a[x.type] = x.value, a), {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUTC - date.getTime()) / 60000;
}

// Lokálny „nástenný" čas (Bratislava) → UTC Date.
function wallToUtc(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = tzOffsetMin(new Date(guess), TZ);
  return new Date(guess - off * 60000);
}

function utcStamp(dt) {
  return dt.getUTCFullYear() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate())
    + 'T' + pad(dt.getUTCHours()) + pad(dt.getUTCMinutes()) + pad(dt.getUTCSeconds()) + 'Z';
}

// Escapovanie textu podľa RFC 5545.
function icsEsc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Zalomenie riadku na 75 oktetov (RFC 5545), pokračovanie odsadené medzerou.
function fold(line) {
  if (Buffer.byteLength(line, 'utf8') <= 74) return line;
  let out = '', cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, 'utf8') > 73) { out += (out ? '\r\n ' : '') + cur; cur = ''; }
    cur += ch;
  }
  return out + (out ? '\r\n ' : '') + cur;
}

/**
 * Zostaví VCALENDAR (METHOD:REQUEST) string.
 * @param {object} o
 *   uid, title, description, location
 *   date 'YYYY-MM-DD', time 'HH:MM', endDate?, endTime?, allDay?
 *   organizerName, organizerEmail
 *   attendees: [ 'a@b.sk' | { email, name } ]
 *   method (default REQUEST), sequence (default 0), cancel (STATUS:CANCELLED)
 */
function buildInvite(o) {
  const now = utcStamp(new Date());
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SYLEX FOS Dashboard//SK', 'CALSCALE:GREGORIAN',
    'METHOD:' + (o.method || 'REQUEST'),
    'BEGIN:VEVENT',
    'UID:' + (o.uid || (Date.now() + '.' + Math.random().toString(36).slice(2) + '@fos-dashboard')),
    'DTSTAMP:' + now,
    'SEQUENCE:' + (o.sequence || 0)
  ];

  if (o.allDay) {
    const [y, mo, d] = o.date.split('-').map(Number);
    const end = o.endDate || o.date;
    const [ey, emo, ed] = end.split('-').map(Number);
    const endEx = new Date(Date.UTC(ey, emo - 1, ed + 1)); // DTEND je exkluzívny
    lines.push('DTSTART;VALUE=DATE:' + `${y}${pad(mo)}${pad(d)}`);
    lines.push('DTEND;VALUE=DATE:' + `${endEx.getUTCFullYear()}${pad(endEx.getUTCMonth() + 1)}${pad(endEx.getUTCDate())}`);
  } else {
    const [y, mo, d] = o.date.split('-').map(Number);
    const [h, mi] = (o.time || '09:00').split(':').map(Number);
    const startUtc = wallToUtc(y, mo, d, h, mi);
    let endUtc;
    if (!o.endTime) {
      endUtc = new Date(startUtc.getTime() + 3600000);
    } else {
      const ed = o.endDate || o.date;
      const [ey, emo, edd] = ed.split('-').map(Number);
      const [eh, emi] = o.endTime.split(':').map(Number);
      endUtc = wallToUtc(ey, emo, edd, eh, emi);
      if (endUtc <= startUtc) endUtc = new Date(startUtc.getTime() + 3600000);
    }
    lines.push('DTSTART:' + utcStamp(startUtc));
    lines.push('DTEND:' + utcStamp(endUtc));
  }

  lines.push(fold('SUMMARY:' + icsEsc(o.title)));
  if (o.description) lines.push(fold('DESCRIPTION:' + icsEsc(o.description)));
  if (o.location) lines.push(fold('LOCATION:' + icsEsc(o.location)));
  lines.push(fold(`ORGANIZER;CN=${icsEsc(o.organizerName || 'FOS Dashboard')}:mailto:${o.organizerEmail}`));
  (o.attendees || []).forEach(a => {
    const em = typeof a === 'string' ? a : (a && a.email);
    if (!em) return;
    const cn = (a && typeof a === 'object' && a.name) ? a.name : em;
    lines.push(fold(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${icsEsc(cn)}:mailto:${em}`));
  });
  lines.push('STATUS:' + (o.cancel ? 'CANCELLED' : 'CONFIRMED'));
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

module.exports = { buildInvite };
