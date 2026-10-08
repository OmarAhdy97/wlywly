import React, { useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES } from '../lib/supabase';
import { setFocusTarget } from '../lib/focusTarget';
import Select from '../components/common/Select';
import DateInput from '../components/common/DateInput';
import { formatEgyptPhone } from '../lib/phone';

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
بيان تقديري للرسوم القضائية — الديوان:
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

  const money = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ج.م`;
  const f = calculatedFees;

  const openCase = (c) => {
    setActiveTab(c.is_archived ? 'archive' : 'cases');
    setFocusTarget({ type: 'case', id: c.id });
  };
  const openClient = (c) => {
    setActiveTab('clients');
    setFocusTarget({ type: 'client', id: c.id, name: c.name });
  };

  const feeRows = [
    [
      <>الرسم النسبي{f.filingBaseAmount ? <small> (على وعاء {f.filingBaseAmount.toLocaleString('en-US')} ج، مادة 9)</small> : null}</>,
      f.filingProportionalFee || f.basicFee,
    ],
    ['صندوق الخدمات (50%)', f.judicialServicesFee],
    ['صندوق أبنية المحاكم', f.courtBuildings],
    ['أتعاب المحاماة', f.lawyerFees],
    ['دمغة الشهيد', f.martyrStamp],
    f.familyFundStamp ? ['طابع دعم ورعاية الأسرة', f.familyFundStamp] : null,
  ].filter(Boolean);

  const TABS = [
    ['fees', 'الرسوم القضائية'],
    ['deadlines', 'المواعيد والطعون'],
    ['search', 'البحث الشامل'],
  ];

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>الحاسبة</h1>
          <p className="page-sub">الرسوم القضائية ومواعيد الطعن والبحث في الملفات</p>
        </div>
        <div className="seg-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTabSub === id}
              className={`seg-tab ${activeTabSub === id ? 'is-active' : ''}`}
              onClick={() => setActiveTabSub(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTabSub === 'fees' && (
        <div className="fees-calculator-grid">
          <div className="card">
            <h3 className="card-heading">بيانات الدعوى</h3>

            <div className="stack">
              <div className="form-group">
                <label className="form-label">نوع الدعوى *</label>
                <Select className="form-select" value={feeCategory} onChange={(e) => setFeeCategory(e.target.value)}>
                  {Object.entries(FEE_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </Select>
              </div>

              {(feeCategory === 'civil_monetary' || feeCategory === 'payment_order' || feeCategory === 'appeal_civil') && (
                <div className="form-group">
                  <label className="form-label label-split">
                    <span>المبلغ المطالب به (ج.م) *</span>
                    <b>{money(claimAmount)}</b>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input input-ltr"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="50000"
                  />
                  <span className="hint">يحسب الرسم المبدئي عند الرفع على الشريحة المؤقتة (مادة 9)، ويُسوّى الباقي بقائمة الرسوم بعد الحكم.</span>
                </div>
              )}

              {(feeCategory === 'civil_unspecified' || feeCategory === 'urgent_action') && (
                <div className="form-group">
                  <label className="form-label">المحكمة المرفوع أمامها النزاع (مادة 1 و3) *</label>
                  <Select className="form-select" value={unspecifiedCourtType} onChange={(e) => setUnspecifiedCourtType(e.target.value)}>
                    <option value="partial">محكمة جزئية (5 جنيهات)</option>
                    <option value="urgent">قضاء مستعجل (10 جنيهات)</option>
                    <option value="first_instance">محكمة ابتدائية / كلية (15 جنيهاً)</option>
                    <option value="bankruptcy">شهر إفلاس أو صلح واقٍ (50 جنيهاً)</option>
                    <option value="appeal_partial">استئناف أحكام جزئية أمام الابتدائية (10 جنيهات)</option>
                    <option value="appeal_urgent">استئناف قضاء مستعجل (15 جنيهاً)</option>
                    <option value="appeal_high">استئناف عالي أمام محاكم الاستئناف (30 جنيهاً)</option>
                  </Select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">عدد الخصوم المعلن إليهم *</label>
                <input type="number" min="1" max="50" className="form-input" value={defendantsCount} onChange={(e) => setDefendantsCount(e.target.value)} />
                <span className="hint">لحساب مصاريف الإعلان (25 ج لكل خصم).</span>
              </div>

              {feeCategory !== 'urgent_action' && (
                <label className="check-row" htmlFor="urgentRequestCheck">
                  <input
                    type="checkbox"
                    id="urgentRequestCheck"
                    checked={hasUrgentRequest}
                    onChange={(e) => setHasUrgentRequest(e.target.checked)}
                  />
                  <span>تتضمن الصحيفة طلباً مستعجلاً (وقف تنفيذ مؤقت أو شق مستعجل)</span>
                </label>
              )}

              <dl className="facts facts-flat">
                <div>
                  <dt>الاختصاص</dt>
                  <dd>{f.jurisdiction}</dd>
                </div>
                <div>
                  <dt>السند القانوني</dt>
                  <dd>{f.notes || f.exemptReason}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="stack">
            <div className={`fee-total ${f.isExempt ? 'is-exempt' : ''}`}>
              <span className="fee-total-label">
                {f.isExempt ? 'الإعفاء من الرسوم' : 'إجمالي المدفوع عند قيد الدعوى'}
              </span>
              <div className="fee-total-amount">
                {f.isExempt ? 'معفاة تماماً' : money(f.totalAtFiling)}
              </div>
              {f.isExempt && <p>{f.exemptReason}</p>}
            </div>

            {!f.isExempt && (
              <div className="card">
                <div className="card-title-row">
                  <h3 className="card-heading">تفصيل الرسوم والمصروفات</h3>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyFeeReport}>
                    {copiedFees ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedFees ? 'تم النسخ' : 'نسخ التقرير'}</span>
                  </button>
                </div>

                <div className="fee-rows">
                  {feeRows.map(([label, value], i) => (
                    <div className="fee-row" key={i}>
                      <span>{label}</span>
                      <b>{money(value)}</b>
                    </div>
                  ))}
                  <div className="fee-row is-sum">
                    <span>إجمالي الرسوم والملحقات</span>
                    <b>{money(f.subtotalBeforeTax)}</b>
                  </div>
                  <div className="fee-row">
                    <span>ضريبة المهن الحرة</span>
                    <b>{money(f.professionalTax)}</b>
                  </div>
                  <div className="fee-row">
                    <span>ضريبة القيمة المضافة</span>
                    <b>{money(f.vatTax)}</b>
                  </div>
                  <div className="fee-row is-sum">
                    <span>إجمالي الضرائب</span>
                    <b>{money(f.totalTax)}</b>
                  </div>
                  <div className="fee-row">
                    <span>مصاريف إعلان الصحيفة ({defendantsCount} خصم)</span>
                    <b>{money(f.bailiffFee)}</b>
                  </div>
                  {f.depositSecurity > 0 && (
                    <div className="fee-row is-sum">
                      <span>كفالة الطعن (تسترد عند قبول الطعن)</span>
                      <b>{money(f.depositSecurity)}</b>
                    </div>
                  )}
                </div>
              </div>
            )}

            {f.totalPostJudgment > 0 && (
              <div className="card">
                <h3 className="card-heading">قائمة الرسوم بعد الحكم (أمر التقدير)</h3>
                <p className="hint">يصدر بها أمر تقدير من قلم الكتاب بعد الفصل في الدعوى، ويلزم بها الخصم المحكوم عليه بالمصروفات.</p>
                <div className="money-strip two">
                  <div><span>نسبي متبقي</span><b>{money(f.remainingProportional)}</b></div>
                  <div><span>خدمات متبقي</span><b>{money(f.remainingServices)}</b></div>
                </div>
                <div className="fee-row is-sum">
                  <span>إجمالي أمر التقدير المتوقع</span>
                  <b>{money(f.totalPostJudgment)}</b>
                </div>
              </div>
            )}

            {f.fullFeeBrackets && (
              <div className="card">
                <h3 className="card-heading">شرائح الرسم النسبي (مادة 1)</h3>
                <div className="fee-rows">
                  <div className="fee-row"><span>أول 250 جنيهاً (2%)</span><b>{f.fullFeeBrackets.b1.toFixed(2)} ج.م</b></div>
                  <div className="fee-row"><span>من 250 إلى 2,000 (3%)</span><b>{f.fullFeeBrackets.b2.toFixed(2)} ج.م</b></div>
                  <div className="fee-row"><span>من 2,000 إلى 4,000 (4%)</span><b>{f.fullFeeBrackets.b3.toFixed(2)} ج.م</b></div>
                  <div className="fee-row"><span>ما زاد عن 4,000 (5%)</span><b>{f.fullFeeBrackets.b4.toFixed(2)} ج.م</b></div>
                  <div className="fee-row is-sum"><span>مجموع الرسم النسبي الكامل</span><b>{money(f.fullProportionalFee)}</b></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTabSub === 'search' && (
        <>
          <div className="page-toolbar">
            <div className="page-search">
              <Search size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="رقم قضية، اسم موكل أو خصم، محكمة، منطوق حكم"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="search-results-grid">
            <div className="card">
              <h3 className="card-heading">القضايا ({matchingCases.length})</h3>
              {matchingCases.length === 0 ? (
                <p className="empty-line">لا توجد قضايا مطابقة.</p>
              ) : (
                <ul className="mini-list result-list">
                  {matchingCases.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="result-item" onClick={() => openCase(c)}>
                        <strong>{c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name}</strong>
                        <span className="cell-sub">
                          {[CASE_TYPES[c.case_type] || c.case_type, c.court_name, c.defendant_name && `ضد ${c.defendant_name}`,
                            c.next_session_date && `الجلسة ${new Date(c.next_session_date).toLocaleDateString('ar-EG')}`].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h3 className="card-heading">الموكلون ({matchingClients.length})</h3>
              {matchingClients.length === 0 ? (
                <p className="empty-line">لا يوجد موكلون مطابقون.</p>
              ) : (
                <ul className="mini-list result-list">
                  {matchingClients.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="result-item" onClick={() => openClient(c)}>
                        <strong>{c.name}</strong>
                        <span className="cell-sub">
                          {[c.phone ? formatEgyptPhone(c.phone) : 'بدون هاتف', c.power_of_attorney_number && `توكيل ${c.power_of_attorney_number}`].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {activeTabSub === 'deadlines' && (
        <div className="deadlines-calculator-grid">
          <div className="card">
            <h3 className="card-heading">حاسبة ميعاد الطعن</h3>

            <div className="form-group">
              <label className="form-label">نوع الطعن أو الإجراء *</label>
              <Select className="form-select" value={appealType} onChange={(e) => setAppealType(e.target.value)}>
                {Object.entries(DEADLINE_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.title} ({v.days} يوماً)</option>
                ))}
              </Select>
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ صدور الحكم أو الإعلان *</label>
              <DateInput className="form-input" value={rulingDate} onChange={(e) => setRulingDate(e.target.value)} />
            </div>

            <div className="deadline-result-box">
              <div className="deadline-badge-title">آخر ميعاد قانوني للطعن</div>
              <h2 className="deadline-date-title">
                {deadlineDate ? deadlineDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </h2>
              <p className="deadline-law-ref">السند القانوني: {DEADLINE_PRESETS[appealType]?.law}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="card-heading">دليل المدد الإجرائية</h3>
            <ul className="mini-list">
              {Object.entries(DEADLINE_PRESETS).map(([k, v]) => (
                <li key={k}>
                  <div>
                    <strong>{v.title}</strong>
                    <span className="cell-sub">{v.law}</span>
                  </div>
                  <span className="badge">{v.days} يوم</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
