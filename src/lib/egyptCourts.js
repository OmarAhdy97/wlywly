/*
 * A searchable directory of Egyptian courts, by governorate.
 *
 * Guidance, not an official register: district (جزئية) and family courts are
 * generated from each governorate's centres and districts, which is how they
 * are usually named. Any name can still be typed by hand.
 */
import { EGYPTIAN_COURTS } from './courtsData';

const GOVERNORATES = [
  {
    name: 'القاهرة',
    primary: ['شمال القاهرة', 'جنوب القاهرة', 'شرق القاهرة', 'حلوان', 'القاهرة الجديدة'],
    districts: ['مصر الجديدة', 'النزهة', 'مدينة نصر', 'عين شمس', 'المطرية', 'الزيتون', 'حدائق القبة', 'الوايلي', 'الشرابية', 'شبرا', 'روض الفرج', 'الساحل', 'بولاق', 'الأزبكية', 'عابدين', 'قصر النيل', 'الموسكي', 'باب الشعرية', 'الجمالية', 'الدرب الأحمر', 'الخليفة', 'السيدة زينب', 'مصر القديمة', 'المعادي', 'البساتين', 'دار السلام', 'حلوان', 'التبين', '15 مايو', 'القاهرة الجديدة', 'الشروق', 'بدر', 'المرج', 'السلام', 'الأميرية'],
  },
  {
    name: 'الجيزة',
    primary: ['شمال الجيزة', 'جنوب الجيزة', '6 أكتوبر'],
    districts: ['الجيزة', 'الدقي', 'العجوزة', 'إمبابة', 'بولاق الدكرور', 'الوراق', 'الهرم', 'العمرانية', 'الطالبية', 'أوسيم', 'كرداسة', 'أبو النمرس', 'الحوامدية', 'البدرشين', 'العياط', 'الصف', 'أطفيح', 'منشأة القناطر', '6 أكتوبر', 'الشيخ زايد', 'الواحات البحرية'],
  },
  {
    name: 'الإسكندرية',
    primary: ['شرق الإسكندرية', 'غرب الإسكندرية'],
    districts: ['المنتزه', 'الرمل', 'سيدي جابر', 'باب شرقي', 'محرم بك', 'العطارين', 'المنشية', 'الجمرك', 'كرموز', 'اللبان', 'مينا البصل', 'الدخيلة', 'العجمي', 'العامرية', 'برج العرب'],
  },
  {
    name: 'القليوبية',
    primary: ['بنها', 'شبرا الخيمة'],
    districts: ['بنها', 'قليوب', 'شبرا الخيمة', 'القناطر الخيرية', 'الخانكة', 'العبور', 'شبين القناطر', 'طوخ', 'كفر شكر'],
  },
  {
    name: 'الشرقية',
    primary: ['الزقازيق'],
    districts: ['الزقازيق', 'أبو حماد', 'أبو كبير', 'الإبراهيمية', 'بلبيس', 'ديرب نجم', 'فاقوس', 'الحسينية', 'ههيا', 'كفر صقر', 'منيا القمح', 'مشتول السوق', 'أولاد صقر', 'القرين', 'الصالحية الجديدة', 'العاشر من رمضان'],
  },
  {
    name: 'الدقهلية',
    primary: ['المنصورة'],
    districts: ['المنصورة', 'طلخا', 'ميت غمر', 'أجا', 'السنبلاوين', 'دكرنس', 'منية النصر', 'شربين', 'بلقاس', 'المنزلة', 'الجمالية', 'تمي الأمديد', 'بني عبيد', 'ميت سلسيل', 'المطرية', 'نبروه', 'جمصة'],
  },
  {
    name: 'الغربية',
    primary: ['طنطا'],
    districts: ['طنطا', 'المحلة الكبرى', 'كفر الزيات', 'زفتى', 'السنطة', 'قطور', 'بسيون', 'سمنود'],
  },
  {
    name: 'المنوفية',
    primary: ['شبين الكوم'],
    districts: ['شبين الكوم', 'منوف', 'مدينة السادات', 'أشمون', 'الباجور', 'قويسنا', 'بركة السبع', 'تلا', 'الشهداء', 'سرس الليان'],
  },
  {
    name: 'البحيرة',
    primary: ['دمنهور', 'إيتاي البارود'],
    districts: ['دمنهور', 'كفر الدوار', 'رشيد', 'إدكو', 'أبو المطامير', 'أبو حمص', 'الدلنجات', 'المحمودية', 'الرحمانية', 'إيتاي البارود', 'حوش عيسى', 'شبراخيت', 'كوم حمادة', 'بدر', 'وادي النطرون', 'النوبارية الجديدة'],
  },
  {
    name: 'كفر الشيخ',
    primary: ['كفر الشيخ'],
    districts: ['كفر الشيخ', 'دسوق', 'فوه', 'مطوبس', 'بيلا', 'الحامول', 'سيدي سالم', 'الرياض', 'قلين', 'البرلس'],
  },
  {
    name: 'دمياط',
    primary: ['دمياط'],
    districts: ['دمياط', 'فارسكور', 'كفر سعد', 'الزرقا', 'كفر البطيخ', 'دمياط الجديدة', 'رأس البر', 'عزبة البرج'],
  },
  {
    name: 'بورسعيد',
    primary: ['بورسعيد'],
    districts: ['بورسعيد', 'بورفؤاد', 'الشرق', 'العرب', 'المناخ', 'الضواحي', 'الزهور', 'الجنوب'],
  },
  {
    name: 'الإسماعيلية',
    primary: ['الإسماعيلية'],
    districts: ['الإسماعيلية', 'فايد', 'القنطرة شرق', 'القنطرة غرب', 'التل الكبير', 'أبو صوير', 'القصاصين'],
  },
  {
    name: 'السويس',
    primary: ['السويس'],
    districts: ['السويس', 'الأربعين', 'عتاقة', 'الجناين', 'فيصل'],
  },
  {
    name: 'الفيوم',
    primary: ['الفيوم'],
    districts: ['الفيوم', 'سنورس', 'إطسا', 'طامية', 'أبشواي', 'يوسف الصديق'],
  },
  {
    name: 'بني سويف',
    primary: ['بني سويف'],
    districts: ['بني سويف', 'الواسطى', 'ناصر', 'إهناسيا', 'ببا', 'الفشن', 'سمسطا'],
  },
  {
    name: 'المنيا',
    primary: ['المنيا'],
    districts: ['المنيا', 'العدوة', 'مغاغة', 'بني مزار', 'مطاي', 'سمالوط', 'أبو قرقاص', 'ملوي', 'دير مواس'],
  },
  {
    name: 'أسيوط',
    primary: ['أسيوط'],
    districts: ['أسيوط', 'ديروط', 'القوصية', 'منفلوط', 'أبنوب', 'الفتح', 'ساحل سليم', 'البداري', 'صدفا', 'الغنايم', 'أبو تيج'],
  },
  {
    name: 'سوهاج',
    primary: ['سوهاج'],
    districts: ['سوهاج', 'أخميم', 'ساقلتة', 'المراغة', 'طهطا', 'طما', 'جهينة', 'المنشاة', 'جرجا', 'البلينا', 'دار السلام', 'العسيرات'],
  },
  {
    name: 'قنا',
    primary: ['قنا'],
    districts: ['قنا', 'أبو تشت', 'فرشوط', 'نجع حمادي', 'دشنا', 'الوقف', 'قفط', 'قوص', 'نقادة'],
  },
  {
    name: 'الأقصر',
    primary: ['الأقصر'],
    districts: ['الأقصر', 'إسنا', 'أرمنت', 'البياضية', 'الزينية', 'القرنة', 'الطود'],
  },
  {
    name: 'أسوان',
    primary: ['أسوان'],
    districts: ['أسوان', 'دراو', 'كوم أمبو', 'نصر النوبة', 'إدفو'],
  },
  {
    name: 'البحر الأحمر',
    primary: ['البحر الأحمر'],
    districts: ['الغردقة', 'رأس غارب', 'سفاجا', 'القصير', 'مرسى علم', 'الشلاتين'],
  },
  {
    name: 'مطروح',
    primary: ['مطروح'],
    districts: ['مرسى مطروح', 'الحمام', 'العلمين', 'الضبعة', 'سيدي براني', 'السلوم', 'سيوة'],
  },
  {
    name: 'شمال سيناء',
    primary: ['شمال سيناء'],
    districts: ['العريش', 'الشيخ زويد', 'رفح', 'بئر العبد', 'الحسنة', 'نخل'],
  },
  {
    name: 'جنوب سيناء',
    primary: ['جنوب سيناء'],
    districts: ['الطور', 'شرم الشيخ', 'دهب', 'نويبع', 'سانت كاترين', 'رأس سدر', 'أبو رديس', 'أبو زنيمة'],
  },
  {
    name: 'الوادي الجديد',
    primary: ['الوادي الجديد'],
    districts: ['الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'],
  },
];

