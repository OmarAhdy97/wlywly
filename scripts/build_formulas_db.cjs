const fs = require('fs');
const path = require('path');

const srcDataPath = path.join(__dirname, '..', 'src', 'data', 'legal_formulas.json');
const rawFormulas = JSON.parse(fs.readFileSync(srcDataPath, 'utf8'));

// Exact 10 categories
const VALID_CATEGORIES = [
  'عرائض',
  'عقود',
  'جنح مباشرة',
  'طلبات',
  'إنذارات',
  'تظلمات',
  'إشكالات',
  'إعلانات',
  'تجهيز ملف أسرة',
  'حافظة مستندات'
];

function classifyFormula(title, text) {
  const t = title.trim();

  if (/عقد |اتفاق|مشاركة|شراكة|قسمة رضائية|صلح بين|هبة|وكالة تجارية/i.test(t)) {
    return 'عقود';
  }
  if (/جنحة مباشرة|إيصال أمانة|تبديد|شيك|نصب|سب وقذف|بلاغ كاذب|معارضة استئنافية|جنحة/i.test(t)) {
    return 'جنح مباشرة';
  }
  if (/إنذار|انذار|تكليف بالوفاء|عرض وإيداع|عرض قانوني/i.test(t)) {
    return 'إنذارات';
  }
  if (/تظلم|شكوى|أمر وقتي|تظلمات/i.test(t)) {
    return 'تظلمات';
  }
  if (/إشكال|اشكال|وقف تنفيذ|استمرار التنفيذ/i.test(t)) {
    return 'إشكالات';
  }
  if (/إعلان|اعلان|إعادة إعلان|اعادة اعلان|شواهد تزوير|تعجيل الخصومة|حكم تحكيم|إدخال خصم/i.test(t)) {
    return 'إعلانات';
  }
  if (/نفقة|صغار|خلع|طلاق|حضانة|رؤية|عدة|أجور|متعة|مؤخر صداق|مسكن زوجية|منقولات زوجية|أحوال شخصية|ولاية على المال|وصاية/i.test(t)) {
    return 'تجهيز ملف أسرة';
  }
  if (/أمر أداء|أمر على عريضة|طلب |صرف|تسليم|شهادة|التماس إعادة نظر/i.test(t)) {
    return 'طلبات';
  }
  
  return 'عرائض';
}

function extractKeywords(title, category) {
  const words = title
    .replace(/[0-9\-_./\\()[\]،:]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['صيغة', 'دعوى', 'على', 'في', 'من', 'إلى', 'مع', 'أمام', 'فيها', 'ضد', 'بشأن'].includes(w));
  
  const set = new Set([category, ...words]);
  return Array.from(set).slice(0, 8);
}

