// Small labels that are printed on cards, per card language. Order: [fa, en, ar, tr, ru, fr, de]
const L = (s) => s.split('|');
export const CARD_LABELS = {
  to: L('برای|To|إلى|Sayın|Для|Pour|Für'),
  from: L('از طرف|From|من|Gönderen|От|De la part de|Von'),
  hostedBy: L('میزبان|Hosted by|يستضيف|Ev sahibi|Организатор|Organisé par|Gastgeber'),
  invitedBy: L('دعوت‌کننده|Invited by|المدعو من|Davet eden|Приглашает|Invité par|Eingeladen von'),
  time: L('ساعت|Time|الساعة|Saat|Время|Heure|Uhrzeit'),
  until: L('تا|until|حتى|–|до|jusqu\'à|bis'),
  venue: L('مکان|Venue|المكان|Mekân|Место|Lieu|Ort'),
  phone: L('تلفن|Tel|هاتف|Tel|Тел.|Tél.|Tel.'),
  whatsapp: L('واتساپ|WhatsApp|واتساب|WhatsApp|WhatsApp|WhatsApp|WhatsApp'),
  email: L('ایمیل|Email|البريد|E-posta|Email|E-mail|E-Mail'),
  dress: L('کد لباس|Dress code|الزي|Kıyafet|Дресс-код|Tenue|Dresscode'),
  rsvp: L('لطفاً تا تاریخ پاسخ دهید|Kindly reply by|يرجى الرد قبل|Lütfen şu tarihe kadar yanıtlayın|Просим ответить до|Réponse souhaitée avant le|Um Antwort bis|'),
  scan: L('اسکن کنید|Scan me|امسح|Tara|Сканируйте|Scannez|Scannen'),
  map: L('موقعیت مکانی|Location|الموقع|Konum|Расположение|Emplacement|Standort'),
  and: L('و|&|و|&|и|&|&'),
};
export const LI = { fa: 0, en: 1, ar: 2, tr: 3, ru: 4, fr: 5, de: 6 };
export const lab = (key, lang) => (CARD_LABELS[key] || [])[LI[lang] ?? 1] || '';
