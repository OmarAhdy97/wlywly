import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  AlertTriangle, 
  Calculator, 
  Calendar, 
  ArrowLeft, 
  ShieldAlert, 
  Coins, 
  Receipt, 
  Scale, 
  FileText, 
  CheckCircle2, 
  Info, 
  Printer, 
  Copy, 
  Check,
  Building2,
  HelpCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, CASE_STATUSES } from '../lib/supabase';

export default function SearchDeadlinesPage({ searchTerm, setSearchTerm, setActiveTab }) {
  const { cases, clients } = useData();
  const [activeTabSub, setActiveTabSub] = useState('fees'); // 'search' | 'deadlines' | 'fees'

  // ==========================================
  // DEADLINE CALCULATOR STATE
  // ==========================================
  const [rulingDate, setRulingDate] = useState(new Date().toISOString().split('T')[0]);
  const [appealType, setAppealType] = useState('civil_appeal');

  const DEADLINE_PRESETS = {
    civil_appeal: { title: 'استئناف مدني وتجاري', days: 40, law: 'مادة 227 مرافعات (40 يوماً من تاريخ صدور الحكم)' },
    misdemeanor_appeal: { title: 'استئناف جنح', days: 10, law: 'مادة 406 إجراءات جنائية (10 أيام من تاريخ الحكم الحضوري أو إعلان الغيابي)' },
    cassation: { title: 'طعن بالنقض (مدني / جنائي)', days: 60, law: 'قانون 57 لسنة 1959 (60 يوماً من تاريخ صدور الحكم)' },
    state_council_appeal: { title: 'طعن أمام الإدارية العليا', days: 60, law: 'قانون مجلس الدولة رقم 47 لسنة 1972 (60 يوماً)' },
    opposition: { title: 'معارضة في حكم جنحة غيابي', days: 10, law: 'مادة 398 إجراءات جنائية (10 أيام من تاريخ إعلان الحكم)' },
    labor_appeal: { title: 'استئناف قضايا عمالية', days: 40, law: 'قانون العمل وقانون المرافعات' },
  };

  const calcDeadline = () => {
    if (!rulingDate) return null;
    const date = new Date(rulingDate);
    const days = DEADLINE_PRESETS[appealType]?.days || 40;
    date.setDate(date.getDate() + days);
    return date;
  };

  const deadlineDate = calcDeadline();

  // ==========================================
  // JUDICIAL FEES CALCULATOR STATE & LOGIC
  // Based on Egyptian Judicial Fees Law No. 90 of 1944 & Amendments Law 126 of 2009
  // ==========================================
  const [feeCategory, setFeeCategory] = useState('civil_monetary'); // civil_monetary | signature_validity | civil_unspecified | urgent_action | payment_order | appeal_civil | cassation | family | labor
  const [claimAmount, setClaimAmount] = useState('50000');
  const [unspecifiedCourtType, setUnspecifiedCourtType] = useState('partial'); // partial (5) | urgent (10) | first_instance (15) | bankruptcy (50) | appeal_partial (10) | appeal_urgent (15) | appeal_high (30)
  const [defendantsCount, setDefendantsCount] = useState('1');
  const [hasUrgentRequest, setHasUrgentRequest] = useState(false);
  const [copiedFees, setCopiedFees] = useState(false);

  // Exact Legal Calculation Engine based on Law 90/1944 and Law 126/2009
  const calculateJudicialFees = () => {
    const amount = parseFloat(claimAmount) || 0;
    const defendants = Math.max(1, parseInt(defendantsCount, 10) || 1);

    // 1. Labor Cases (معفاة تماماً بنص القانون 12 لسنة 2003 - المادة 6)
    if (feeCategory === 'labor') {
      return {
        isExempt: true,
        exemptReason: 'معفاة تماماً بقوة القانون من كافة الرسوم القضائية ورسوم الإعلان ومصاريف التقاضي في جميع درجاته طبقاً للمادة 6 من قانون العمل رقم 12 لسنة 2003.',
        jurisdiction: 'المحكمة العمالية المختصة نوعياً بنظر المنازعات العمالية',
        totalAtFiling: 0,
        postJudgmentFee: 0,
        notes: 'لا يتم سداد أي رسوم أو دمغات أو ضرائب عند قيد الدعوى العمالية.'
      };
    }

    // 2. Family Cases (محاكم الأسرة - القانون رقم 1 لسنة 2000)
    if (feeCategory === 'family') {
      const basicFee = 20; // رسم جدول ثابت
      const judicialServicesFee = 10;
      const courtBuildings = 1.5;
      const lawyerFees = 50;
      const martyrStamp = 5;
      const familyFundStamp = 50;
      const subtotalBeforeTax = basicFee + judicialServicesFee + courtBuildings + lawyerFees + martyrStamp + familyFundStamp;
      const bailiffFee = defendants * 20;
      const professionalTax = 15;
      const vatTax = 20;
      const totalTax = professionalTax + vatTax;
      const totalAtFiling = subtotalBeforeTax + bailiffFee + totalTax;

      return {
        isExempt: false,
        isFixed: true,
        jurisdiction: 'محكمة الأسرة المختصة محلياً ونوعياً',
        basicFee,
        judicialServicesFee,
        courtBuildings,
        lawyerFees,
        martyrStamp,
        familyFundStamp,
        subtotalBeforeTax,
        bailiffFee,
        professionalTax,
        vatTax,
        totalTax,
        totalAtFiling,
        postJudgmentFee: 0,
        notes: 'دعاوى النفقات والأجور والحضانة والرؤية والخلوع معفاة من الرسوم النسبية طبقاً للقانون 1 لسنة 2000، ويسدد رسم الجدول ودمغة المحاماة وطابع صندوق الأسرة.'
      };
    }

    // 3. Cassation Cases (الطعن بالنقض)
    if (feeCategory === 'cassation') {
      const cassationDeposit = 1000; // كفالة النقض المدني والتجاري
      const basicFee = 250;
      const judicialServicesFee = 125;
      const courtBuildings = 1.5;
      const lawyerFees = 100;
      const martyrStamp = 5;
      const professionalTax = 15;
      const vatTax = 20;
      const totalTax = professionalTax + vatTax;
      const bailiffFee = defendants * 35;
      const subtotalBeforeTax = basicFee + judicialServicesFee + courtBuildings + lawyerFees + martyrStamp + cassationDeposit;
      const totalAtFiling = subtotalBeforeTax + bailiffFee + totalTax;

      return {
        isExempt: false,
        isFixed: true,
        jurisdiction: 'محكمة النقض (دار القضاء العالي)',
        basicFee,
        judicialServicesFee,
        courtBuildings,
        lawyerFees,
        martyrStamp,
        depositSecurity: cassationDeposit,
        subtotalBeforeTax,
        bailiffFee,
        professionalTax,
        vatTax,
        totalTax,
        totalAtFiling,
        postJudgmentFee: 0,
        notes: 'تشمل الرسوم كفالة الطعن بالنقض المقررة قانوناً (1000 جنيه) وتسترد حال قبول الطعن ونقض الحكم.'
      };
    }

    // 4. صحة التوقيع (المادة 76 بند 1 من القانون 90 لسنة 1944)
    if (feeCategory === 'signature_validity') {
      const basicFee = 5; // رسم ثابت 5 جنيهات أمام المحكمة الجزئية
      const judicialServicesFee = 2.5; // 50%
      const courtBuildings = 1.5;
      const lawyerFees = 50;
      const martyrStamp = 5;
      const subtotalBeforeTax = basicFee + judicialServicesFee + courtBuildings + lawyerFees + martyrStamp;
      const professionalTax = 15;
      const vatTax = 20;
      const totalTax = professionalTax + vatTax;
      const bailiffFee = defendants * 25;
      const totalAtFiling = subtotalBeforeTax + bailiffFee + totalTax;

      return {
        isExempt: false,
        isFixed: true,
        jurisdiction: 'محكمة المواد الجزئية (اختصاص نوعي بقوة القانون مهما بلغت قيمة العقد)',
        basicFee,
        judicialServicesFee,
        courtBuildings,
        lawyerFees,
        martyrStamp,
        subtotalBeforeTax,
        bailiffFee,
        professionalTax,
        vatTax,
        totalTax,
        totalAtFiling,
        postJudgmentFee: 0,
        notes: 'دعوى صحة التوقيع مجهولة القيمة بنص المادة 76 بند 1 من قانون الرسوم، ورسمها ثابت 5 جنيهات ولا يتأثر بقيمة العقد المكتوب، وتختص بها المحكمة الجزئية نوعياً.'
      };
    }

    // 5. الدعاوى مجهولة / غير مقدرة القيمة (المادة 1 والمادة 3 من القانون 90 لسنة 1944 المعدل بالقانون 126 لسنة 2009)
    if (feeCategory === 'civil_unspecified' || feeCategory === 'urgent_action') {
      let basicFee = 5;
      let jurisdictionText = 'محكمة المواد الجزئية';

      if (unspecifiedCourtType === 'partial') {
        basicFee = 5;
        jurisdictionText = 'محكمة المواد الجزئية';
      } else if (unspecifiedCourtType === 'urgent' || feeCategory === 'urgent_action') {
        basicFee = 10;
        jurisdictionText = 'محكمة الأمور المستعجلة';
      } else if (unspecifiedCourtType === 'first_instance') {
        basicFee = 15;
        jurisdictionText = 'المحكمة الابتدائية (الكلية)';
      } else if (unspecifiedCourtType === 'bankruptcy') {
        basicFee = 50;
        jurisdictionText = 'المحكمة الاقتصادية / الكلية (دائرة الإفلاس)';
      } else if (unspecifiedCourtType === 'appeal_partial') {
        basicFee = 10;
        jurisdictionText = 'المحكمة الابتدائية بهيئة استئنافية';
      } else if (unspecifiedCourtType === 'appeal_urgent') {
        basicFee = 15;
        jurisdictionText = 'محكمة استئناف القضاء المستعجل';
      } else if (unspecifiedCourtType === 'appeal_high') {
        basicFee = 30;
        jurisdictionText = 'محكمة الاستئناف العالي';
      }

      const judicialServicesFee = basicFee * 0.5; // 50%
      const courtBuildings = 1.5;
      const lawyerFees = (unspecifiedCourtType === 'appeal_high' || unspecifiedCourtType === 'first_instance') ? 75 : 50;
      const martyrStamp = 5;
      const subtotalBeforeTax = basicFee + judicialServicesFee + courtBuildings + lawyerFees + martyrStamp;
      const professionalTax = 15;
      const vatTax = 20;
      const totalTax = professionalTax + vatTax;
      const bailiffFee = defendants * 25;
      const totalAtFiling = subtotalBeforeTax + bailiffFee + totalTax;

      return {
        isExempt: false,
        isFixed: true,
        jurisdiction: jurisdictionText,
        basicFee,
        judicialServicesFee,
        courtBuildings,
        lawyerFees,
        martyrStamp,
        subtotalBeforeTax,
        bailiffFee,
        professionalTax,
        vatTax,
        totalTax,
        totalAtFiling,
        postJudgmentFee: 0,
        notes: 'الدعاوى مجهولة القيمة تخضع للرسم الثابت بحسب درجة المحكمة (مادة 1 ومادة 3)، ويكتفى بالرسم المسدد إذا رُفضت الدعوى دون صدور أمر تقدير، ما لم تعدل لطلبات معلومة القيمة.'
      };
    }

    // 6. الدعاوى معلومة القيمة (مطالبة مالية، أمر أداء، استئناف مدني)
    // حساب الشرائح التصاعدية للرسم النسبي الكامل (المادة 1 من القانون 90 لسنة 1944):
    // الشريحة 1: حتى 250 جنيه بنسبة 2%
    // الشريحة 2: من 250 إلى 2000 جنيه (1750 جنيه) بنسبة 3%
    // الشريحة 3: من 2000 إلى 4000 جنيه (2000 جنيه) بنسبة 4%
    // الشريحة 4: ما زاد عن 4000 جنيه بنسبة 5%
    const calcProportionalFeeByBrackets = (val) => {
      let b1 = 0, b2 = 0, b3 = 0, b4 = 0;
      if (val <= 250) {
        b1 = val * 0.02;
      } else if (val <= 2000) {
        b1 = 250 * 0.02;
        b2 = (val - 250) * 0.03;
      } else if (val <= 4000) {
        b1 = 250 * 0.02;
        b2 = 1750 * 0.03;
        b3 = (val - 2000) * 0.04;
      } else {
        b1 = 250 * 0.02;
        b2 = 1750 * 0.03;
        b3 = 2000 * 0.04;
        b4 = (val - 4000) * 0.05;
      }
      const total = b1 + b2 + b3 + b4;
      return { total, b1, b2, b3, b4 };
    };

    // حساب الرسم النسبي الإجمالي الكامل لكامل قيمة المطالبة
    const fullFeeBrackets = calcProportionalFeeByBrackets(amount);
    const fullProportionalFee = fullFeeBrackets.total;
    const fullServicesFee = fullProportionalFee * 0.5; // 50% صندوق الخدمات
    const fullTotalJudicial = fullProportionalFee + fullServicesFee;

    // حساب الوعاء المؤقت للرسم الابتدائي المسدد عند الرفع (المادة 9 من قانون الرسوم 126/2009):
    // - الدعاوى حتى 40,000: تحسب على أساس 1,000 جنيه (أو القيمة إن كانت أقل)
    // - الدعاوى من 40,001 إلى 100,000: يحصل الرسم النسبي عند الرفع على أساس 2,000 جنيه فقط
    // - الدعاوى من 100,001 إلى 1,000,000: يحصل الرسم عند الرفع على أساس 5,000 جنيه
    // - ما زاد عن 1,000,000: يحصل الرسم عند الرفع على أساس 10,000 جنيه
    let filingBaseAmount = amount;
    if (amount <= 40000) {
      filingBaseAmount = Math.min(amount, 1000);
    } else if (amount <= 100000) {
      filingBaseAmount = 2000;
    } else if (amount <= 1000000) {
      filingBaseAmount = 5000;
    } else {
      filingBaseAmount = 10000;
    }

    const filingFeeBrackets = calcProportionalFeeByBrackets(filingBaseAmount);
    const filingProportionalFee = filingFeeBrackets.total; // 57.5 في حالة 50 ألف
    const judicialServicesFee = filingProportionalFee * 0.5; // 28.75 في حالة 50 ألف
    const courtBuildings = 1.5; // ص أبنية المحاكم
    const lawyerFees = (amount > 100000 || feeCategory === 'appeal_civil') ? 75 : 50; // أتعاب المحاماة
    const martyrStamp = 5.0; // دمغة الشهيد

    // الإجمالي قبل الضرائب (الرسوم القضائية والملحقات المسددة)
    const subtotalBeforeTax = filingProportionalFee + judicialServicesFee + courtBuildings + lawyerFees + martyrStamp; // 142.75

    // الضرائب المقررة:
    const professionalTax = 15.0; // ضريبة المهن
    const vatTax = 20.0; // ض القيمة المضافة
    const totalTax = professionalTax + vatTax; // 35.0

    // مصاريف الإعلان بالمحضرين
    const bailiffFee = defendants * 25;

    // كفالة استئناف (إن وجدت)
    const depositSecurity = feeCategory === 'appeal_civil' ? (amount > 100000 ? 500 : 200) : 0;

    // شق مستعجل
    const urgentFee = hasUrgentRequest ? 25 : 0;

    // إجمالي المدفوع عند رفع الدعوى
    const totalAtFiling = subtotalBeforeTax + totalTax + bailiffFee + depositSecurity + urgentFee;

    // حساب قوائم الرسوم (أمر التقدير النهائي الصادر بعد الحكم ضد الخاسر):
    // الباقي من النسبي = الكامل - المسدد عند القيد
    const remainingProportional = Math.max(0, fullProportionalFee - filingProportionalFee); // 2380 في حالة 50 ألف
    // الباقي من الخدمات = الخدمات الكامل - المسدد عند القيد
    const remainingServices = Math.max(0, fullServicesFee - judicialServicesFee); // 1190 في حالة 50 ألف
    const totalPostJudgment = remainingProportional + remainingServices; // 3570

    // الاختصاص القيمي والنوعي:
    let jurisdiction = 'ترفع أمام محكمة المواد الجزئية';
    if (feeCategory === 'appeal_civil') {
      jurisdiction = amount <= 100000 ? 'المحكمة الابتدائية بهيئة استئنافية' : 'محكمة الاستئناف العالي';
    } else if (amount > 100000) {
      jurisdiction = 'ترفع أمام المحكمة الابتدائية (المحكمة الكلية)';
    }

    return {
      isExempt: false,
      isFixed: false,
      amount,
      filingBaseAmount,
      jurisdiction,
      // تفاصيل الرسم الابتدائي
      filingProportionalFee,
      judicialServicesFee,
      courtBuildings,
      lawyerFees,
      martyrStamp,
      subtotalBeforeTax,
      professionalTax,
      vatTax,
      totalTax,
      bailiffFee,
      depositSecurity,
      urgentFee,
      totalAtFiling,
      // تفاصيل قوائم الرسوم النهائية
      fullProportionalFee,
      fullServicesFee,
      fullTotalJudicial,
      remainingProportional,
      remainingServices,
      totalPostJudgment,
      postJudgmentFee: totalPostJudgment,
      // تفاصيل الشرائح
      fullFeeBrackets,
      filingFeeBrackets,
      notes: 'يُحصل الرسم النسبي عند رفع الدعوى بحد أقصى على أساس الشريحة المؤقتة (مادة 9)، ويستحق باقي الرسم النسبي وصندوق الخدمات بقائمة رسوم بعد صدور الحكم ويلزم بها الخصم الخاسر.'
    };
  };

  const FEE_CATEGORY_LABELS = {
    civil_monetary: 'دعوى مدنية / تجارية معلومة القيمة (مطالبة مالية، تعويض، رصيد حساب)',
    payment_order: 'استصدار أمر أداء (شيك، كمبيالة، إيصال أمانة، سند إذني)',
    signature_validity: 'دعوى صحة توقيع (رسم ثابت 5 ج - اختصاص نوعي جزئي)',
    civil_unspecified: 'دعوى غير مقدرة القيمة (صحة ونفاذ، تثبيت ملكية، فسخ، طرد، تسليم)',
    urgent_action: 'منازعة مستعجلة (طرد مستعجل، إثبات حالة، وقف أعمال جديدة)',
    appeal_civil: 'استئناف حكم مدني / تجاري',
    cassation: 'طعن بالنقض (مدني / تجاري / جنائي)',
    family: 'دعاوى محكمة الأسرة (نفقات، طلاق، خلع، رؤية، حضانة)',
    labor: 'دعاوى عمالية (مستحقات عمالية، فصل تعسفي - معفاة بقوة القانون)'
  };

  const calculatedFees = calculateJudicialFees();

  const handleCopyFeeReport = () => {
    const categoryNameArabic = FEE_CATEGORY_LABELS[feeCategory] || feeCategory;
    const isMonetary = feeCategory === 'civil_monetary' || feeCategory === 'payment_order' || feeCategory === 'appeal_civil';
    const amountFormatted = isMonetary ? `${Number(claimAmount || 0).toLocaleString('en-US')} ج.م` : 'غير مقدرة القيمة (رسم ثابت)';

    let text = `
بيان تقديري للرسوم القضائية — أجندة المحاماة القضائية:
- نوع الإجراء: ${categoryNameArabic}
- الاختصاص القضائي: ${calculatedFees.jurisdiction}
- المبلغ المطالب به: ${amountFormatted}
`.trim();

    if (calculatedFees.isExempt) {
      text += `\n- حالة الرسوم: معفاة تماماً بقوة القانون (0.00 ج.م)\n- السند القانوني: ${calculatedFees.exemptReason}`;
    } else {
      text += `
- إجمالي المدفوع عند قيد الدعوى: ${calculatedFees.totalAtFiling?.toLocaleString('en-US')} ج.م
  • الرسم النسبي/المبدئي: ${calculatedFees.filingProportionalFee || calculatedFees.basicFee} ج.م
  • صندوق الخدمات (50%): ${calculatedFees.judicialServicesFee} ج.م
  • صندوق أبنية المحاكم: ${calculatedFees.courtBuildings} ج.م
  • أتعاب المحاماة: ${calculatedFees.lawyerFees} ج.م
  • دمغة الشهيد: ${calculatedFees.martyrStamp} ج.م
  • الضرائب (مهن + قيمة مضافة): ${calculatedFees.totalTax} ج.م
  • مصاريف الإعلان (${defendantsCount} خصم): ${calculatedFees.bailiffFee} ج.م
`;
      if (calculatedFees.totalPostJudgment > 0) {
        text += `
- قيمة قوائم الرسوم (أمر التقدير بعد الحكم ضد الخاسر): ${calculatedFees.totalPostJudgment?.toLocaleString('en-US')} ج.م
  • باقي النسبي: ${calculatedFees.remainingProportional?.toLocaleString('en-US')} ج.م
  • باقي الخدمات: ${calculatedFees.remainingServices?.toLocaleString('en-US')} ج.م
`;
      }
      text += `- السند القانوني: ${calculatedFees.notes}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedFees(true);
    setTimeout(() => setCopiedFees(false), 3000);
  };

  // Search results
  const query = searchTerm.toLowerCase();
  const matchingCases = cases.filter(c => {
    if (!query) return true;
    return (
      (c.case_number && c.case_number.toLowerCase().includes(query)) ||
      (c.case_title && c.case_title.toLowerCase().includes(query)) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(query)) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(query)) ||
      (c.court_name && c.court_name.toLowerCase().includes(query)) ||
      (c.ruling_text && c.ruling_text.toLowerCase().includes(query)) ||
      (c.notes && c.notes.toLowerCase().includes(query))
    );
  });

  const matchingClients = clients.filter(c => {
    if (!query) return true;
    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      (c.national_id && c.national_id.includes(query)) ||
      (c.power_of_attorney_number && c.power_of_attorney_number.toLowerCase().includes(query))
    );
  });

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-700)', textTransform: 'uppercase' }}>
              الحاسبة القضائية ومحرك البحث
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            الأدوات القضائية والبحث والحسابات
          </h1>
        </div>

        <div className="search-tools-nav" style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className={`btn ${activeTabSub === 'fees' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTabSub('fees')}
            style={{ fontWeight: '700', borderRadius: '10px', fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
          >
            <Coins size={15} />
            <span>حاسبة الرسوم القضائية</span>
          </button>
          <button 
            type="button"
            className={`btn ${activeTabSub === 'deadlines' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTabSub('deadlines')}
            style={{ fontWeight: '700', borderRadius: '10px', fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
          >
            <Clock size={15} />
            <span>حاسبة المواعيد والطعون</span>
          </button>
          <button 
            type="button"
            className={`btn ${activeTabSub === 'search' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTabSub('search')}
            style={{ fontWeight: '700', borderRadius: '10px', fontSize: '0.84rem', padding: '0.45rem 0.9rem' }}
          >
            <Search size={15} />
            <span>البحث الشامل</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. JUDICIAL FEES CALCULATOR TAB                                          */}
      {/* ========================================================================= */}
      {activeTabSub === 'fees' && (
        <div className="fees-calculator-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {/* Form Card */}
          <div className="card" style={{ borderRadius: '14px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <Calculator size={20} color="var(--primary-700)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                بيانات الدعوى وتحديد الرسوم القضائية
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Category */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>نوع الدعوى / التصنيف الإجرائي *</label>
                <select 
                  className="form-select"
                  value={feeCategory}
                  onChange={(e) => setFeeCategory(e.target.value)}
                >
                  {Object.entries(FEE_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Claim Amount (if monetary) */}
              {(feeCategory === 'civil_monetary' || feeCategory === 'payment_order' || feeCategory === 'appeal_civil') && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                    <span>المبلغ المراد / المطالب به (جنيه مصري) *</span>
                    <span style={{ color: 'var(--primary-700)', fontWeight: '800' }}>
                      {Number(claimAmount || 0).toLocaleString('en-US')} ج.م
                    </span>
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    step="500"
                    className="form-input"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="مثال: 50000"
                    style={{ fontSize: '1.05rem', fontWeight: '700', direction: 'ltr', textAlign: 'left' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    * يتم احتساب الرسم الابتدائي المؤقت عند الرفع على أساس الشريحة المؤقتة (مادة 9)، وتسوية باقي الرسم بقائمة الرسوم بعد الحكم.
                  </span>
                </div>
              )}

              {/* Unspecified Court Level Selector */}
              {(feeCategory === 'civil_unspecified' || feeCategory === 'urgent_action') && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>المحكمة المرفوع أمامها النزاع (مادة 1 ومادة 3) *</label>
                  <select 
                    className="form-select"
                    value={unspecifiedCourtType}
                    onChange={(e) => setUnspecifiedCourtType(e.target.value)}
                  >
                    <option value="partial">محكمة جزئية (رسم ثابت 5 جنيهات)</option>
                    <option value="urgent">قضاء مستعجل (رسم ثابت 10 جنيهات)</option>
                    <option value="first_instance">محكمة ابتدائية / كلية (رسم ثابت 15 جنيهاً)</option>
                    <option value="bankruptcy">شهر إفلاس أو صلح واقٍ (رسم ثابت 50 جنيهاً)</option>
                    <option value="appeal_partial">استئناف أحكام جزئية أمام الابتدائية (رسم ثابت 10 جنيهات)</option>
                    <option value="appeal_urgent">استئناف قضاء مستعجل (رسم ثابت 15 جنيهاً)</option>
                    <option value="appeal_high">استئناف عالي أمام محاكم الاستئناف (رسم ثابت 30 جنيهاً)</option>
                  </select>
                </div>
              )}

              {/* Number of Defendants */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>عدد الخصوم المعلن إليهم في صحيفة الدعوى *</label>
                <input 
                  type="number" 
                  min="1"
                  max="50"
                  className="form-input"
                  value={defendantsCount}
                  onChange={(e) => setDefendantsCount(e.target.value)}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  * لحساب مصاريف انتقال المحضرين والإعلانات القضائية بدقة (25 ج لكل خصم).
                </span>
              </div>

              {/* Urgent Request Checkbox */}
              {feeCategory !== 'urgent_action' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input 
                    type="checkbox"
                    id="urgentRequestCheck"
                    checked={hasUrgentRequest}
                    onChange={(e) => setHasUrgentRequest(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary-800)', cursor: 'pointer' }}
                  />
                  <label htmlFor="urgentRequestCheck" style={{ fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer', margin: 0 }}>
                    تتضمن الصحيفة طلباً مستعجلاً (وقف تنفيذ مؤقت أو شق مستعجل)
                  </label>
                </div>
              )}

              {/* Jurisdiction Banner */}
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'rgba(2, 132, 199, 0.08)', 
                border: '1px solid rgba(2, 132, 199, 0.25)', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem' 
              }}>
                <Building2 size={20} style={{ color: '#0284c7', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369a1' }}>الاختصاص القضائي المقرر قانوناً:</div>
                  <strong style={{ fontSize: '0.92rem', color: '#0c4a6e' }}>{calculatedFees.jurisdiction}</strong>
                </div>
              </div>

              {/* Legal Reference Note Box */}
              <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-card-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Info size={18} color="var(--primary-700)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>السند القانوني:</strong> {calculatedFees.notes || calculatedFees.exemptReason}
                </div>
              </div>
            </div>
          </div>

          {/* Results & Breakdown Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            {/* Total Filing Fee Highlight Box */}
            <div style={{
              padding: '1.35rem 1.5rem',
              borderRadius: '14px',
              background: calculatedFees.isExempt ? '#f0fdf4' : 'linear-gradient(135deg, var(--primary-800) 0%, var(--primary-900) 100%)',
              color: calculatedFees.isExempt ? '#15803d' : '#ffffff',
              border: calculatedFees.isExempt ? '1px solid #bbf7d0' : 'none',
              boxShadow: 'var(--shadow-md)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', opacity: 0.9 }}>
                  {calculatedFees.isExempt ? 'حالة الإعفاء من الرسوم' : 'إجمالي المدفوع عند قيد الدعوى (بالخزينة)'}
                </span>
                <span style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  background: calculatedFees.isExempt ? '#dcfce7' : 'rgba(255, 255, 255, 0.2)',
                  fontSize: '0.78rem',
                  fontWeight: '700'
                }}>
                  {calculatedFees.isExempt ? 'معفاة بقوة القانون' : 'سداد فوري عند القيد'}
                </span>
              </div>

              <div style={{ fontSize: calculatedFees.isExempt ? '1.4rem' : '2.3rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
                {calculatedFees.isExempt ? '0.00 ج.م (معفاة تماماً)' : `${calculatedFees.totalAtFiling.toLocaleString('en-US')} ج.م`}
              </div>

              {calculatedFees.isExempt ? (
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                  {calculatedFees.exemptReason}
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.65rem', fontSize: '0.8rem', opacity: 0.9, flexWrap: 'wrap' }}>
                  <span>✓ شاملة الرسم الابتدائي والخدمات</span>
                  <span>✓ شاملة أتعاب المحاماة والدمغات</span>
                  <span>✓ شاملة الضرائب ومصاريف الإعلان</span>
                </div>
              )}
            </div>

            {/* Detailed Fee Breakdown Table (Matching Egyptian Calculator App Breakdown) */}
            {!calculatedFees.isExempt && (
              <div className="card" style={{ padding: '1.2rem', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>
                    <Receipt size={18} color="var(--primary-700)" />
                    <span>تفصيل بنود الرسوم والمصروفات المسددة</span>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={handleCopyFeeReport}
                  >
                    {copiedFees ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedFees ? 'تم النسخ!' : 'نسخ التقرير'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem' }}>
                  {/* نسبي */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      • نسبي (الرسم النسبي الابتدائي المسدد):
                      {calculatedFees.filingBaseAmount && (
                        <small style={{ color: 'var(--text-muted)', marginRight: '0.3rem' }}>(على وعاء {calculatedFees.filingBaseAmount.toLocaleString('en-US')} ج مادة 9)</small>
                      )}
                    </span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.filingProportionalFee || calculatedFees.basicFee || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {/* خدمات */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• خدمات (رسم صندوق الخدمات 50%):</span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.judicialServicesFee || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {/* ص أبنية المحاكم */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• ص أبنية المحاكم:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.courtBuildings || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {/* أتعاب المحاماة */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• أتعاب المحاماة:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.lawyerFees || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {/* دمغة الشهيد */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• دمغة الشهيد:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.martyrStamp || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {/* صندوق الأسرة (إن وجد) */}
                  {calculatedFees.familyFundStamp && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>• طابع دعم ورعاية الأسرة:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.familyFundStamp.toLocaleString('en-US')} ج.م</strong>
                    </div>
                  )}

                  {/* الإجمالي قبل الضرائب */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.6rem', background: 'var(--bg-card-subtle)', borderRadius: '6px', fontWeight: '800', marginTop: '0.2rem' }}>
                    <span>الإجمالي (الرسوم والملحقات):</span>
                    <span style={{ color: 'var(--primary-700)' }}>{(calculatedFees.subtotalBeforeTax || 0).toLocaleString('en-US')} ج.م</span>
                  </div>

                  {/* ضريبة المهن */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• ضريبة المهن الحرة:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.professionalTax || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {/* ض القيمة المضافة */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• ضريبة القيمة المضافة (ض.ق.م):</span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.vatTax || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {/* إجمالي الضريبة */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '6px', fontWeight: '700', color: '#854d0e' }}>
                    <span>إجمالي الضريبة:</span>
                    <span>{(calculatedFees.totalTax || 0).toLocaleString('en-US')} ج.م</span>
                  </div>

                  {/* مصاريف الإعلان */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>• مصاريف إعلان الصحيفة ({defendantsCount} خصم):</span>
                    <strong style={{ color: 'var(--text-main)' }}>{(calculatedFees.bailiffFee || 0).toLocaleString('en-US')} ج.م</strong>
                  </div>

                  {calculatedFees.depositSecurity > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--primary-50)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--primary-900)', fontWeight: '700' }}>• كفالة الطعن (تسترد عند قبول الطعن):</span>
                      <strong style={{ color: 'var(--primary-800)' }}>{calculatedFees.depositSecurity.toLocaleString('en-US')} ج.م</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Post-Judgment Fee Bill (قيمة قوائم الرسوم - أمر التقدير بعد الحكم) */}
            {calculatedFees.totalPostJudgment > 0 && (
              <div className="card" style={{ padding: '1.2rem', borderRadius: '14px', border: '1.5px solid #fca5a5', background: 'var(--bg-card-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', color: '#b91c1c', marginBottom: '0.6rem', fontSize: '1rem' }}>
                  <Scale size={18} color="#dc2626" />
                  <span>قيمة قوائم الرسوم (أمر التقدير بعد صدور الحكم)</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.8rem 0' }}>
                  يصدر بها أمر تقدير رسوم من قلم الكتاب بعد الفصل في الدعوى بحكم نهائي، ويلزم بها الخصم المحكوم عليه بالمصروفات:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>نسبي متبقي</span>
                    <strong style={{ fontSize: '1.2rem', color: '#dc2626' }}>{calculatedFees.remainingProportional.toLocaleString('en-US')}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.2rem' }}>ج.م</span>
                  </div>

                  <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>خدمات متبقي</span>
                    <strong style={{ fontSize: '1.2rem', color: '#dc2626' }}>{calculatedFees.remainingServices.toLocaleString('en-US')}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.2rem' }}>ج.م</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#991b1b' }}>إجمالي أمر التقدير المتوقع:</span>
                  <strong style={{ fontSize: '1.25rem', color: '#b91c1c', fontWeight: '900' }}>
                    {calculatedFees.totalPostJudgment.toLocaleString('en-US')} ج.م
                  </strong>
                </div>
              </div>
            )}

            {/* Detailed Brackets Breakdown Table (جدول الشرائح القانونية للتوضيح) */}
            {calculatedFees.fullFeeBrackets && (
              <div className="card" style={{ padding: '1rem', borderRadius: '12px', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HelpCircle size={15} color="var(--primary-700)" />
                  <span>طريقة حساب الشرائح التصاعدية للرسم النسبي الكلي (المادة 1):</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.2rem' }}>
                    <span>• الـ 250 جنيهاً الأولى (2%):</span>
                    <strong>{calculatedFees.fullFeeBrackets.b1.toFixed(2)} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.2rem' }}>
                    <span>• من 250 إلى 2,000 جنيه (3% على 1,750 ج):</span>
                    <strong>{calculatedFees.fullFeeBrackets.b2.toFixed(2)} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.2rem' }}>
                    <span>• من 2,000 إلى 4,000 جنيه (4% على 2,000 ج):</span>
                    <strong>{calculatedFees.fullFeeBrackets.b3.toFixed(2)} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.2rem' }}>
                    <span>• ما زاد عن 4,000 جنيه (5%):</span>
                    <strong>{calculatedFees.fullFeeBrackets.b4.toFixed(2)} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', paddingTop: '0.2rem', color: 'var(--primary-700)' }}>
                    <span>مجموع الرسم النسبي النهائي الكامل:</span>
                    <span>{calculatedFees.fullProportionalFee.toLocaleString('en-US')} ج.م</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GENERAL SEARCH TAB                                                    */}
      {/* ========================================================================= */}
      {activeTabSub === 'search' && (
        <>
          {/* Search Input Bar */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem' }}>
            <div className="header-search" style={{ width: '100%' }}>
              <Search size={20} style={{ color: 'var(--text-subtle)' }} />
              <input 
                type="text" 
                placeholder="ابحث بأي كلمة: رقم قضية، اسم موكل، اسم خصم، محكمة، تاريخ، أو منطوق حكم..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Results Grid */}
          <div className="search-results-grid">
            
            {/* Cases Results */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>نتائج القضايا والدعاوى ({matchingCases.length})</span>
                </div>
              </div>

              {matchingCases.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>لا توجد قضايا مطابقة للبحث</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {matchingCases.map(c => (
                    <div key={c.id} style={{ padding: '0.9rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--brand-accent)' }}>
                          دعوى رقم {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name}
                        </strong>
                        <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--brand-accent)' }}>
                          {CASE_TYPES[c.case_type] || c.case_type}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '1.2rem' }}>
                        <span><strong>المحكمة:</strong> {c.court_name}</span>
                        <span><strong>الخصم:</strong> {c.defendant_name}</span>
                        {c.next_session_date && (
                          <span><strong>الجلسة:</strong> {new Date(c.next_session_date).toLocaleDateString('ar-EG')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clients Results */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>الموكلين المطابقين ({matchingClients.length})</span>
                </div>
              </div>

              {matchingClients.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>لا يوجد موكلين مطابقين</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {matchingClients.map(c => (
                    <div key={c.id} style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--brand-accent)' }}>{c.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {c.phone ? `هاتف: ${c.phone}` : 'بدون هاتف'} | {c.power_of_attorney_number ? `توكيل: ${c.power_of_attorney_number}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. DEADLINE & APPEALS CALCULATOR TAB                                     */}
      {/* ========================================================================= */}
      {activeTabSub === 'deadlines' && (
        <div className="deadlines-calculator-grid">
          {/* Calculator Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Calculator size={20} color="var(--primary-600)" />
                <span>حاسبة ميعاد الطعن القانوني والعد التنازلي</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">نوع الطعن / الإجراء القانوني *</label>
              <select 
                className="form-select" 
                value={appealType} 
                onChange={(e) => setAppealType(e.target.value)}
              >
                {Object.entries(DEADLINE_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.title} ({v.days} يوماً)</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ صدور الحكم أو الإعلان *</label>
              <input 
                type="date" 
                className="form-input" 
                value={rulingDate} 
                onChange={(e) => setRulingDate(e.target.value)} 
              />
            </div>

            {/* Calculated Result Box */}
            <div className="deadline-result-box">
              <div className="deadline-badge-title">
                آخر ميعاد قانوني لإيداع التقرير بالطعن:
              </div>
              <h2 className="deadline-date-title">
                {deadlineDate ? deadlineDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </h2>
              <p className="deadline-law-ref">
                السند القانوني: {DEADLINE_PRESETS[appealType]?.law}
              </p>
            </div>
          </div>

          {/* Legal Rules Reference */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={20} color="var(--accent-gold)" />
                <span>دليل المدد الإجرائية ومواعيد السقوط</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.85rem' }}>
              {Object.entries(DEADLINE_PRESETS).map(([k, v]) => (
                <div key={k} style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ color: 'var(--brand-accent)' }}>{v.title}</strong>
                    <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--brand-accent)' }}>
                      {v.days} يوم
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>{v.law}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