function buildFieldsAndTemplate(formula, category) {
  const originalText = formula.cleanText || '';
  
  // Custom metadata fields based on category
  let fields = [];
  let templateHeader = '';
  
  if (category === 'عقود') {
    fields = [
      { key: 'contract_date', label: 'تاريخ تحرير العقد', type: 'date', source: 'system.today', required: true },
      { key: 'contract_city', label: 'مكان التحرير / المحافظة', type: 'text', defaultValue: 'القاهرة', required: false },
      { key: 'first_party_name', label: 'الطرف الأول (الموكل/المتعاقد)', type: 'client', source: 'client.name', required: true },
      { key: 'first_party_id', label: 'الرقم القومي للطرف الأول', type: 'text', source: 'client.national_id', required: false },
      { key: 'first_party_address', label: 'محل إقامة الطرف الأول', type: 'text', source: 'client.address', required: false },
      { key: 'second_party_name', label: 'الطرف الثاني', type: 'opponent', required: true },
      { key: 'second_party_id', label: 'الرقم القومي للطرف الثاني', type: 'text', required: false },
      { key: 'second_party_address', label: 'محل إقامة الطرف الثاني', type: 'text', required: false },
      { key: 'contract_subject', label: 'موضوع العقد / بيان العين أو النشاط', type: 'textarea', required: false },
      { key: 'financial_amount', label: 'المقابل المالي / الثمن / القيمة', type: 'text', required: false }
    ];

    templateHeader = `بسم الله الرحمن الرحيم\n\nإنه في يوم {{contract_date}} بمحافظة {{contract_city}}، تم الاتفاق والرضا والتراضي بين كل من:\n\nأولاً: السيد/ {{first_party_name}} - المقيم في: {{first_party_address}} (بطاقة رقم قومي: {{first_party_id}}) [طرف أول]\n\nثانياً: السيد/ {{second_party_name}} - المقيم في: {{second_party_address}} (بطاقة رقم قومي: {{second_party_id}}) [طرف ثانٍ]\n\nوبعد أن أقر الطرفان بأهليتهما القانونية المعتبرة شرعاً وقانوناً للتعاقد والتصرف، اتفقا على ما يلي:\n`;
  } else if (category === 'إنذارات') {
    fields = [
      { key: 'notice_date', label: 'تاريخ الإنذار', type: 'date', source: 'system.today', required: true },
      { key: 'client_name', label: 'المنذر (الموكل)', type: 'client', source: 'client.name', required: true },
      { key: 'client_address', label: 'محل إقامة المنذر', type: 'text', source: 'client.address', required: false },
      { key: 'lawyer_name', label: 'المحامي الوكيل', type: 'text', source: 'office.lawyer_name', required: false },
      { key: 'lawyer_office', label: 'عنوان مكتب المحامي', type: 'text', source: 'office.address', required: false },
      { key: 'opponent_name', label: 'المنذر إليه (الخصم)', type: 'opponent', required: true },
      { key: 'opponent_address', label: 'محل إقامة المنذر إليه', type: 'text', required: true },
      { key: 'bailiff_court', label: 'محضرين محكمة', type: 'text', required: false, placeholder: 'مثال: محضرين بندر دمياط / محكمة مدينة نصر' },
      { key: 'notice_subject', label: 'موضوع الإنذار / التكليف', type: 'textarea', required: false }
    ];

    templateHeader = `إنه في يوم {{notice_date}} الموافق ...... / ...... / 2026م\n\nبناءً على طلب السيد/ {{client_name}}، المقيم في: {{client_address}}، ومحله المختار مكتب الأستاذ/ {{lawyer_name}} المحامي، الكائن في: {{lawyer_office}}.\n\nأنا ......... محضر محكمة {{bailiff_court}} قد انتقلت في التاريخ المذكور أعلاه وأعلنت:\n\nالسيد/ {{opponent_name}}، المقيم في: {{opponent_address}}.\nمخاطباً مع / ....................................................\n\nوأنذرته بالآتي:\n`;
  } else if (category === 'جنح مباشرة') {
    fields = [
      { key: 'case_id', label: 'القضية المرتبطة (اختياري)', type: 'case', required: false },
      { key: 'incident_date', label: 'تاريخ الواقعة / الشكوى', type: 'date', source: 'system.today', required: false },
      { key: 'client_name', label: 'المدعي بالحق المدني (المجني عليه)', type: 'client', source: 'client.name', required: true },
      { key: 'client_address', label: 'محل إقامة المدعي بالحق المدني', type: 'text', source: 'client.address', required: false },
      { key: 'opponent_name', label: 'المتهم (المعلن إليه)', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'opponent_address', label: 'محل إقامة المتهم', type: 'text', required: true },
      { key: 'court_name', label: 'محكمة الجنح المختصة', type: 'court', source: 'case.court', required: true },
      { key: 'police_station', label: 'قسم / مركز الشرطة التابع له', type: 'text', required: false },
      { key: 'claim_amount', label: 'مبلغ التعويض المدني المؤقت', type: 'text', defaultValue: '5001 جنيه', required: false },
      { key: 'session_date', label: 'تاريخ الجلسة', type: 'date', required: false }
    ];

    templateHeader = `صحيفة جنحة مباشرة وتكليف بالحضور\n\nبناءً على طلب السيد/ {{client_name}}، المقيم في: {{client_address}}، ومحله المختار مكتب محاميه.\n\nأنا ......... محضر محكمة {{court_name}} الجزئية قد انتقلت وأعلنت:\n\nالسيد/ {{opponent_name}}، المقيم في: {{opponent_address}} بدائرة قسم/مركز {{police_station}}.\nمخاطباً مع / ....................................................\n\nوكلفته بالحضور أمام محكمة جنح {{court_name}} بجلستها المنعقدة علناً يوم {{session_date}}.\n`;
  } else if (category === 'تجهيز ملف أسرة') {
    fields = [
      { key: 'case_id', label: 'القضية المرتبطة (اختياري)', type: 'case', required: false },
      { key: 'client_name', label: 'اسم الزوجة / الطالبة', type: 'client', source: 'client.name', required: true },
      { key: 'client_address', label: 'محل إقامة الطالبة', type: 'text', source: 'client.address', required: false },
      { key: 'opponent_name', label: 'اسم الزوج / المعلن إليه', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'opponent_address', label: 'محل إقامة الزوج / المعلن إليه', type: 'text', required: false },
      { key: 'court_name', label: 'محكمة الأسرة المختصة', type: 'court', source: 'case.court', required: true },
      { key: 'marriage_date', label: 'تاريخ الزواج / العقد', type: 'date', required: false },
      { key: 'children_names', label: 'أسماء وأعمار الصغار (إن وجد)', type: 'text', required: false },
      { key: 'monthly_salary', label: 'دخل الزوج الشهري التقريبي', type: 'text', required: false },
      { key: 'lawyer_name', label: 'المحامي الوكيل', type: 'text', source: 'office.lawyer_name', required: false }
    ];

    templateHeader = `صحيفة دعوى أسرة أمام محكمة الأسرة\n\nإنه في يوم ......... الموافق ...... / ...... / 2026م\nبناءً على طلب السيدة/ {{client_name}}، المقيمة في: {{client_address}}، ومحلها المختار مكتب الأستاذ/ {{lawyer_name}} المحامي.\n\nأنا ......... محضر محكمة أسرة {{court_name}} قد انتقلت وأعلنت:\nالسيد/ {{opponent_name}}، المقيم في: {{opponent_address}}.\nمخاطباً مع / ....................................................\n\nالموضوع:\nعقد زواج رسمي بتاريخ: {{marriage_date}}، وثمرة الزوجية الصغار: {{children_names}}، ودخل المعلن إليه الشهري: {{monthly_salary}}.\n`;
  } else {
    // عرائض، طلبات، تظلمات، إشكالات، إعلانات
    fields = [
      { key: 'case_id', label: 'القضية المرتبطة (اختياري)', type: 'case', required: false },
      { key: 'court_name', label: 'المحكمة المختصة', type: 'court', source: 'case.court', required: true },
      { key: 'case_number', label: 'رقم القضية / الدعوى (إن وجد)', type: 'text', source: 'case.number', required: false },
      { key: 'case_year', label: 'سنة القضية', type: 'text', source: 'case.year', required: false },
      { key: 'client_name', label: 'اسم الموكل (الطالب / المتظلم / المستشكل)', type: 'client', source: 'client.name', required: true },
      { key: 'client_address', label: 'محل إقامة الموكل', type: 'text', source: 'client.address', required: false },
      { key: 'opponent_name', label: 'اسم الخصم (المعلن إليه / المتظلم ضده)', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'opponent_address', label: 'محل إقامة الخصم', type: 'text', required: false },
      { key: 'lawyer_name', label: 'المحامي الوكيل', type: 'text', source: 'office.lawyer_name', required: false },
      { key: 'session_date', label: 'تاريخ الجلسة / الإجراء', type: 'date', required: false }
    ];

    templateHeader = `أمام محكمة {{court_name}}\nالدعوى رقم {{case_number}} لسنة {{case_year}}\n\nإنه في يوم ......... الموافق {{session_date}}\n\nبناءً على طلب السيد/ {{client_name}}، المقيم في: {{client_address}}، ومحله المختار مكتب الأستاذ/ {{lawyer_name}} المحامي.\n\nأنا ......... محضر محكمة {{court_name}} الجزئية قد انتقلت في التاريخ المذكور وأعلنت:\nالسيد/ {{opponent_name}}، المقيم في: {{opponent_address}}.\nمخاطباً مع / ....................................................\n\nالموضوع والوقائع:\n`;
  }

  // Combine templateHeader with the preserved original text while cleaning redundant dots
  let templateContent = templateHeader + '\n' + originalText;

  return {
    fields,
    templateContent
  };
}

