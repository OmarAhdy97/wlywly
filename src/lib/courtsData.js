/**
 * Egyptian Courts Directory & Jurisdiction System
 * 
 * Provides an authoritative reference of the Egyptian judicial hierarchy:
 * 1. محكمة النقض والمحكمة الدستورية العليا
 * 2. مجلس الدولة (المحكمة الإدارية العليا، القضاء الإداري، المحاكم الإدارية والتأديبية)
 * 3. محاكم الاستئناف العالي (8 محاكم استئناف إقليمية)
 * 4. المحاكم الابتدائية (محاكم كلية بجميع المحافظات)
 * 5. المحاكم الجزئية ومحاكم الأسرة
 * 6. المحاكم الاقتصادية
 * 7. النيابات العامة والمتخصصة
 */

export const COURT_TYPES = [
  { id: 'all', label: 'جميع المحاكم والنيابات' },
  { id: 'supreme', label: 'المحاكم العليا' },
  { id: 'state_council', label: 'مجلس الدولة' },
  { id: 'appeal', label: 'محاكم الاستئناف العالي' },
  { id: 'primary', label: 'المحاكم الابتدائية الكلية' },
  { id: 'family', label: 'محاكم الأسرة' },
  { id: 'economic', label: 'المحاكم الاقتصادية' },
  { id: 'prosecution', label: 'النيابة العامة' }
];

