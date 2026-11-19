// g: group, k: kind (invite|greet|love|thanks|sorry|condolence|brand), m: motif clip id, p: palette key
// n: names [fa, en, ar, tr, ru, fr, de]
export const GROUPS = {
  personal: { icon: '🎈', n: ['شخصی و خانوادگی', 'Personal & Family', 'شخصية وعائلية', 'Kişisel & Aile', 'Личные и семейные', 'Personnel & Famille', 'Persönlich & Familie'] },
  religious: { icon: '🌙', n: ['مذهبی و فرهنگی', 'Religious & Cultural', 'دينية وثقافية', 'Dini & Kültürel', 'Религиозные и культурные', 'Religieux & Culturel', 'Religiös & Kulturell'] },
  business: { icon: '💼', n: ['رسمی و شغلی', 'Business & Official', 'رسمية ومهنية', 'Resmi & İş', 'Деловые и официальные', 'Professionnel & Officiel', 'Geschäftlich & Offiziell'] },
  special: { icon: '✨', n: ['مناسبت‌های ویژه', 'Special Occasions', 'مناسبات خاصة', 'Özel Günler', 'Особые случаи', 'Occasions spéciales', 'Besondere Anlässe'] },
};

const O = (id, g, k, m, p, n) => ({ id, g, k, m, p, n: n.split('|') });