// Build processed catalog
const processedFormulas = rawFormulas.map((f, idx) => {
  const category = classifyFormula(f.title, f.cleanText);
  const keywords = extractKeywords(f.title, category);
  const { fields, templateContent } = buildFieldsAndTemplate(f, category);

  return {
    id: `formula_${String(idx + 1).padStart(3, '0')}`,
    title: f.title.trim(),
    category: category,
    type: 'formula',
    description: (f.cleanText || '').substring(0, 160).replace(/\n/g, ' ').trim() + '...',
    keywords,
    fields,
    source_content: f.cleanText || '',
    template_content: templateContent,
    link: f.link || '',
    published: f.published || '2026-01-01'
  };
});

// Add dedicated "حافظة مستندات" structured templates with document_list field type
const hafezaTemplates = [
  {
    id: 'formula_hafeza_001',
    title: 'حافظة مستندات مقدمة من المدعي (صحيفة دعوى / مستندات مؤيدة)',
    category: 'حافظة مستندات',
    type: 'formula',
    description: 'نموذج حافظة مستندات قضائية رسمية للمدعي مع جدول مرقم للمستندات وتاريخها ودلالتها في الدعوى.',
    keywords: ['حافظة مستندات', 'مدعي', 'مستندات', 'دعوى', 'جدول مستندات'],
    fields: [
      { key: 'case_id', label: 'القضية المرتبطة (اختياري)', type: 'case', required: false },
      { key: 'court_name', label: 'المحكمة المختصة', type: 'court', source: 'case.court', required: true },
      { key: 'court_chamber', label: 'الدائرة القضائية', type: 'text', source: 'case.chamber', placeholder: 'مثال: الدائرة 3 مدني / 5 أسرة' },
      { key: 'case_number', label: 'رقم القضية', type: 'text', source: 'case.number', required: false },
      { key: 'case_year', label: 'سنة القضية', type: 'text', source: 'case.year', required: false },
      { key: 'client_name', label: 'مقدم الحافظة (المدعي/الموكل)', type: 'client', source: 'client.name', required: true },
      { key: 'opponent_name', label: 'الخصم (المدعى عليه)', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'session_date', label: 'تاريخ الجلسة المحددة', type: 'date', source: 'system.today', required: true },
      { key: 'lawyer_name', label: 'المحامي وكيل الطالب', type: 'text', source: 'office.lawyer_name', required: false },
      {
        key: 'documents',
        label: 'قائمة المستندات المودعة بالحافظة',
        type: 'document_list',
        required: true,
        defaultValue: [
          { number: 1, title: 'أصل التوكيل الرسمي الصادر للطالب', date: '', notes: 'سند الوكالة' },
          { number: 2, title: 'صورة ضوئية من بطاقة الرقم القومي للمدعي', date: '', notes: 'إثبات شخصية' },
          { number: 3, title: 'صورة طبق الأصل من المستند المؤيد للطلب', date: '', notes: 'إثبات الحق' }
        ]
      }
    ],
    source_content: 'حافظة مستندات مقدمة من المدعي في الدعوى الماثلة أمام هيئة المحكمة الموقرة بجلسة اليوم.',
    template_content: `محكمة {{court_name}}\nالدائرة: {{court_chamber}}\nفي القضية رقم: {{case_number}} لسنة {{case_year}}\nالمحددة لنظرها جلسة: {{session_date}}\n\nحــــــافــــظـــــة مـــســـتـــنــــدات\n\nمقدمة من: الأستاذ/ {{lawyer_name}} المحامي\nبصفته وكيلاً عن السيد/ {{client_name}} (المدعي)\n\nضـــــــــــــــــــــــد:\nالسيد/ {{opponent_name}} (المدعى عليه)\n\nوقد حوت هذه الحافظة المستندات الآتية:\n\n{{documents_table}}\n\nوكيل المدعي\nالمحامي`,
    link: '',
    published: '2026-01-01'
  },
  {
    id: 'formula_hafeza_002',
    title: 'حافظة مستندات مقدمة من المدعى عليه (مذكرات دفاع ومستندات نفي)',
    category: 'حافظة مستندات',
    type: 'formula',
    description: 'حافظة مستندات رسمية للمدعى عليه للرد على ادعاءات الخصم وإثبات براءة الذمة أو انقضاء الالتزام.',
    keywords: ['حافظة مستندات', 'مدعى عليه', 'دفاع', 'نفي', 'براءة ذمة'],
    fields: [
      { key: 'case_id', label: 'القضية المرتبطة (اختياري)', type: 'case', required: false },
      { key: 'court_name', label: 'المحكمة المختصة', type: 'court', source: 'case.court', required: true },
      { key: 'court_chamber', label: 'الدائرة القضائية', type: 'text', source: 'case.chamber' },
      { key: 'case_number', label: 'رقم القضية', type: 'text', source: 'case.number', required: false },
      { key: 'case_year', label: 'سنة القضية', type: 'text', source: 'case.year', required: false },
      { key: 'client_name', label: 'مقدم الحافظة (المدعى عليه/الموكل)', type: 'client', source: 'client.name', required: true },
      { key: 'opponent_name', label: 'الخصم (المدعي)', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'session_date', label: 'تاريخ الجلسة', type: 'date', source: 'system.today', required: true },
      { key: 'lawyer_name', label: 'المحامي وكيل المدعى عليه', type: 'text', source: 'office.lawyer_name', required: false },
      {
        key: 'documents',
        label: 'قائمة المستندات المودعة بالحافظة',
        type: 'document_list',
        required: true,
        defaultValue: [
          { number: 1, title: 'أصل إيصال السداد / التخالص المؤرخ', date: '', notes: 'دليل براءة الذمة' },
          { number: 2, title: 'صورة إنذار العرض والإيداع الرسمي المعلن', date: '', notes: 'نفي المماطلة' }
        ]
      }
    ],
    source_content: 'حافظة مستندات مدعى عليه لإبداء الدفوع وتقديم المستندات الجازمة.',
    template_content: `محكمة {{court_name}}\nالدائرة: {{court_chamber}}\nفي القضية رقم: {{case_number}} لسنة {{case_year}}\nالمحددة لنظرها جلسة: {{session_date}}\n\nحــــــافــــظـــــة مـــســـتـــنــــدات\n\nمقدمة من: الأستاذ/ {{lawyer_name}} المحامي\nبصفته وكيلاً عن السيد/ {{client_name}} (المدعى عليه)\n\nضـــــــــــــــــــــــد:\nالسيد/ {{opponent_name}} (المدعي)\n\nطويت هذه الحافظة على المستندات القاطعة الآتية:\n\n{{documents_table}}\n\nوكيل المدعى عليه\nالمحامي`,
    link: '',
    published: '2026-01-01'
  },
  {
    id: 'formula_hafeza_003',
    title: 'حافظة مستندات قضايا ومحاكم الأسرة (نفقات / شهادات ميلاد / إثبات دخل)',
    category: 'حافظة مستندات',
    type: 'formula',
    description: 'حافظة مخصصة لدعاوى محكمة الأسرة لتقديم شهادات الميلاد، وثائق الزواج/الطلاق، وتحريات الدخل ومفردات المرتب.',
    keywords: ['حافظة مستندات', 'أسرة', 'نفقة', 'شهادات ميلاد', 'مفردات مرتب'],
    fields: [
      { key: 'case_id', label: 'القضية المرتبطة (اختياري)', type: 'case', required: false },
      { key: 'court_name', label: 'محكمة الأسرة المختصة', type: 'court', source: 'case.court', required: true },
      { key: 'court_chamber', label: 'دائرة الأسرة', type: 'text', source: 'case.chamber' },
      { key: 'case_number', label: 'رقم دعوى الأسرة', type: 'text', source: 'case.number', required: false },
      { key: 'case_year', label: 'سنة الدعوى', type: 'text', source: 'case.year', required: false },
      { key: 'client_name', label: 'اسم مقدمة الحافظة (الزوجة/المطلقة)', type: 'client', source: 'client.name', required: true },
      { key: 'opponent_name', label: 'اسم المدعى عليه (الزوج/المطلق)', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'session_date', label: 'تاريخ الجلسة', type: 'date', source: 'system.today', required: true },
      { key: 'lawyer_name', label: 'المحامي وكيل الطالبة', type: 'text', source: 'office.lawyer_name', required: false },
      {
        key: 'documents',
        label: 'قائمة المستندات الأسرية المودعة',
        type: 'document_list',
        required: true,
        defaultValue: [
          { number: 1, title: 'أصل أو صورة رسمية من وثيقة الزواج / إشهاد الطلاق', date: '', notes: 'إثبات قيام/انتهاء الزوجية' },
          { number: 2, title: 'شهادات ميلاد الصغار المميكنة بالحاسب الآلي', date: '', notes: 'إثبات البنوة وسن الحضانة' },
          { number: 3, title: 'بيان مفردات مرتب المدعى عليه أو سجل تجاري', date: '', notes: 'إثبات يسار المدعى عليه' }
        ]
      }
    ],
    source_content: 'حافظة مستندات محكمة الأسرة تشمل إثبات العلاقة الزوجية ويسار الزوج.',
    template_content: `محكمة أسرة {{court_name}}\nالدائرة: {{court_chamber}}\nفي الدعوى رقم: {{case_number}} لسنة {{case_year}} أسرة\nالمحددة لنظرها جلسة: {{session_date}}\n\nحــــــافــــظـــــة مـــســـتـــنــــدات أســـريـــة\n\nمقدمة من: الأستاذ/ {{lawyer_name}} المحامي\nبصفته وكيلاً عن السيدة/ {{client_name}}\n\nضـــــــــــــــــــــــد:\nالسيد/ {{opponent_name}}\n\nوتحتوي الحافظة على الأوراق والمستندات الآتية:\n\n{{documents_table}}\n\nوكيل الطالبة\nالمحامي`,
    link: '',
    published: '2026-01-01'
  },
  {
    id: 'formula_hafeza_004',
    title: 'حافظة مستندات جنحة مباشرة / معارضة استئنافية (أصل الإيصال / مخالصات)',
    category: 'حافظة مستندات',
    type: 'formula',
    description: 'حافظة مستندات للجنح لتقديم أصل إيصال الأمانة، الشيك البنكي، أو مخالصة السداد وشهادة الجدول.',
    keywords: ['حافظة مستندات', 'جنحة', 'إيصال أمانة', 'شيك', 'مخالصة', 'معارضة'],
    fields: [
      { key: 'case_id', label: 'القضية المرتبطة (اختياري)', type: 'case', required: false },
      { key: 'court_name', label: 'محكمة الجنح المختصة', type: 'court', source: 'case.court', required: true },
      { key: 'court_chamber', label: 'دائرة الجنح', type: 'text', source: 'case.chamber' },
      { key: 'case_number', label: 'رقم الجنحة', type: 'text', source: 'case.number', required: false },
      { key: 'case_year', label: 'سنة الجنحة', type: 'text', source: 'case.year', required: false },
      { key: 'client_name', label: 'اسم مقدم الحافظة (المجني عليه / المتهم)', type: 'client', source: 'client.name', required: true },
      { key: 'opponent_name', label: 'اسم الخصم', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'session_date', label: 'تاريخ جلسة الجنح', type: 'date', source: 'system.today', required: true },
      { key: 'lawyer_name', label: 'المحامي الوكيل', type: 'text', source: 'office.lawyer_name', required: false },
      {
        key: 'documents',
        label: 'قائمة المستندات الجنائية المودعة',
        type: 'document_list',
        required: true,
        defaultValue: [
          { number: 1, title: 'أصل إيصال الأمانة سند الجنحة المباشرة', date: '', notes: 'سند الاتهام' },
          { number: 2, title: 'صورة رسمية من المحضر / إنذار العرض', date: '', notes: 'مستند مؤيد' }
        ]
      }
    ],
    source_content: 'حافظة مستندات جنح مباشرة لتقديم أصل السند الجنائي.',
    template_content: `محكمة جنح {{court_name}}\nالدائرة: {{court_chamber}}\nفي الجنحة رقم: {{case_number}} لسنة {{case_year}} جنح\nالمحددة لنظرها جلسة: {{session_date}}\n\nحــــــافــــظـــــة مـــســـتـــنــــدات جــنــائــيــة\n\nمقدمة من: الأستاذ/ {{lawyer_name}} المحامي\nبصفته وكيلاً عن: {{client_name}}\n\nضـــــــــــــــــــــــد:\n{{opponent_name}}\n\nوتحوي الحافظة على المستندات الآتية:\n\n{{documents_table}}\n\nوكيل الحاضر\nالمحامي`,
    link: '',
    published: '2026-01-01'
  }
];