const ECONOMIC = ['القاهرة', 'الإسكندرية', 'طنطا', 'المنصورة', 'الإسماعيلية', 'بني سويف', 'أسيوط', 'قنا'];

const TYPE_LABEL = {
  supreme: 'محكمة عليا',
  state_council: 'مجلس الدولة',
  appeal: 'استئناف',
  primary: 'ابتدائية',
  district: 'جزئية',
  family: 'أسرة',
  economic: 'اقتصادية',
  prosecution: 'نيابة',
};

function build() {
  const seen = new Set();
  const out = [];
  const add = (name, type, governorate) => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ name, type, typeLabel: TYPE_LABEL[type] || '', governorate: governorate || '' });
  };

  EGYPTIAN_COURTS
    .filter((c) => ['supreme', 'state_council', 'appeal'].includes(c.type))
    .forEach((c) => add(c.name, c.type, c.governorate));

  GOVERNORATES.forEach((g) => {
    g.primary.forEach((p) => add(`محكمة ${p} الابتدائية`, 'primary', g.name));
  });
  ECONOMIC.forEach((city) => add(`محكمة ${city} الاقتصادية`, 'economic', city));
  GOVERNORATES.forEach((g) => {
    g.districts.forEach((d) => add(`محكمة ${d} الجزئية`, 'district', g.name));
  });
  GOVERNORATES.forEach((g) => {
    g.districts.forEach((d) => add(`محكمة أسرة ${d}`, 'family', g.name));
  });
  EGYPTIAN_COURTS.forEach((c) => add(c.name, c.type, c.governorate));
  return out;
}

export const COURT_DIRECTORY = build();
export const COURT_GOVERNORATES = GOVERNORATES.map((g) => g.name);

// Arabic-insensitive matching: alef forms, taa marbuta, alef maqsura, diacritics.
export function normalizeArabic(text) {
  return String(text || '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

const INDEXED = COURT_DIRECTORY.map((c) => ({ ...c, key: normalizeArabic(`${c.name} ${c.governorate} ${c.typeLabel}`) }));

export function searchCourtDirectory(query, limit = 60) {
  const words = normalizeArabic(query).split(/\s+/).filter((w) => w && w !== 'محكمه');
  if (!words.length) return INDEXED.slice(0, limit);
  const hits = [];
  for (const c of INDEXED) {
    if (words.every((w) => c.key.includes(w))) hits.push(c);
    if (hits.length >= limit) break;
  }
  return hits;
}
