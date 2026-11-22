// Offline text suggestions + smart multi-design suggestions. Optional online AI hook (OpenAI-compatible endpoint).
import { occById, occName } from '../data/occasions.js';
import { templatesFor, buildSpec, occTags, paletteKeyFor } from '../templates/registry.js';
import { STYLES } from '../templates/styles.js';
import { PALETTES, PALETTE_NAMES } from '../data/palettes.js';
import { LANG_I } from '../data/texts.js';
import { hashStr } from '../core/util.js';

export const TONES = ['formal', 'friendly', 'romantic', 'short', 'literary', 'religious', 'luxury'];
export const TONE_LABEL = { formal: ['رسمی', 'Formal'], friendly: ['دوستانه', 'Friendly'], romantic: ['عاشقانه', 'Romantic'], short: ['کوتاه', 'Short'], literary: ['ادبی', 'Literary'], religious: ['مذهبی', 'Religious'], luxury: ['لوکس و تشریفاتی', 'Luxury & ceremonial'] };
const L = (s) => s.split('|');
// [fa, en, ar, tr, ru, fr, de] – {occ} is replaced by the occasion name in the card language
const T = {
  invite: {
    formal: L('با کمال احترام، از شما دعوت می‌شود در مراسم {occ} حضور به هم رسانید. قدوم شما مایه مباهات خواهد بود.|We cordially request the pleasure of your company at {occ}. Your presence will be greatly appreciated.|يتشرف بدعوتكم لحضور {occ}، ويسعدنا تشريفكم بالحضور.|{occ} için sizleri aramızda görmekten onur duyarız. Katılımınız bizi çok mutlu edecektir.|Имеем честь пригласить Вас на {occ}. Ваше присутствие будет для нас большой радостью.|Nous avons l’honneur de vous convier à {occ}. Votre présence nous sera précieuse.|Wir laden Sie herzlich zu {occ} ein. Ihre Anwesenheit wäre uns eine große Ehre.'),
    friendly: L('{occ} داریم و بدون تو کامل نمی‌شه! بیا کنارمون خوش بگذرونیم.|We’re celebrating {occ} and it wouldn’t be the same without you! Come join the fun.|نحتفل بـ {occ} ولن يكتمل الفرح بدونك! تعال وشاركنا.|{occ} var ve sensiz olmaz! Gel, birlikte eğlenelim.|У нас {occ}, и без тебя никак! Приходи веселиться вместе с нами.|On fête {occ} et ce ne serait pas pareil sans toi ! Viens nous rejoindre.|Wir feiern {occ} – ohne dich wär’s nicht dasselbe! Komm vorbei.'),
    romantic: L('با دلی سرشار از عشق، از شما دعوت می‌کنیم تا در {occ} ما شاهد لحظه‌های ماندگار باشید.|With hearts full of love, we invite you to share this magical moment: {occ}.|بقلوب مليئة بالحب ندعوكم لمشاركتنا لحظات لا تُنسى في {occ}.|Kalbimiz sevgiyle dolu; {occ} anımızda bizimle olmanızı dileriz.|С сердцами, полными любви, приглашаем вас разделить с нами {occ}.|Le cœur plein d’amour, nous vous invitons à partager {occ}.|Mit Liebe im Herzen laden wir Sie zu {occ} ein.'),
    short: L('{occ} – منتظر حضور شما هستیم.|{occ} – we’d love to see you.|{occ} – بانتظاركم.|{occ} – sizi bekleriz.|{occ} – ждём вас.|{occ} – nous comptons sur vous.|{occ} – wir freuen uns auf dich.'),
    literary: L('چون شب‌های آرام و روزهای روشن، حضور شما شادی این بزم را کامل می‌کند؛ به {occ} خوش آمدید.|As lamplight completes the evening, your presence completes the day: welcome to {occ}.|كما يكتمل المساء بنور القناديل، يكتمل يومنا بحضوركم؛ أهلاً بكم في {occ}.|Akşamı ışık tamamlar gibi, gününüzü de sizler tamamlarsınız: {occ} için buyurun.|Как свет завершает вечер, ваше присутствие завершает день: добро пожаловать на {occ}.|Comme la lumière achève la soirée, votre présence achève ce jour : bienvenue à {occ}.|Wie das Licht den Abend vollendet, vollendet Ihre Anwesenheit diesen Tag: willkommen zu {occ}.'),
    religious: L('به نام خداوند بخشنده و مهربان؛ شما را به مجلس {occ} دعوت می‌کنیم. دعای خیر شما همراه ماست.|In the name of God, the Most Gracious, we invite you to {occ}. Your blessings are with us.|بسم الله الرحمن الرحيم، ندعوكم لحضور {occ}، ودعواتكم تصحبنا.|Rahman ve Rahim olan Allah’ın adıyla {occ} için sizleri davet ediyoruz.|Во имя Бога Милостивого, приглашаем вас на {occ}. Ваши молитвы с нами.|Au nom de Dieu, le Clément, nous vous invitons à {occ}. Vos prières nous accompagnent.|Im Namen Gottes, des Barmherzigen, laden wir Sie zu {occ} ein.'),
    luxury: L('محفل پرشکوه {occ} با حضور ارزشمند شما به اوج خواهد رسید. از شما با تشریفات کامل دعوت می‌شود.|An evening of distinction awaits at {occ}. Your esteemed presence is requested with the utmost courtesy.|أمسية فاخرة بانتظاركم في {occ}، وحضوركم الكريم يزيدها بهاءً.|{occ} seçkin bir geceye dönüşecek. Değerli katılımınız büyük bir şeref olacaktır.|Вас ждёт изысканный вечер — {occ}. Ваше присутствие станет украшением события.|Une soirée d’exception vous attend à {occ}. Votre présence distinguée est vivement souhaitée.|Ein Abend von Rang erwartet Sie bei {occ}. Ihre geschätzte Anwesenheit ist uns eine Ehre.'),
  },
  greet: {
    formal: L('مناسبت {occ} را به شما تبریک عرض می‌کنم و از خداوند سلامتی و موفقیت شما را آرزومندم.|Please accept my sincere congratulations on {occ}, with every good wish for your health and success.|أهنئكم بمناسبة {occ} وأتمنى لكم دوام الصحة والتوفيق.|{occ} vesilesiyle en içten tebriklerimi sunar, sağlık ve başarılar dilerim.|Искренне поздравляю Вас с {occ} и желаю здоровья и успехов.|Je vous adresse mes sincères félicitations pour {occ}, avec tous mes vœux de santé et de réussite.|Zu {occ} gratuliere ich Ihnen herzlich und wünsche Ihnen Gesundheit und Erfolg.'),
    friendly: L('{occ} مبارک! امیدوارم پر از خنده، شادی و لحظه‌های خوب باشه.|Happy {occ}! Hope it’s full of laughter, joy and great moments.|{occ} مبارك! أتمنى لك يوماً مليئاً بالضحك والفرح.|{occ} kutlu olsun! Kahkaha ve güzel anlarla dolu olsun.|С {occ}! Пусть будет много смеха, радости и хороших моментов.|Joyeux {occ} ! Que ce jour soit plein de rires et de joie.|Alles Gute zu {occ}! Viel Spaß, Freude und schöne Momente.'),
    romantic: L('{occ} تو را با تمام وجودم جشن می‌گیرم؛ تو دلیل لبخندهای من هستی.|I celebrate {occ} with all my heart – you are the reason I smile.|أحتفل بـ {occ} بكل قلبي، فأنت سبب ابتسامتي.|{occ} günün kutlu olsun; gülüşümün sebebi sensin.|Праздную {occ} всем сердцем — ты причина моей улыбки.|Je fête {occ} de tout mon cœur – tu es la raison de mon sourire.|Ich feiere {occ} mit ganzem Herzen – du bringst mich zum Lächeln.'),
    short: L('{occ} مبارک!|Happy {occ}!|{occ} مبارك!|{occ} kutlu olsun!|С {occ}!|Bon {occ} !|Alles Gute zu {occ}!'),
    literary: L('بهار دل‌ها با شادی شما سرسبز باد؛ {occ} بر شما خجسته باد.|May joy bloom in your heart like spring: blessed {occ} to you.|لتزهر الأفراح في قلبكم كالربيع، و{occ} مبارك عليكم.|Gönlünüz bahar gibi çiçek açsın; {occ} kutlu olsun.|Пусть радость цветёт в вашем сердце, как весна. С {occ}!|Que la joie fleurisse en vous comme le printemps : joyeux {occ}.|Möge die Freude wie der Frühling in Ihnen blühen: schöne {occ}.'),
    religious: L('{occ} بر شما مبارک باد. خداوند سلامتی، برکت و آرامش را بر شما ارزانی دارد.|Blessed {occ} to you. May God grant you health, blessings and peace.|{occ} مبارك عليكم، جعله الله عليكم بالخير والبركة والسلام.|{occ} mübarek olsun. Allah sağlık, bereket ve huzur versin.|Благословенного {occ}. Пусть Бог даст вам здоровье, благодать и мир.|Bénédiction pour {occ}. Que Dieu vous accorde santé, grâce et paix.|Gesegnete {occ}. Gott schenke Ihnen Gesundheit, Segen und Frieden.'),
    luxury: L('به‌مناسبت {occ}، بهترین و باشکوه‌ترین آرزوها را تقدیم حضور ارجمندتان می‌کنم.|On the occasion of {occ}, I extend my most distinguished wishes to you.|بمناسبة {occ} أرفع إليكم أجمل التمنيات وأرقاها.|{occ} münasebetiyle en seçkin dileklerimi sunarım.|По случаю {occ} принесите самые изысканные пожелания.|À l’occasion de {occ}, je vous adresse mes vœux les plus distingués.|Anlässlich {occ} sende ich Ihnen meine erlesensten Wünsche.'),
  },
  love: { any: L('دوستت دارم؛ هر روز بیشتر از دیروز. {occ} فقط بهانه‌ای‌ست برای گفتنش.|I love you more every day. {occ} is just another reason to say it.|أحبك أكثر كل يوم، و{occ} مجرد سبب آخر لأقولها.|Seni her gün daha çok seviyorum. {occ} sadece bir bahane.|Люблю тебя больше с каждым днём. {occ} — лишний повод сказать это.|Je t’aime plus chaque jour. {occ} n’est qu’une excuse pour le dire.|Ich liebe dich jeden Tag mehr. {occ} ist nur ein weiterer Anlass.') },
  thanks: { any: L('از لطف و محبت شما در {occ} صمیمانه سپاسگزارم.|Thank you from the bottom of my heart for your kindness at {occ}.|أشكركم من القلب على لطفكم في {occ}.|{occ} sırasındaki nezaketiniz için yürekten teşekkür ederim.|Сердечно благодарю за вашу доброту в {occ}.|Merci du fond du cœur pour votre gentillesse lors de {occ}.|Von Herzen Dank für Ihre Freundlichkeit bei {occ}.') },
  condolence: { any: L('از شنیدن این خبر بسیار متأثر شدیم. برای شما صبر و آرامش آرزو می‌کنیم؛ یادش گرامی.|We were deeply saddened by your loss. Wishing you strength and peace; may their memory be a blessing.|تلقينا النبأ بأسى بالغ، نسأل الله لكم الصبر والسلوان ولفقيدكم الرحمة.|Üzücü haberi derin bir üzüntüyle öğrendik. Size sabır ve huzur dileriz.|С глубокой скорбью узнали о вашей утрате. Желаем вам сил и мира.|Nous avons appris cette perte avec une grande tristesse. Tous nos vœux de force et de paix.|Wir sind tief betroffen. Wir wünschen Ihnen Kraft und Frieden.') },
  sorry: { any: L('بابت اتفاقی که افتاد واقعاً متأسفم. امیدوارم بتوانی مرا ببخشی.|I’m truly sorry for what happened. I hope you can forgive me.|أنا آسف حقاً على ما حدث، وأتمنى أن تسامحني.|Olanlar için gerçekten üzgünüm. Umarım beni affedersin.|Мне очень жаль, что так вышло. Надеюсь, ты сможешь меня простить.|Je suis vraiment désolé pour ce qui s’est passé. J’espère que tu me pardonneras.|Es tut mir wirklich leid. Ich hoffe, du kannst mir verzeihen.') },
  brand: { any: L('کیفیت، اعتماد و خلاقیت؛ شریک مطمئن کسب‌وکار شما.|Quality, trust and creativity – your reliable business partner.|الجودة والثقة والإبداع، شريككم الموثوق.|Kalite, güven ve yaratıcılık – güvenilir iş ortağınız.|Качество, доверие и креативность — ваш надёжный партнёр.|Qualité, confiance et créativité – votre partenaire de confiance.|Qualität, Vertrauen und Kreativität – Ihr zuverlässiger Partner.') },
};