// Add dedicated "تجهيز ملف أسرة" workflow checklists
const familyBundles = [
  {
    id: 'formula_family_bundle_001',
    title: 'دليل وقائمة المستندات لتجهيز ملف دعاوى النفقات (الصغار والزوجية)',
    category: 'تجهيز ملف أسرة',
    type: 'checklist',
    description: 'قائمة تفقدية شاملة وإرشادات قانونية لتجهيز وإيداع ملف دعوى النفقة بمحكمة الأسرة من الألف إلى الياء.',
    keywords: ['ملف أسرة', 'نفقة', 'قائمة مستندات', 'تسوية منازعات', 'إجراءات'],
    fields: [
      { key: 'client_name', label: 'اسم الزوجة (الموكلة)', type: 'client', source: 'client.name', required: true },
      { key: 'opponent_name', label: 'اسم الزوج (الخصم)', type: 'opponent', source: 'case.opponent', required: true },
      { key: 'court_name', label: 'محكمة الأسرة ومكتب التسوية', type: 'court', source: 'case.court', required: true }
    ],
    source_content: 'دليل الإجراءات والأوراق والمستندات المطلوبة لدعوى النفقة الزوجية ونفقة الصغار وأجور الحضانة أمام محاكم الأسرة المصرية.',
    template_content: `دليل وإجراءات تجهيز ملف دعوى النفقة أمام محكمة أسرة {{court_name}}\nالموكلة: {{client_name}} | ضد: {{opponent_name}}\n\nالمرحلة الأولى: مكتب تسوية المنازعات الأسرية\n1. تقديم طلب التسوية الودية بمكتب تسوية الأسرة المختص وإرفاق صورة بطاقة الزوجة وثسيمة الزواج.\n2. حضور الجلسة الودية المحددة واستلام شهادة تعذر الصلح.\n\nالمرحلة الثانية: المستندات الإلزامية لملف الدعوى:\n- أصل عريضة الدعوى موقعة من محامٍ مقيد بالاستئناف.\n- أصل التوكيل الرسمي الصادر من الزوجة وكارنيه المحامي.\n- صورة رسمية من وثيقة الزواج أو الطلاق.\n- شهادات ميلاد الصغار الرقم القومي المميكنة.\n- مفردات مرتب الزوج أو سجل تجاري أو بطاقة ضريبية أو التحري عن دخله.\n- حافظة مستندات مبوب بها أصول أو صور الأوراق المذكورة أعلاه.`,
    link: '',
    published: '2026-01-01'
  }
];

const finalCatalog = [...processedFormulas, ...hafezaTemplates, ...familyBundles];

// Count verify
const finalTally = {};
finalCatalog.forEach(c => finalTally[c.category] = (finalTally[c.category] || 0) + 1);
console.log('Final 10 Category Distribution:');
VALID_CATEGORIES.forEach(cat => {
  console.log(` - ${cat}: ${finalTally[cat] || 0} صيغة`);
});

fs.writeFileSync(srcDataPath, JSON.stringify(finalCatalog, null, 2), 'utf8');
console.log(`Successfully generated ${finalCatalog.length} formulas in ${srcDataPath}`);
