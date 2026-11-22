// Pure-logic tests (no browser). Run by CI before every build.
import { OCCASIONS } from '../www/js/data/occasions.js';
import { templatesFor, templateCount, findTemplate } from '../www/js/templates/registry.js';
import { zipStore, unzip } from '../www/js/io/zip.js';
import { parseCSV, toCSV, fillTokens, formatDate } from '../www/js/core/util.js';
import { newEvent, newGuest, stats, inviteURL, decodeInvite, replyCode, applyReplies, buildICS } from '../www/js/logic/guests.js';
import { tableFromRows, guessMapping } from '../www/js/io/sheet.js';
import { textSuggestions } from '../www/js/logic/suggest.js';
let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.error('FAIL:', m); } else console.log('ok  :', m); };

ok(OCCASIONS.length >= 60, `occasions >= 60 (${OCCASIONS.length})`);
ok(OCCASIONS.every((o) => templatesFor(o.id).length >= 20), 'every occasion has >= 20 templates');
ok(OCCASIONS.every((o) => new Set(templatesFor(o.id).map((t) => t.style)).size >= 10), 'every occasion spans >= 10 distinct styles (mourning occasions skip festive styles)');
ok(templateCount() >= 1200, `total templates ${templateCount()}`);
ok(findTemplate(templatesFor('wedding')[0].id)?.occ === 'wedding', 'findTemplate round-trip');

const zip = zipStore([{ name: 'a.txt', data: new TextEncoder().encode('hello') }, { name: 'b/ü.txt', data: new TextEncoder().encode('world') }]);
const m = await unzip(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));
ok(new TextDecoder().decode(m.get('a.txt')) === 'hello' && m.size === 2, 'zip write/read');

const rows = parseCSV('name,phone\n"Ali, Jr",0912\nسارا,0935\n');
ok(rows.length === 3 && rows[1][0] === 'Ali, Jr' && rows[2][0] === 'سارا', 'csv parse quotes/unicode');
ok(parseCSV(toCSV(rows).replace('﻿', '')).length === 3, 'csv round-trip');
const tb = tableFromRows(rows); ok(tb.headers[0] === 'name' && tb.rows.length === 2 && guessMapping(tb.headers).guest === 0, 'table + mapping');

ok(fillTokens('A {x} B', { x: 'q' }) === 'A q B', 'fillTokens');
ok(formatDate('2027-03-21', 'fa', 'persian').includes('۱۴۰۶') || formatDate('2027-03-21', 'fa', 'persian').includes('1406'), 'persian calendar');

const ev = newEvent({ name: 'T' }); const g = newGuest({ name: 'Ali' }); ev.guests.push(g);
const url = inviteURL('https://x.io/invite/', ev, { data: { title: 'عروسی', venue: 'تالار' }, pal: {}, lang: 'fa' }, g);
const dec = decodeInvite(url.split('#')[1]);
ok(dec?.t === 'عروسی' && dec.g === g.id && dec.e === ev.id, 'invite link encode/decode');
const code = replyCode(ev.id, g.id, true, 2); const r = applyReplies(ev, 'x ' + code + ' y');
ok(r.applied === 1 && g.status === 'confirmed' && g.plus === 2 && stats(ev).headcount === 3, 'reply code applies');
ok(applyReplies(ev, 'CS1-other-' + g.id + '-n-0').unknown === 1, 'foreign reply rejected');
ok(buildICS({ title: 'T', dateISO: '2027-01-02', timeStart: '19:00' }).includes('DTSTART:20270102T190000'), 'ics');
ok(textSuggestions('birthday', 'fa').length >= 3 && textSuggestions('wedding', 'de').length >= 3, 'text suggestions');

if (failed) process.exit(1);
console.log('all passed');
