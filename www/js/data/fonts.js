// Fonts bundled with the app (see scripts/prepare-web.mjs) + per-language font roles.
export const LANGS = ['fa', 'en', 'ar', 'tr', 'ru', 'fr', 'de'];
export const LANG_NAMES = {
  fa: 'فارسی', en: 'English', ar: 'العربية', tr: 'Türkçe', ru: 'Русский', fr: 'Français', de: 'Deutsch',
};
export const RTL = { fa: true, ar: true };

// scripts: which writing systems the font supports
export const FONTS = [
  { family: 'Vazirmatn', label: 'وزیرمتن', scripts: ['arabic', 'latin'], cat: 'sans' },
  { family: 'Lalezar', label: 'لاله‌زار', scripts: ['arabic', 'latin'], cat: 'display' },
  { family: 'Amiri', label: 'امیری', scripts: ['arabic', 'latin'], cat: 'naskh' },
  { family: 'Aref Ruqaa', label: 'عارف رقعه', scripts: ['arabic', 'latin'], cat: 'calligraphy' },
  { family: 'Reem Kufi', label: 'ریم کوفی', scripts: ['arabic', 'latin'], cat: 'kufi' },
  { family: 'Noto Naskh Arabic', label: 'نسخ', scripts: ['arabic'], cat: 'naskh' },
  { family: 'Noto Nastaliq Urdu', label: 'نستعلیق', scripts: ['arabic'], cat: 'nastaliq' },
  { family: 'Playfair Display', label: 'Playfair Display', scripts: ['latin', 'cyrillic'], cat: 'serif' },
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', scripts: ['latin', 'cyrillic'], cat: 'serif' },
  { family: 'Cinzel', label: 'Cinzel', scripts: ['latin'], cat: 'caps' },
  { family: 'Great Vibes', label: 'Great Vibes', scripts: ['latin'], cat: 'script' },
  { family: 'Dancing Script', label: 'Dancing Script', scripts: ['latin'], cat: 'script' },
  { family: 'Pacifico', label: 'Pacifico', scripts: ['latin', 'cyrillic'], cat: 'script' },
  { family: 'Comfortaa', label: 'Comfortaa', scripts: ['latin', 'cyrillic'], cat: 'kids' },
  { family: 'Montserrat', label: 'Montserrat', scripts: ['latin', 'cyrillic'], cat: 'sans' },
];

const AR = { display: 'Aref Ruqaa', script: 'Aref Ruqaa', body: 'Vazirmatn', caps: 'Reem Kufi', kids: 'Lalezar', elegant: 'Amiri', bold: 'Lalezar', trad: 'Noto Nastaliq Urdu' };
const LA = { display: 'Playfair Display', script: 'Great Vibes', body: 'Montserrat', caps: 'Cinzel', kids: 'Pacifico', elegant: 'Cormorant Garamond', bold: 'Playfair Display', trad: 'Great Vibes' };
const RU = { display: 'Playfair Display', script: 'Pacifico', body: 'Montserrat', caps: 'Cormorant Garamond', kids: 'Comfortaa', elegant: 'Cormorant Garamond', bold: 'Playfair Display', trad: 'Pacifico' };
export const FONT_SETS = { fa: AR, ar: AR, en: LA, tr: LA, fr: LA, de: LA, ru: RU };
export const fontSet = (lang) => FONT_SETS[lang] || LA;

export const fontsForLang = (lang) => {
  const sc = lang === 'fa' || lang === 'ar' ? 'arabic' : lang === 'ru' ? 'cyrillic' : 'latin';
  return FONTS.filter((f) => f.scripts.includes(sc));
};
export const fontStack = (family) => `"${family}", "Vazirmatn", "Noto Naskh Arabic", "Tahoma", "Arial", sans-serif`;
