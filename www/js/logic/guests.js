// Events, guest lists, personal invite links, reply codes and calendar files.
import { uid } from '../core/util.js';

export const STATUS = ['invited', 'confirmed', 'declined'];
export function newEvent(o = {}) { return { id: uid('ev'), name: o.name || '', cardId: o.cardId || '', lang: o.lang || 'fa', dateISO: '', timeStart: '', timeEnd: '', venue: '', address: '', map: '', host: '', phone: '', whatsapp: '', dress: '', notes: '', guests: [], createdAt: Date.now(), updatedAt: Date.now(), ...o }; }
export function newGuest(o = {}) { return { id: uid('g').slice(0, 9), name: '', title: '', phone: '', email: '', status: 'invited', plus: 0, note: '', table: '', sentAt: 0, ...o }; }
export function stats(ev) {
  const g = ev.guests || [], c = g.filter((x) => x.status === 'confirmed');
  return { total: g.length, invited: g.filter((x) => x.status === 'invited').length, confirmed: c.length, declined: g.filter((x) => x.status === 'declined').length, headcount: c.reduce((a, x) => a + 1 + (+x.plus || 0), 0) };
}

const b64u = {
  enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
};
// Public link to the static invitation page. All event data travels in the URL fragment (never sent to a server).
export function inviteURL(base, ev, card, guest) {
  const d = card?.data || {};
  const pal = card?.pal || {};
  const payload = {
    v: 1, e: ev.id, l: ev.lang || card?.lang || 'fa', t: d.title || ev.name || '', n: d.couple || d.honoree || '', h: d.host || d.inviter || ev.host || '',
    d: d.dateISO || ev.dateISO || '', s: d.timeStart || ev.timeStart || '', f: d.timeEnd || ev.timeEnd || '', ve: d.venue || ev.venue || '', a: d.address || ev.address || '', m: d.map || ev.map || '',
    p: d.phone || ev.phone || '', w: d.whatsapp || ev.whatsapp || '', dr: d.dress || ev.dress || '', no: d.notes || ev.notes || '', cal: card?.calendar || '', c: [pal.a || '#c9a24a', pal.d || '#14213d', pal.l || '#fbf6ea'], wh: ev.webhook || '',
  };
  if (guest) { payload.g = guest.id; payload.gn = guest.name; }
  return `${base.replace(/#.*$/, '')}#${b64u.enc(JSON.stringify(payload))}`;
}
export const decodeInvite = (hash) => { try { return JSON.parse(b64u.dec(String(hash).replace(/^#/, ''))); } catch { return null; } };

// Reply code produced by the invitation page: CS1-<event>-<guest>-<y|n>-<plus>
export const replyCode = (eventId, guestId, yes, plus = 0) => `CS1-${eventId}-${guestId}-${yes ? 'y' : 'n'}-${+plus || 0}`;
export function applyReplies(ev, text) {
  const re = /CS1-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([yn])-(\d+)/g; let m, n = 0, unknown = 0;
  while ((m = re.exec(String(text || '')))) {
    if (m[1] !== ev.id) { unknown++; continue; }
    const g = ev.guests.find((x) => x.id === m[2]); if (!g) { unknown++; continue; }
    g.status = m[3] === 'y' ? 'confirmed' : 'declined'; g.plus = m[3] === 'y' ? +m[4] : 0; n++;
  }
  return { applied: n, unknown };
}

function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
export function buildICS({ title, dateISO, timeStart, timeEnd, venue, address, notes, url }) {
  if (!dateISO) return '';
  const d = dateISO.replace(/-/g, ''), hm = (t) => (t || '').replace(':', '') + '00';
  const allDay = !timeStart, endTime = timeEnd || (timeStart ? String((+timeStart.slice(0, 2) + 2) % 24).padStart(2, '0') + timeStart.slice(2) : '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CardStudio//EN', 'BEGIN:VEVENT', `UID:${uid('ics')}@cardstudio`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `SUMMARY:${icsEsc(title)}`];
  if (allDay) { const nx = new Date(dateISO + 'T12:00:00Z'); nx.setUTCDate(nx.getUTCDate() + 1); lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nx.toISOString().slice(0, 10).replace(/-/g, '')}`); }
  else lines.push(`DTSTART:${d}T${hm(timeStart)}`, `DTEND:${d}T${hm(endTime)}`);
  if (venue || address) lines.push(`LOCATION:${icsEsc([venue, address].filter(Boolean).join(', '))}`);
  if (notes || url) lines.push(`DESCRIPTION:${icsEsc([notes, url].filter(Boolean).join('\n'))}`);
  lines.push('END:VEVENT', 'END:VCALENDAR'); return lines.join('\r\n');
}