export function textSuggestions(occId, lang, tone = null) {
  const occ = occById[occId], kind = occ?.k || 'greet', name = occName(occ, lang), i = LANG_I[lang] ?? 1;
  const group = T[kind] && T[kind].formal ? T[kind] : T[kind]?.any ? T[kind] : T.greet;
  const out = [];
  const tones = group.any ? ['formal'] : tone ? [tone] : TONES;
  for (const tn of tones) { const raw = group.any ? group.any[i] : group[tn]?.[i]; if (raw) out.push({ tone: group.any ? 'formal' : tn, text: raw.replace(/\{occ\}/g, name) }); }
  return out;
}

// ---------------------------------------------------------------- smart design
const COLOR_PREF = { gold: 'gold', rose: 'rose', pink: 'rose', green: 'emerald', blue: 'sky', navy: 'navy', purple: 'violet', red: 'crimson', orange: 'coral', teal: 'teal', brown: 'copper', gray: 'mono', spring: 'spring' };
export const COLOR_CHOICES = [['', 'any'], ['gold', 'gold'], ['rose', 'rose'], ['emerald', 'green'], ['sky', 'blue'], ['navy', 'navy'], ['violet', 'purple'], ['crimson', 'red'], ['coral', 'orange'], ['teal', 'teal'], ['copper', 'brown'], ['mono', 'gray'], ['spring', 'spring']];
export const COLOR_NAMES = { gold: ['طلایی', 'Gold'], rose: ['صورتی', 'Rose'], emerald: ['سبز', 'Green'], sky: ['آبی', 'Blue'], navy: ['سرمه‌ای', 'Navy'], violet: ['بنفش', 'Purple'], crimson: ['قرمز', 'Red'], coral: ['نارنجی', 'Orange'], teal: ['فیروزه‌ای', 'Teal'], copper: ['مسی', 'Copper'], mono: ['خاکستری', 'Gray'], spring: ['بهاری', 'Spring'] };