export const OCCASIONS = [
  // ---- personal
  O('birthday', 'personal', 'greet', 'cake', 'rose', 'تولد|Birthday|عيد ميلاد|Doğum Günü|День рождения|Anniversaire|Geburtstag'),
  O('kidBirthday', 'personal', 'greet', 'balloons3', 'sky', 'تولد کودک|Kid\'s Birthday|عيد ميلاد طفل|Çocuk Doğum Günü|Детский день рождения|Anniversaire d\'enfant|Kindergeburtstag'),
  O('spouseBirthday', 'personal', 'love', 'heart', 'crimson', 'تولد همسر|Spouse\'s Birthday|عيد ميلاد الزوج|Eşin Doğum Günü|День рождения супруга|Anniversaire de mon conjoint|Geburtstag des Partners'),
  O('anniversary', 'personal', 'love', 'rings', 'gold', 'سالگرد ازدواج|Wedding Anniversary|ذكرى الزواج|Evlilik Yıldönümü|Годовщина свадьбы|Anniversaire de mariage|Hochzeitstag'),
  O('meetAnniversary', 'personal', 'love', 'hearts3', 'rose', 'سالگرد آشنایی|Anniversary of Meeting|ذكرى اللقاء|Tanışma Yıldönümü|Годовщина знакомства|Anniversaire de rencontre|Jahrestag des Kennenlernens'),
  O('engagement', 'personal', 'invite', 'rings', 'gold', 'نامزدی|Engagement|خطوبة|Nişan|Помолвка|Fiançailles|Verlobung'),
  O('wedding', 'personal', 'invite', 'rings', 'gold', 'عروسی|Wedding|حفل زفاف|Düğün|Свадьба|Mariage|Hochzeit'),
  O('aghd', 'personal', 'invite', 'rings', 'rose', 'جشن عقد|Marriage Ceremony|حفل عقد القران|Nikâh Töreni|Церемония бракосочетания|Cérémonie de mariage|Trauungszeremonie'),
  O('graduation', 'personal', 'greet', 'gradcap', 'navy', 'فارغ‌التحصیلی|Graduation|التخرج|Mezuniyet|Выпускной|Remise de diplôme|Abschluss'),
  O('success', 'personal', 'greet', 'trophy', 'gold', 'موفقیت و قبولی|Success & Achievement|النجاح والقبول|Başarı|Успех и достижения|Réussite|Erfolg'),
  O('returnTrip', 'personal', 'greet', 'plane', 'sky', 'بازگشت از سفر|Welcome Back from Trip|العودة من السفر|Yolculuktan Dönüş|Возвращение из поездки|Retour de voyage|Rückkehr von der Reise'),
  O('welcome', 'personal', 'greet', 'rose', 'spring', 'خوش‌آمدگویی|Welcome|ترحيب|Hoş Geldiniz|Добро пожаловать|Bienvenue|Willkommen'),
  O('farewell', 'personal', 'greet', 'plane', 'copper', 'خداحافظی|Farewell|وداع|Veda|Прощание|Adieux|Abschied'),
  O('thanks', 'personal', 'thanks', 'sprig', 'emerald', 'تشکر و قدردانی|Thank You|شكر وتقدير|Teşekkür|Благодарность|Remerciements|Danke'),
  O('apology', 'personal', 'sorry', 'sprig', 'violet', 'عذرخواهی|Apology|اعتذار|Özür|Извинение|Excuses|Entschuldigung'),
  O('newHome', 'personal', 'greet', 'house', 'copper', 'تبریک خانه جدید|New Home|مبارك المنزل الجديد|Yeni Ev|Новоселье|Nouvelle maison|Neues Zuhause'),
  O('newborn', 'personal', 'greet', 'bear', 'sky', 'تولد فرزند|New Baby|مولود جديد|Yeni Bebek|Рождение ребёнка|Nouveau-né|Geburt eines Kindes'),
  O('mothersDay', 'personal', 'greet', 'rose', 'rose', 'روز مادر|Mother\'s Day|عيد الأم|Anneler Günü|День матери|Fête des mères|Muttertag'),
  O('fathersDay', 'personal', 'greet', 'tie', 'navy', 'روز پدر|Father\'s Day|عيد الأب|Babalar Günü|День отца|Fête des pères|Vatertag'),
  O('daughtersDay', 'personal', 'greet', 'daisy', 'rose', 'روز دختر|Daughter\'s Day|يوم البنت|Kızlar Günü|День дочери|Fête des filles|Tag der Töchter'),
  O('sonsDay', 'personal', 'greet', 'star5', 'sky', 'روز پسر|Son\'s Day|يوم الابن|Oğullar Günü|День сына|Fête des fils|Tag der Söhne'),
  O('childrensDay', 'personal', 'greet', 'balloons3', 'coral', 'روز کودک|Children\'s Day|يوم الطفل|Çocuk Bayramı|День защиты детей|Journée des enfants|Kindertag'),
  // ---- religious & cultural
  O('nowruz', 'religious', 'greet', 'tulip', 'spring', 'عید نوروز|Nowruz|عيد النوروز|Nevruz|Навруз|Norouz|Nowruz'),
  O('yalda', 'religious', 'greet', 'watermelon', 'crimson', 'شب یلدا|Yalda Night|ليلة يلدا|Yalda Gecesi|Ночь Ялда|Nuit de Yalda|Yalda-Nacht'),
  O('eidFitr', 'religious', 'greet', 'crescent', 'emerald', 'عید فطر|Eid al-Fitr|عيد الفطر|Ramazan Bayramı|Ураза-байрам|Aïd el-Fitr|Eid al-Fitr'),
  O('eidAdha', 'religious', 'greet', 'lantern', 'teal', 'عید قربان|Eid al-Adha|عيد الأضحى|Kurban Bayramı|Курбан-байрам|Aïd el-Adha|Eid al-Adha'),
  O('ramadan', 'religious', 'greet', 'lantern', 'emerald', 'ماه رمضان|Ramadan|شهر رمضان|Ramazan|Рамадан|Ramadan|Ramadan'),
  O('qadr', 'religious', 'greet', 'star8', 'violet', 'شب قدر|Laylat al-Qadr|ليلة القدر|Kadir Gecesi|Ночь Предопределения|Nuit du Destin|Nacht der Bestimmung'),
  O('ghadir', 'religious', 'greet', 'star8', 'emerald', 'عید غدیر|Eid al-Ghadir|عيد الغدير|Gadir Bayramı|Ид аль-Гадир|Aïd al-Ghadir|Eid al-Ghadir'),
  O('prophetBirthday', 'religious', 'greet', 'mosque', 'teal', 'میلاد پیامبر|Mawlid|المولد النبوي|Mevlid Kandili|Маулид|Mawlid|Mawlid'),
  O('religiousEids', 'religious', 'greet', 'mosque', 'emerald', 'اعیاد مذهبی|Religious Celebrations|الأعياد الدينية|Dini Bayramlar|Религиозные праздники|Fêtes religieuses|Religiöse Feste'),
  O('muharram', 'religious', 'condolence', 'candle', 'mono', 'محرم و مناسبت‌های سوگواری|Muharram & Mourning|محرم والمناسبات الحزينة|Muharrem ve Yas|Мухаррам и траур|Mouharram et deuil|Muharram & Trauer'),
  O('christmas', 'religious', 'greet', 'christmasTree', 'spring', 'کریسمس|Christmas|عيد الميلاد المجيد|Noel|Рождество|Noël|Weihnachten'),
  O('newYear', 'religious', 'greet', 'burst', 'violet', 'سال نو میلادی|New Year|رأس السنة الميلادية|Yeni Yıl|Новый год|Nouvel An|Neujahr'),
  O('easter', 'religious', 'greet', 'egg', 'spring', 'عید پاک|Easter|عيد الفصح|Paskalya|Пасха|Pâques|Ostern'),
  // ---- business
  O('shopOpening', 'business', 'invite', 'ribbonBow', 'copper', 'افتتاحیه فروشگاه|Store Opening|افتتاح متجر|Mağaza Açılışı|Открытие магазина|Ouverture de magasin|Geschäftseröffnung'),
  O('companyOpening', 'business', 'invite', 'building', 'navy', 'افتتاحیه شرکت|Company Opening|افتتاح شركة|Şirket Açılışı|Открытие компании|Inauguration d\'entreprise|Firmeneröffnung'),
  O('factoryOpening', 'business', 'invite', 'gear', 'navy', 'افتتاح کارخانه|Factory Opening|افتتاح مصنع|Fabrika Açılışı|Открытие завода|Inauguration d\'usine|Werkseröffnung'),
  O('expoInvite', 'business', 'invite', 'star5', 'sky', 'دعوت به نمایشگاه|Exhibition Invitation|دعوة إلى معرض|Fuar Daveti|Приглашение на выставку|Invitation à une exposition|Einladung zur Messe'),
  O('seminar', 'business', 'invite', 'seal', 'navy', 'دعوت به همایش|Seminar Invitation|دعوة إلى ندوة|Seminer Daveti|Приглашение на семинар|Invitation à un séminaire|Einladung zum Seminar'),
  O('meeting', 'business', 'invite', 'briefcase', 'mono', 'دعوت به جلسه|Meeting Invitation|دعوة إلى اجتماع|Toplantı Daveti|Приглашение на встречу|Invitation à une réunion|Einladung zum Meeting'),
  O('conference', 'business', 'invite', 'laurel', 'navy', 'دعوت به کنفرانس|Conference Invitation|دعوة إلى مؤتمر|Konferans Daveti|Приглашение на конференцию|Invitation à une conférence|Einladung zur Konferenz'),
  O('promotion', 'business', 'greet', 'trophy', 'gold', 'تبریک ارتقای شغلی|Job Promotion|تهنئة بالترقية|Terfi Tebriği|Поздравление с повышением|Félicitations pour la promotion|Beförderung'),
  O('partnership', 'business', 'greet', 'seal', 'teal', 'تبریک همکاری جدید|New Partnership|تهنئة بشراكة جديدة|Yeni İş Ortaklığı|Новое партнёрство|Nouveau partenariat|Neue Partnerschaft'),
  O('customerThanks', 'business', 'thanks', 'heart', 'coral', 'تشکر از مشتری|Thank You, Customer|شكر العميل|Müşteri Teşekkürü|Спасибо клиенту|Merci à nos clients|Danke an unsere Kunden'),
  O('colleagues', 'business', 'greet', 'star5', 'sky', 'تبریک به همکاران|Congratulations, Team|تهنئة الزملاء|Meslektaşlara Tebrik|Поздравление коллегам|Félicitations à l\'équipe|Glückwunsch an das Team'),
  O('businessEvent', 'business', 'invite', 'diamond', 'gold', 'دعوت به مراسم تجاری|Business Event|دعوة إلى فعالية تجارية|İş Etkinliği Daveti|Деловое мероприятие|Événement professionnel|Geschäftsveranstaltung'),
  O('brandCard', 'business', 'brand', 'monogram', 'navy', 'کارت معرفی برند|Brand Business Card|بطاقة تعريف العلامة|Marka Tanıtım Kartı|Визитка бренда|Carte de visite|Visitenkarte'),
  // ---- special
  O('party', 'special', 'invite', 'balloons3', 'violet', 'دعوت به مهمانی|Party Invitation|دعوة إلى حفلة|Parti Daveti|Приглашение на вечеринку|Invitation à une fête|Party-Einladung'),
  O('dinner', 'special', 'invite', 'candle', 'copper', 'مهمانی شام|Dinner Party|حفل عشاء|Akşam Yemeği|Званый ужин|Dîner|Abendessen'),
  O('birthdayParty', 'special', 'invite', 'cake', 'coral', 'جشن تولد|Birthday Party|حفلة عيد ميلاد|Doğum Günü Partisi|Праздник дня рождения|Fête d\'anniversaire|Geburtstagsparty'),
  O('genderReveal', 'special', 'invite', 'balloons', 'sky', 'جشن تعیین جنسیت|Gender Reveal|حفل كشف الجنس|Cinsiyet Partisi|Гендер-пати|Gender Reveal|Gender-Reveal-Party'),
  O('babyShower', 'special', 'invite', 'bear', 'rose', 'جشن سیسمونی|Baby Shower|حفل استقبال المولود|Baby Shower|Бебі-шауэр|Baby Shower|Babyparty'),
  O('gradParty', 'special', 'invite', 'gradcap', 'navy', 'جشن فارغ‌التحصیلی|Graduation Party|حفل التخرج|Mezuniyet Partisi|Выпускная вечеринка|Fête de remise de diplôme|Abschlussfeier'),
  O('retirement', 'special', 'invite', 'clock', 'copper', 'جشن بازنشستگی|Retirement Party|حفل التقاعد|Emeklilik Partisi|Проводы на пенсию|Fête de départ à la retraite|Ruhestandsfeier'),
  O('memorial', 'special', 'condolence', 'dove', 'mono', 'مراسم یادبود|Memorial Service|مراسم تأبين|Anma Töreni|Поминальная церемония|Cérémonie commémorative|Gedenkfeier'),
  O('condolence', 'special', 'condolence', 'blackRibbon', 'mono', 'کارت تسلیت|Condolence Card|بطاقة تعزية|Başsağlığı Kartı|Соболезнование|Carte de condoléances|Beileidskarte'),
  O('sympathy', 'special', 'condolence', 'rose', 'mono', 'کارت همدردی|Sympathy Card|بطاقة مواساة|Sempati Kartı|Слова поддержки|Carte de sympathie|Mitgefühl'),
  O('romantic', 'special', 'love', 'heart', 'crimson', 'کارت عاشقانه|Love Card|بطاقة حب|Aşk Kartı|Любовная открытка|Carte d\'amour|Liebeskarte'),
  O('friendship', 'special', 'love', 'hearts3', 'coral', 'کارت دوستی|Friendship Card|بطاقة صداقة|Dostluk Kartı|Открытка для друга|Carte d\'amitié|Freundschaftskarte'),
];

export const LANG_INDEX = { fa: 0, en: 1, ar: 2, tr: 3, ru: 4, fr: 5, de: 6 };
export const occById = Object.fromEntries(OCCASIONS.map((o) => [o.id, o]));
export const occName = (o, lang) => (typeof o === 'string' ? occById[o] : o)?.n[LANG_INDEX[lang] ?? 1] || '';
export const groupName = (g, lang) => GROUPS[g].n[LANG_INDEX[lang] ?? 1];
export const occupiedGroups = Object.keys(GROUPS);
