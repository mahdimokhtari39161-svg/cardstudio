// Pure helpers (no DOM) – also used by node tests.
export const uid = (p = 'e') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function rng(seed) {
  let a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- colour
export function hex2rgb(h) {
  h = String(h || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const lighten = (c, t) => mix(c, '#ffffff', t);
export const darken = (c, t) => mix(c, '#000000', t);
export function alpha(c, a) { const [r, g, b] = hex2rgb(c); return `rgba(${r},${g},${b},${a})`; }
export function luminance(c) { const [r, g, b] = hex2rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
export const readable = (bg, light = '#ffffff', dark = '#111111') => (luminance(bg) > 0.58 ? dark : light);

// ---- text / language
export const RTL_LANGS = ['fa', 'ar'];
export const isRTLText = (s) => /[֐-ࣿיִ-﷿ﹰ-﻿]/.test(s || '');
export const hasArabicScript = isRTLText;

export function localizeDigits(str, lang) {
  str = String(str ?? '');
  if (lang === 'fa') return str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  if (lang === 'ar') return str.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  return str;
}
export function latinDigits(str) {
  return String(str ?? '')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

const LOCALES = {
  fa: { persian: 'fa-IR-u-ca-persian', gregorian: 'fa-IR-u-ca-gregory', islamic: 'fa-IR-u-ca-islamic-umalqura' },
  ar: { gregorian: 'ar-EG-u-ca-gregory', islamic: 'ar-SA-u-ca-islamic-umalqura', persian: 'ar-EG-u-ca-persian' },
  en: { gregorian: 'en-GB', islamic: 'en-u-ca-islamic-umalqura', persian: 'en-u-ca-persian' },
  tr: { gregorian: 'tr-TR', islamic: 'tr-TR-u-ca-islamic-umalqura', persian: 'tr-TR-u-ca-persian' },
  ru: { gregorian: 'ru-RU', islamic: 'ru-RU-u-ca-islamic-umalqura', persian: 'ru-RU-u-ca-persian' },
  fr: { gregorian: 'fr-FR', islamic: 'fr-FR-u-ca-islamic-umalqura', persian: 'fr-FR-u-ca-persian' },
  de: { gregorian: 'de-DE', islamic: 'de-DE-u-ca-islamic-umalqura', persian: 'de-DE-u-ca-persian' },
};
export function defaultCalendar(lang) { return lang === 'fa' ? 'persian' : 'gregorian'; }

export function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
}
export function formatDate(iso, lang = 'fa', calendar) {
  const d = parseISO(iso);
  if (!d) return '';
  const cal = calendar || defaultCalendar(lang);
  const loc = (LOCALES[lang] || LOCALES.en)[cal] || LOCALES.en.gregorian;
  try {
    return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  } catch { return iso; }
}
export function weekdayName(iso, lang = 'fa') {
  const d = parseISO(iso);
  if (!d) return '';
  const loc = (LOCALES[lang] || LOCALES.en).gregorian;
  try { return new Intl.DateTimeFormat(loc, { weekday: 'long', timeZone: 'UTC' }).format(d); } catch { return ''; }
}
export function formatTime(hhmm, lang = 'fa') {
  if (!hhmm) return '';
  return localizeDigits(hhmm, lang);
}

// ---- template tokens: {host} … ; lines whose tokens are all empty are dropped
export function fillTokens(tpl, data) {
  const lines = String(tpl ?? '').split('\n');
  const out = [];
  for (const line of lines) {
    const toks = [...line.matchAll(/\{(\w+)\}/g)];
    if (!toks.length) { out.push(line); continue; }
    const vals = toks.map((m) => String(data[m[1]] ?? '').trim());
    if (vals.every((v) => !v)) continue;
    out.push(line.replace(/\{(\w+)\}/g, (_, k) => String(data[k] ?? '').trim()).replace(/\s{2,}/g, ' ').trim());
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
export const hasTokens = (s) => /\{\w+\}/.test(s || '');

// ---- csv
export function parseCSV(text) {
  text = String(text || '').replace(/^﻿/, '');
  const first = text.split('\n')[0] || '';
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}
export function toCSV(rows) {
  const esc = (v) => { v = String(v ?? ''); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export function slug(s) {
  return String(s || 'card').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 60) || 'card';
}
export function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
