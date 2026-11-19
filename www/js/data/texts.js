// Default card wording per kind × language. Order: [fa, en, ar, tr, ru, fr, de]
const L = (s) => s.split('|');
const T = (sub, body, sign) => ({ sub: L(sub), body: L(body), sign: L(sign) });

export const KIND_TEXT = {
  invite: T(
    'با افتخار از شما دعوت می‌کنیم|You are cordially invited|يسرّنا دعوتكم|Sizi davet etmekten onur duyarız|Приглашаем вас с радостью|Vous êtes cordialement invités|Wir laden Sie herzlich ein',
    'حضور گرم شما مایه افتخار و شادی ماست.|Your presence will make this day truly special.|حضوركم يزيد مناسبتنا بهجة وسروراً.|Varlığınız bu günü çok daha özel kılacak.|Ваше присутствие сделает этот день особенным.|Votre présence rendra ce jour encore plus précieux.|Ihre Anwesenheit macht diesen Tag zu etwas Besonderem.',
    'با احترام|With warm regards|مع خالص التحية|Saygılarımızla|С уважением|Cordialement|Mit herzlichen Grüßen'),
  greet: T(
    'تبریک می‌گوییم|Warmest Congratulations|أطيب التهاني|Tebrik Ederiz|Сердечно поздравляем|Toutes nos félicitations|Herzlichen Glückwunsch',
    'آرزوی شادی، سلامتی و موفقیت روزافزون برای شما دارم.|Wishing you joy, health and happiness today and always.|أتمنى لكم السعادة والصحة والتوفيق الدائم.|Size her zaman mutluluk, sağlık ve başarı dilerim.|Желаю вам радости, здоровья и успехов!|Je vous souhaite joie, santé et bonheur.|Ich wünsche Ihnen Freude, Gesundheit und Glück.',
    'با آرزوی بهترین‌ها|With best wishes|مع أجمل الأمنيات|En iyi dileklerimle|С наилучшими пожеланиями|Avec tous mes vœux|Mit den besten Wünschen'),
  love: T(
    'با عشق|With all my love|بكل حب|Sevgiyle|С любовью|Avec tout mon amour|In Liebe',
    'تو بهترین اتفاق زندگی منی؛ دوستت دارم.|You are the best thing that ever happened to me.|أنت أجمل ما حدث في حياتي.|Sen hayatımın en güzel hediyesisin.|Ты — лучшее, что случилось в моей жизни.|Tu es le plus beau cadeau de ma vie.|Du bist das Beste, was mir passiert ist.',
    'همیشه مال تو|Forever yours|لك دائماً|Hep seninle|Навсегда твой|Pour toujours à toi|Für immer dein'),
  thanks: T(
    'با سپاس فراوان|With heartfelt thanks|بخالص الشكر|Candan teşekkürler|Искренне благодарим|Avec nos sincères remerciements|Herzlichen Dank',
    'از لطف و همراهی شما صمیمانه سپاسگزاریم.|We sincerely appreciate your kindness and support.|نشكركم جزيل الشكر على لطفكم ودعمكم.|Nezaketiniz ve desteğiniz için içtenlikle teşekkür ederiz.|Мы искренне ценим вашу доброту и поддержку.|Nous apprécions sincèrement votre gentillesse et votre soutien.|Wir danken Ihnen aufrichtig für Ihre Freundlichkeit.',
    'با قدردانی|With gratitude|مع الامتنان|Minnetle|С благодарностью|Avec gratitude|In Dankbarkeit'),
  sorry: T(
    'پوزش می‌خواهم|I am truly sorry|أعتذر بصدق|Çok özür dilerim|Прошу прощения|Je suis sincèrement désolé|Es tut mir aufrichtig leid',
    'از اشتباه من بگذرید؛ ارزش دوستی ما بیشتر از هر چیزی‌ست.|Please forgive me — our friendship matters more than anything.|سامحوني، فصداقتنا أغلى من كل شيء.|Lütfen beni affet; dostluğumuz her şeyden değerli.|Прости меня — наша дружба дороже всего.|Pardonne-moi, notre amitié compte plus que tout.|Bitte verzeih mir – unsere Freundschaft ist mir wichtiger als alles.',
    'با احترام و صمیمیت|Sincerely|بكل احترام|Saygı ve sevgiyle|Искренне|Sincèrement|Aufrichtig'),
  condolence: T(
    'با نهایت تأسف و همدردی|With deepest sympathy|ببالغ الحزن والمواساة|Derin üzüntüyle|С глубоким соболезнованием|Avec toute notre sympathie|In tiefem Mitgefühl',
    'درگذشت عزیزتان را تسلیت می‌گوییم؛ یادش گرامی و روانش شاد.|Our hearts are with you in this time of loss.|ببالغ الأسى نعزّيكم في فقيدكم، رحمه الله وأسكنه فسيح جناته.|Kaybınız için başsağlığı dileriz; anısı daima yaşasın.|Скорбим вместе с вами. Светлая память.|Nos pensées vous accompagnent dans cette épreuve.|Unsere Gedanken sind in dieser schweren Zeit bei Ihnen.',
    'با همدردی|With sympathy|مع المواساة|Başsağlığı dileklerimizle|С соболезнованием|Avec sympathie|Mit Anteilnahme'),
  brand: T(
    'نام و عنوان شغلی|Name & Title|الاسم والمسمى الوظيفي|Ad ve Unvan|Имя и должность|Nom et fonction|Name und Position',
    'خدمات حرفه‌ای با کیفیت برتر|Professional services of the highest quality|خدمات احترافية بأعلى جودة|En yüksek kalitede profesyonel hizmet|Профессиональные услуги высокого качества|Services professionnels de haute qualité|Professionelle Dienstleistungen höchster Qualität',
    'ارتباط با ما|Get in touch|تواصل معنا|Bize ulaşın|Свяжитесь с нами|Contactez-nous|Kontakt'),
};

// "{occ}" in suggestion texts is replaced by the occasion name.
export const LANG_I = { fa: 0, en: 1, ar: 2, tr: 3, ru: 4, fr: 5, de: 6 };
export const kindText = (kind, part, lang) => (KIND_TEXT[kind] || KIND_TEXT.greet)[part][LANG_I[lang] ?? 1];