export const EGYPTIAN_COURTS = [
  // المحاكم العليا
  {
    id: 'cassation',
    name: 'محكمة النقض',
    type: 'supreme',
    governorate: 'القاهرة',
    city: 'القاهرة - دار القضاء العالي',
    chambers: ['الدائرة المدنية', 'الدائرة الجنائية', 'دائرة الإيجارات', 'دائرة العمال', 'الدائرة التجارية']
  },
  {
    id: 'constitutional',
    name: 'المحكمة الدستورية العليا',
    type: 'supreme',
    governorate: 'القاهرة',
    city: 'المعادي - كورنيش النيل',
    chambers: ['هيئة المفوضين', 'المحكمة الدستورية']
  },

  // مجلس الدولة
  {
    id: 'admin_supreme',
    name: 'المحكمة الإدارية العليا - مجلس الدولة',
    type: 'state_council',
    governorate: 'الجيزة',
    city: 'الدقي',
    chambers: ['دائرة الحقوق والحريات', 'دائرة العقود الإدارية', 'دائرة التسويات والبدلات', 'دائرة التعليم والمنازعات الفردية']
  },
  {
    id: 'admin_court_cairo',
    name: 'محكمة القضاء الإداري - القاهرة',
    type: 'state_council',
    governorate: 'الجيزة',
    city: 'الدقي',
    chambers: ['الدائرة الأولى (حقوق وحريات)', 'الدائرة الثانية (نقابات وجمعيات)', 'الدائرة الثالثة (عقود وتراخيص)', 'دائرة الضرائب والرسوم']
  },
  {
    id: 'admin_court_alex',
    name: 'محكمة القضاء الإداري - الإسكندرية',
    type: 'state_council',
    governorate: 'الإسكندرية',
    city: 'سموحة',
    chambers: ['الدائرة الأولى', 'الدائرة الثانية']
  },

  // محاكم الاستئناف العالي (8 محاكم استئناف عالي رئيسية)
  {
    id: 'appeal_cairo',
    name: 'محكمة استئناف القاهرة',
    type: 'appeal',
    governorate: 'القاهرة',
    city: 'دار القضاء العالي / مجمع التجمع الخامس / شمال القاهرة بالعباسية',
    chambers: ['استئناف مدني مأمورية شمال', 'استئناف عالي أسرة', 'استئناف عمال', 'استئناف تعويضات', 'جنايات القاهرة']
  },
  {
    id: 'appeal_alex',
    name: 'محكمة استئناف الإسكندرية',
    type: 'appeal',
    governorate: 'الإسكندرية',
    city: 'المنشية',
    chambers: ['استئناف عالي مدني', 'استئناف تجاري', 'استئناف أسرة', 'جنايات الإسكندرية']
  },
  {
    id: 'appeal_tanta',
    name: 'محكمة استئناف طنطا',
    type: 'appeal',
    governorate: 'الغربية',
    city: 'طنطا',
    chambers: ['استئناف عالي مدني', 'استئناف أسرة', 'جنايات طنطا', 'مأمورية بنها', 'مأمورية شبين الكوم']
  },
  {
    id: 'appeal_mansoura',
    name: 'محكمة استئناف المنصورة',
    type: 'appeal',
    governorate: 'الدقهلية',
    city: 'المنصورة',
    chambers: ['استئناف عالي مدني', 'استئناف تجاري وأسرة', 'مأمورية الزقازيق', 'مأمورية دمياط']
  },
  {
    id: 'appeal_ismailia',
    name: 'محكمة استئناف الإسماعيلية',
    type: 'appeal',
    governorate: 'الإسماعيلية',
    city: 'الإسماعيلية',
    chambers: ['استئناف عالي مدني وجنائي', 'مأمورية السويس', 'مأمورية بورسعيد', 'مأمورية شمال سيناء']
  },
  {
    id: 'appeal_beni_suef',
    name: 'محكمة استئناف بني سويف',
    type: 'appeal',
    governorate: 'بني سويف',
    city: 'بني سويف',
    chambers: ['استئناف عالي مدني وجنائي', 'مأمورية المنيا', 'مأمورية الفيوم']
  },
  {
    id: 'appeal_asyut',
    name: 'محكمة استئناف أسيوط',
    type: 'appeal',
    governorate: 'أسيوط',
    city: 'أسيوط',
    chambers: ['استئناف عالي مدني وجنائي', 'مأمورية سوهاج', 'مأمورية الوادي الجديد']
  },
  {
    id: 'appeal_qena',
    name: 'محكمة استئناف قنا',
    type: 'appeal',
    governorate: 'قنا',
    city: 'قنا',
    chambers: ['استئناف عالي مدني وجنائي', 'مأمورية الأقصر', 'مأمورية أسوان', 'مأمورية البحر الأحمر']
  },

  // المحاكم الابتدائية الكلية
  {
    id: 'primary_south_cairo',
    name: 'محكمة جنوب القاهرة الابتدائية',
    type: 'primary',
    governorate: 'القاهرة',
    city: 'مجمع محاكم باب الخلق / زينهم',
    chambers: ['مدني كلي جنوب', 'تعويضات كلي', 'تجاري كلي', 'إيجارات كلي', 'عمال كلي', 'جنح مستأنف السيدة وزينهم']
  },
  {
    id: 'primary_north_cairo',
    name: 'محكمة شمال القاهرة الابتدائية',
    type: 'primary',
    governorate: 'القاهرة',
    city: 'مجمع محاكم العباسية',
    chambers: ['مدني كلي شمال', 'تجاري كلي', 'عمال كلي', 'تعويضات', 'جنح مستأنف مصر الجديدة والزيتون']
  },
  {
    id: 'primary_cairo_new',
    name: 'محكمة القاهرة الجديدة الابتدائية',
    type: 'primary',
    governorate: 'القاهرة',
    city: 'مجمع محاكم التجمع الخامس',
    chambers: ['مدني كلي التجمع', 'تجاري كلي', 'عمال كلي', 'جنح مستأنف النزهة والقاهرة الجديدة']
  },
  {
    id: 'primary_south_giza',
    name: 'محكمة جنوب الجيزة الابتدائية',
    type: 'primary',
    governorate: 'الجيزة',
    city: 'مجمع محاكم شارع السودان',
    chambers: ['مدني كلي الجيزة', 'تعويضات كلي', 'تجاري كلي', 'عمال كلي', 'جنح مستأنف الجيزة والهرم']
  },
  {
    id: 'primary_north_giza',
    name: 'محكمة شمال الجيزة الابتدائية',
    type: 'primary',
    governorate: 'الجيزة',
    city: 'مجمع محاكم تاج الدول بمدينة العمال',
    chambers: ['مدني كلي شمال الجيزة', 'تجاري', 'إيجارات', 'جنح مستأنف إمبابة والوراق والدقي']
  },
  {
    id: 'primary_6th_october',
    name: 'محكمة 6 أكتوبر الابتدائية',
    type: 'primary',
    governorate: 'الجيزة',
    city: 'مدينة 6 أكتوبر',
    chambers: ['مدني كلي أكتوبر', 'تجاري كلي', 'عمال كلي', 'جنح مستأنف أكتوبر والشيخ زايد']
  },
  {
    id: 'primary_alex_east',
    name: 'محكمة شرق الإسكندرية الابتدائية',
    type: 'primary',
    governorate: 'الإسكندرية',
    city: 'مجمع محاكم أبيس / سيدى جابر',
    chambers: ['مدني كلي شرق', 'تجاري', 'تعويضات', 'جنح مستأنف الرمل وسيدي جابر والمنتزه']
  },
  {
    id: 'primary_alex_west',
    name: 'محكمة غرب الإسكندرية الابتدائية',
    type: 'primary',
    governorate: 'الإسكندرية',
    city: 'المنشية',
    chambers: ['مدني كلي غرب', 'تجاري', 'عمال', 'جنح مستأنف المنشية والعطارين والدخيلة']
  },
  {
    id: 'primary_mansoura',
    name: 'محكمة المنصورة الابتدائية',
    type: 'primary',
    governorate: 'الدقهلية',
    city: 'المنصورة',
    chambers: ['مدني كلي المنصورة', 'تعويضات كلي', 'عمال كلي', 'جنح مستأنف']
  },
  {
    id: 'primary_tanta',
    name: 'محكمة طنطا الابتدائية',
    type: 'primary',
    governorate: 'الغربية',
    city: 'طنطا',
    chambers: ['مدني كلي طنطا', 'تجاري', 'عمال', 'جنح مستأنف طنطا والمحلة']
  },
  {
    id: 'primary_zagazig',
    name: 'محكمة الزقازيق الابتدائية',
    type: 'primary',
    governorate: 'الشرقية',
    city: 'الزقازيق',
    chambers: ['مدني كلي الزقازيق', 'تجاري', 'جنح مستأنف']
  },
  {
    id: 'primary_benha',
    name: 'محكمة بنها الابتدائية',
    type: 'primary',
    governorate: 'القليوبية',
    city: 'بنها',
    chambers: ['مدني كلي بنها', 'تجاري', 'جنح مستأنف']
  },

  // محاكم الأسرة
  {
    id: 'family_cairo_new',
    name: 'محكمة أسرة القاهرة الجديدة',
    type: 'family',
    governorate: 'القاهرة',
    city: 'التجمع الخامس',
    chambers: ['نفقات وأجور', 'خلع وتطليق', 'حضانة ورؤية', 'ولاية على المال']
  },
  {
    id: 'family_maadi',
    name: 'محكمة أسرة المعادي والبساتين',
    type: 'family',
    governorate: 'القاهرة',
    city: 'المعادي',
    chambers: ['نفقات وأجور', 'خلع وتطليق', 'ولاية على المال']
  },
  {
    id: 'family_nasr_city',
    name: 'محكمة أسرة مدينة نصر',
    type: 'family',
    governorate: 'القاهرة',
    city: 'مدينة نصر - الحي السابع',
    chambers: ['نفقات وأجور', 'خلع وتطليق', 'حضانة ورؤية', 'ولاية على المال']
  },
  {
    id: 'family_heliopolis',
    name: 'محكمة أسرة مصر الجديدة والنزهة',
    type: 'family',
    governorate: 'القاهرة',
    city: 'ميدان المحكمة - مصر الجديدة',
    chambers: ['نفقات', 'تطليق', 'حضانة', 'ولاية على المال']
  },
  {
    id: 'family_giza',
    name: 'محكمة أسرة الجيزة والدقي والعجوزة',
    type: 'family',
    governorate: 'الجيزة',
    city: 'الكيت كات / تاج الدول',
    chambers: ['نفقات وأجور', 'خلع وتطليق', 'حضانة ورؤية', 'ولاية على النفس']
  },
  {
    id: 'family_october',
    name: 'محكمة أسرة 6 أكتوبر والشيخ زايد',
    type: 'family',
    governorate: 'الجيزة',
    city: 'الحي السادس - 6 أكتوبر',
    chambers: ['نفقات وأجور', 'خلع وتطليق', 'حضانة ورؤية', 'ولاية على المال']
  },
  {
    id: 'family_alex_sidi_gaber',
    name: 'محكمة أسرة سيدي جابر والرمل',
    type: 'family',
    governorate: 'الإسكندرية',
    city: 'سموحة / المنشية',
    chambers: ['نفقات وأجور', 'خلع وتطليق', 'حضانة', 'ولاية على النفس والمال']
  },

  // المحاكم الاقتصادية
  {
    id: 'econ_cairo',
    name: 'محكمة القاهرة الاقتصادية',
    type: 'economic',
    governorate: 'القاهرة',
    city: 'المعادي - كورنيش النيل',
    chambers: ['دائرة ابتدائية اقتصادية', 'دائرة استئنافية اقتصادية', 'دائرة جنح اقتصادية', 'دائرة إفلاس وتصفية']
  },
  {
    id: 'econ_alex',
    name: 'محكمة الإسكندرية الاقتصادية',
    type: 'economic',
    governorate: 'الإسكندرية',
    city: 'سموحة',
    chambers: ['دائرة ابتدائية', 'دائرة استئنافية', 'جنح اقتصادية']
  },
  {
    id: 'econ_tanta',
    name: 'محكمة طنطا الاقتصادية',
    type: 'economic',
    governorate: 'الغربية',
    city: 'طنطا',
    chambers: ['دائرة ابتدائية', 'دائرة استئنافية']
  },
  {
    id: 'econ_ismailia',
    name: 'محكمة الإسماعيلية الاقتصادية',
    type: 'economic',
    governorate: 'الإسكندرية',
    city: 'الإسماعيلية',
    chambers: ['دائرة ابتدائية', 'دائرة استئنافية']
  },

  // النيابات العامة والمتخصصة
  {
    id: 'prosecution_general',
    name: 'النيابة العامة - مكتب النائب العام',
    type: 'prosecution',
    governorate: 'القاهرة',
    city: 'القاهرة الجديدة - مجمع الرحاب',
    chambers: ['المكتب الفني', 'التفتيش القضائي', 'التعاون الدولي']
  },
  {
    id: 'prosecution_supreme_state_security',
    name: 'نيابة أمن الدولة العليا',
    type: 'prosecution',
    governorate: 'القاهرة',
    city: 'التجمع الخامس',
    chambers: ['نيابة أمن الدولة']
  },
  {
    id: 'prosecution_public_funds',
    name: 'نيابة الأموال العامة العليا',
    type: 'prosecution',
    governorate: 'القاهرة',
    city: 'العباسية',
    chambers: ['أموال عامة عليا']
  },
  {
    id: 'prosecution_south_cairo',
    name: 'نيابة جنوب القاهرة الكلية',
    type: 'prosecution',
    governorate: 'القاهرة',
    city: 'مجمع محاكم جنوب القاهرة - زينهم',
    chambers: ['نيابة كبرى', 'نيابة الأسرة الكلية', 'نيابة المرور']
  },
  {
    id: 'prosecution_north_cairo',
    name: 'نيابة شمال القاهرة الكلية',
    type: 'prosecution',
    governorate: 'القاهرة',
    city: 'مجمع محاكم العباسية',
    chambers: ['نيابة كبرى', 'نيابة حوادث شمال']
  },
  {
    id: 'prosecution_south_giza',
    name: 'نيابة جنوب الجيزة الكلية',
    type: 'prosecution',
    governorate: 'الجيزة',
    city: 'شارع السودان',
    chambers: ['نيابة كبرى', 'نيابة الحوادث']
  },
  {
    id: 'prosecution_october',
    name: 'نيابة 6 أكتوبر الكلية',
    type: 'prosecution',
    governorate: 'الجيزة',
    city: 'مدينة 6 أكتوبر',
    chambers: ['نيابة كبرى', 'نيابة الشيخ زايد الجزئية', 'نيابة أكتوبر الجزئية']
  }
];

