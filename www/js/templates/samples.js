// Sample data shown in template previews until the user fills in the real form. Order: [fa, en, ar, tr, ru, fr, de]
import { LANG_INDEX } from '../data/occasions.js';
const L = (s) => s.split('|');
const S = {
  couple: L('سارا و علی|Sara & Ali|سارة وعلي|Sara & Ali|Сара и Али|Sara & Ali|Sara & Ali'),
  honoree: L('مریم|Maryam|مريم|Meryem|Мария|Marie|Maria'),
  host: L('خانواده احمدی|The Ahmadi Family|عائلة أحمد|Ahmet Ailesi|Семья Ивановых|La famille Martin|Familie Müller'),
  venue: L('تالار نمونه|Grand Hall|قاعة المثال|Örnek Salon|Банкетный зал|Salle des fêtes|Festsaal'),
  address: L('خیابان نمونه، پلاک ۱۲|12 Example Street|شارع المثال 12|Örnek Cd. No:12|ул. Примерная, 12|12 rue Exemple|Beispielstr. 12'),
  company: L('شرکت نمونه|Sample Co.|شركة المثال|Örnek A.Ş.|ООО «Пример»|Exemple SAS|Beispiel GmbH'),
  job: L('مدیر عامل|Chief Executive|المدير التنفيذي|Genel Müdür|Генеральный директор|Directeur général|Geschäftsführer'),
  guest: L('مهمان گرامی|Dear Guest|الضيف الكريم|Değerli Misafir|Дорогой гость|Cher invité|Lieber Gast'),
};
const COUPLE_OCC = new Set(['wedding', 'engagement', 'aghd', 'anniversary', 'meetAnniversary', 'romantic', 'spouseBirthday']);
const PERSON_OCC = new Set(['birthday', 'kidBirthday', 'birthdayParty', 'graduation', 'gradParty', 'retirement', 'newborn', 'babyShower', 'genderReveal', 'promotion', 'success', 'mothersDay', 'fathersDay', 'daughtersDay', 'sonsDay', 'childrensDay', 'memorial', 'condolence', 'sympathy', 'friendship']);

function plusDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

export function sampleData(occ, lang) {
  const i = LANG_INDEX[lang] ?? 1, g = (k) => S[k][i];
  const k = occ?.k || 'greet', id = occ?.id || '';
  const d = {};
  if (COUPLE_OCC.has(id)) d.couple = g('couple');
  else if (PERSON_OCC.has(id)) d.honoree = g('honoree');
  if (k === 'invite') {
    d.dateISO = plusDays(30); d.timeStart = '19:00'; d.timeEnd = '22:00'; d.venue = g('venue'); d.address = g('address'); d.phone = '09120000000'; d.host = g('host');
    if (occ.g === 'business') { d.company = g('company'); delete d.host; }
  }
  if (k === 'brand') { d.company = g('company'); d.honoree = g('honoree'); d.title = g('job'); d.phone = '+98 21 0000 0000'; d.email = 'info@example.com'; d.address = g('address'); }
  if (k === 'greet' || k === 'love' || k === 'thanks') d.inviter = '';
  return d;
}
