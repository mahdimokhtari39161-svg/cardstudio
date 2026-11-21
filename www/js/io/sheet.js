// Guest-list import: CSV / TSV / pasted text / Excel (.xlsx). Returns {headers, rows}.
import { parseCSV, latinDigits } from '../core/util.js';
import { unzip } from './zip.js';

const dec = (b) => new TextDecoder('utf-8').decode(b);
const xmlText = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colIdx = (ref) => { const m = /^([A-Z]+)/.exec(ref); let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

export async function parseXLSX(buf) {
  const files = await unzip(buf);
  const wbRels = files.get('xl/_rels/workbook.xml.rels'), wb = files.get('xl/workbook.xml');
  let sheetPath = 'xl/worksheets/sheet1.xml';
  if (wb && wbRels) {
    const first = /<sheet [^>]*r:id="([^"]+)"/.exec(dec(wb));
    if (first) { const rel = new RegExp(`<Relationship [^>]*Id="${first[1]}"[^>]*>`).exec(dec(wbRels)); const tg = rel && /Target="([^"]+)"/.exec(rel[0]); if (tg) sheetPath = 'xl/' + tg[1].replace(/^\/?(xl\/)?/, ''); }
  }
  const sst = []; const sstFile = files.get('xl/sharedStrings.xml');
  if (sstFile) for (const m of dec(sstFile).matchAll(/<si>([\s\S]*?)<\/si>/g)) sst.push(xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
  const sheet = files.get(sheetPath); if (!sheet) throw new Error('sheet not found');
  const rows = [];
  for (const r of dec(sheet).matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], body = c[2] || '', ref = /r="([A-Z]+\d+)"/.exec(attrs), type = /t="([^"]+)"/.exec(attrs)?.[1];
      let val = '';
      if (type === 's') { const v = /<v>([\s\S]*?)<\/v>/.exec(body); val = v ? sst[+v[1]] ?? '' : ''; }
      else if (type === 'inlineStr') val = xmlText([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''));
      else { const v = /<v>([\s\S]*?)<\/v>/.exec(body); val = v ? xmlText(v[1]) : ''; }
      row[ref ? colIdx(ref[1]) : row.length] = String(val).trim();
    }
    if (row.some((x) => x)) rows.push(Array.from(row, (x) => x ?? ''));
  }
  return rows;
}

export async function readTable(file) {
  const name = (file.name || '').toLowerCase(); let rows;
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) rows = await parseXLSX(await file.arrayBuffer());
  else if (name.endsWith('.xls')) throw new Error('xls-unsupported');
  else rows = parseCSV(await file.text());
  return tableFromRows(rows);
}
export function tableFromRows(rows) {
  rows = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!rows.length) return { headers: [], rows: [] };
  const looksHeader = rows[0].every((c) => c === '' || isNaN(Number(latinDigits(c)))) && rows.length > 1;
  const width = Math.max(...rows.map((r) => r.length));
  const headers = looksHeader ? Array.from({ length: width }, (_, i) => rows[0][i] || `#${i + 1}`) : Array.from({ length: width }, (_, i) => `#${i + 1}`);
  const body = (looksHeader ? rows.slice(1) : rows).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''));
  return { headers, rows: body };
}
export function tableFromPaste(text) { return tableFromRows(parseCSV(text.includes('\n') || text.includes(',') || text.includes('\t') || text.includes(';') ? text : text)); }

// guess which column maps to a card token
const GUESS = { guest: /name|guest|مهمان|نام|اسم|ad|имя|nom|ضیف|اسم/i, title: /title|عنوان|لقب|prefix|titre|titel/i, table: /table|میز|стол/i, phone: /phone|tel|mobile|تلفن|موبایل|شماره|телефон/i, whatsapp: /whats|واتس/i, email: /mail|ایمیل|почта/i, custom: /custom|message|پیام|متن|notes?|توضیح/i };
export function guessMapping(headers) {
  const map = {}; headers.forEach((h, i) => { for (const [k, re] of Object.entries(GUESS)) if (!(k in map) && re.test(h)) { map[k] = i; break; } });
  if (!('guest' in map) && headers.length) map.guest = 0;
  return map;
}