/**
 * Searches courts matching a search query.
 * Matches against court name, governorate, city, and chamber names.
 * 
 * @param {string} query
 * @param {string} typeFilter Optional court type
 * @returns {Array} Matching courts
 */
export function searchCourts(query, typeFilter = 'all') {
  let list = EGYPTIAN_COURTS;
  if (typeFilter && typeFilter !== 'all') {
    list = list.filter(c => c.type === typeFilter);
  }

  if (!query || !query.trim()) {
    return list;
  }

  const q = query.trim().toLowerCase();
  return list.filter(c => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.governorate && c.governorate.toLowerCase().includes(q)) return true;
    if (c.city && c.city.toLowerCase().includes(q)) return true;
    if (c.chambers && c.chambers.some(ch => ch.toLowerCase().includes(q))) return true;
    return false;
  });
}

/**
 * Returns chambers for a specific court or standard fallback chambers.
 * 
 * @param {string} courtName
 * @returns {Array<string>} Chambers list
 */
export function getChambersForCourt(courtName) {
  if (!courtName) return [];
  const found = EGYPTIAN_COURTS.find(c => c.name === courtName || c.name.includes(courtName));
  if (found && found.chambers) {
    return found.chambers;
  }
  // Generic fallback chambers for Egyptian courts
  return [
    'الدائرة الأولى مدني',
    'الدائرة الثانية مدني',
    'دائرة الإيجارات',
    'دائرة التعويضات',
    'دائرة العمال',
    'دائرة الأسرة',
    'دائرة الجنح المستأنفة',
    'دائرة الأمور المستعجلة'
  ];
}