// Returns at least `n` different designs for the occasion; each has a "recipe" describing palette, fonts, layout and decoration.
export function suggestDesigns({ occ, lang = 'fa', colorPref = '', stylePref = '', n = 6, seed = '' }) {
  const o = occById[occ]; if (!o) return [];
  let list = templatesFor(occ).filter((t) => !t.pack);
  const tags = occTags(o);
  if (stylePref) list = [...list.filter((t) => t.style === stylePref || STYLES[t.style].tags.includes(stylePref)), ...list.filter((t) => t.style !== stylePref && !STYLES[t.style].tags.includes(stylePref))];
  const byStyle = new Map(); for (const t of list) if (!byStyle.has(t.style)) byStyle.set(t.style, t);
  const picks = [...byStyle.values()].slice(0, Math.max(n, 5));
  const h = hashStr(seed || occ);
  return picks.map((t, k) => {
    const palKey = colorPref ? colorPref : t.v === 0 && k > 2 ? PALETTE_NAMES[(h + k * 3) % PALETTE_NAMES.length] : paletteKeyFor(o, t.v);
    const forcedPal = ['blackgold', 'whitegold', 'galaxy', 'persian', 'islamic', 'nature', 'fantasy'].includes(t.style) ? null : palKey;
    const id = forcedPal && forcedPal !== paletteKeyFor(o, t.v) ? `${t.id}@${forcedPal}` : t.id;
    const spec = buildSpec(id, { lang, W: 1000, H: 1400 });
    const textEl = spec.pages[0].elements.find((e) => e.name === 'title'), nameEl = spec.pages[0].elements.find((e) => e.name === 'names');
    const motifs = spec.pages[0].elements.filter((e) => e.type === 'clip').map((e) => e.clip).slice(0, 3);
    return { id, style: t.style, styleName: STYLES[t.style].n, palette: forcedPal || paletteKeyFor(o, t.v), colors: PALETTES[forcedPal || paletteKeyFor(o, t.v)], fonts: [textEl?.font, nameEl?.font].filter(Boolean), layout: t.v === 1 ? 'alt' : 'main', bg: spec.pages[0].bg.type + (spec.pages[0].bg.kind ? ':' + spec.pages[0].bg.kind : ''), motifs, premium: t.premium };
  });
}

// ---------------------------------------------------------------- optional online AI
export async function aiText({ endpoint, key, model, prompt }) {
  const url = endpoint.replace(/\/$/, '') + (/chat\/completions$/.test(endpoint) ? '' : '/chat/completions');
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ model: model || 'gpt-4o-mini', messages: [{ role: 'system', content: 'You write short, elegant card and invitation texts. Reply with the text only.' }, { role: 'user', content: prompt }], temperature: 0.8, max_tokens: 220 }) });
  if (!res.ok) throw new Error('AI HTTP ' + res.status);
  const j = await res.json(); return String(j.choices?.[0]?.message?.content || '').trim();
}
