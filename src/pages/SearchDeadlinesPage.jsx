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
  // ==========================================
  const [feeCategory, setFeeCategory] = useState('civil_monetary'); // civil_monetary | civil_unspecified | family | labor | payment_order | appeal_civil | cassation
  const [claimAmount, setClaimAmount] = useState('50000');
  const [courtLevel, setCourtLevel] = useState('partial'); // partial | first_instance | appeal | cassation
  const [defendantsCount, setDefendantsCount] = useState('1');
  const [hasUrgentRequest, setHasUrgentRequest] = useState(false);
  const [copiedFees, setCopiedFees] = useState(false);

  // Fee calculation engine based on Egyptian Law No. 90 of 1944 & Law 7 of 1985
  const calculateJudicialFees = () => {
    const amount = parseFloat(claimAmount) || 0;
    const defendants = Math.max(1, parseInt(defendantsCount, 10) || 1);

    // 1. Labor Cases (معفاة تماماً بنص القانون 12 لسنة 2003)
    if (feeCategory === 'labor') {
      return {
        isExempt: true,
        exemptReason: 'معفاة تماماً من كافة الرسوم القضائية ورسوم الإعلان في جميع مراحل التقاضي طبقاً للمادة 6 من قانون العمل رقم 12 لسنة 2003.',
        basicFee: 0,
        judicialServicesFee: 0,
        lawyerStamp: 0,
        bailiffServiceFee: 0,
        courtDevFund: 0,
        urgentFee: 0,
        depositSecurity: 0,
        totalAtFiling: 0,
        postJudgmentFee: 0,
        notes: 'لا يتم سداد أي رسوم أو دمغات عند قيد الدعوى العمالية.'
      };
    }

    // 2. Family Cases (محاكم الأسرة والأحوال الشخصية)
    if (feeCategory === 'family') {
      const isExemptPersonal = true;
      return {
        isExempt: false,
        exemptReason: 'دعاوى النفقات والأجور والحضانة والرؤية معفاة من الرسوم القضائية طبقاً للقانون رقم 1 لسنة 2000.',
        basicFee: 20, // رسم جدول رمزي
        judicialServicesFee: 10,
        lawyerStamp: 20,
        bailiffServiceFee: (defendants * 15),
        courtDevFund: 10,
        urgentFee: 0,
        depositSecurity: 0,
        familyFundStamp: 50, // طابع صندوق الأسرة
        totalAtFiling: 20 + 10 + 20 + (defendants * 15) + 10 + 50,
        postJudgmentFee: 0,
        notes: 'دعاوى الأسرة معفاة من الرسوم النسبية، ويسدد فقط رسم الجدول وطوابع صندوق الأسرة ودمغة المحاماة.'
      };
    }

    // 3. Cassation Cases (الطعن بالنقض)
    if (feeCategory === 'cassation') {
      const cassationDeposit = 1000; // كفالة النقض المدني
      const basicFee = 250;
      const judicialServicesFee = 125;
      const lawyerStamp = 100;
      const bailiffServiceFee = defendants * 30;
      const courtDevFund = 25;
      const total = cassationDeposit + basicFee + judicialServicesFee + lawyerStamp + bailiffServiceFee + courtDevFund;

      return {
        isExempt: false,
        basicFee,
        judicialServicesFee,
        lawyerStamp,
        bailiffServiceFee,
        courtDevFund,
        urgentFee: 0,
        depositSecurity: cassationDeposit,
        totalAtFiling: total,
        postJudgmentFee: 0,
        notes: 'تشمل الرسوم كفالة النقض المقررة قانوناً (1000 جنيه) والتي تسترد في حالة قبول الطعن ونقض الحكم.'
      };
    }

    // 4. Civil Unspecified Value (دعاوى غير مقدرة القيمة: صحة توقيع، فسخ، تثبيت ملكية، تسليم)
    if (feeCategory === 'civil_unspecified') {
      let basicFee = 50;
      let lawyerStamp = 20;

      if (courtLevel === 'first_instance') {
        basicFee = 100;
        lawyerStamp = 50;
      } else if (courtLevel === 'appeal') {
        basicFee = 150;
        lawyerStamp = 100;
      }

      const judicialServicesFee = basicFee * 0.5; // 50%
      const bailiffServiceFee = defendants * 25;
      const courtDevFund = 20;
      const urgentFee = hasUrgentRequest ? 50 : 0;
      const total = basicFee + judicialServicesFee + lawyerStamp + bailiffServiceFee + courtDevFund + urgentFee;

      return {
        isExempt: false,
        basicFee,
        judicialServicesFee,
        lawyerStamp,
        bailiffServiceFee,
        courtDevFund,
        urgentFee,
        depositSecurity: 0,
        totalAtFiling: total,
        postJudgmentFee: 0,
        notes: 'الدعاوى غير مقدرة القيمة تخضع للرسم الثابت المقرر بحسب المحكمة المرفوع أمامها النزاع.'
      };
    }

    // 5. Monetary Claim / Payment Order / Civil Appeal (معلومة القيمة)
    let proportionalRate = 0.025; // 2.5% الشريحة الأولى
    if (amount > 100000) {
      proportionalRate = 0.05; // 5% لما زاد
    } else if (amount > 20000) {
      proportionalRate = 0.035;
    }

    // القسط المسدد مقدماً عند رفع الدعوى (رسم قيد الدعوى = ربع الرسم النسبي أو الحد الأدنى المقرر)
    const fullProportionalFee = Math.round(amount * proportionalRate);
    let filingProportionalFee = Math.round(fullProportionalFee * 0.25); // ربع الرسم النسبي عند القيد
    if (filingProportionalFee < 50) filingProportionalFee = 50;

    let lawyerStamp = 20;
    if (courtLevel === 'first_instance' || amount > 100000) lawyerStamp = 50;
    if (courtLevel === 'appeal' || feeCategory === 'appeal_civil') lawyerStamp = 100;

    let depositSecurity = 0;
    if (feeCategory === 'appeal_civil') {
      depositSecurity = amount > 100000 ? 500 : 200; // كفالة استئناف
    }

    const judicialServicesFee = Math.round(filingProportionalFee * 0.5); // 50%
    const bailiffServiceFee = defendants * 25;
    const courtDevFund = 25;
    const urgentFee = hasUrgentRequest ? 50 : 0;

    const totalAtFiling = filingProportionalFee + judicialServicesFee + lawyerStamp + bailiffServiceFee + courtDevFund + urgentFee + depositSecurity;
    const remainingAfterJudgment = fullProportionalFee - filingProportionalFee;

    return {
      isExempt: false,
      fullProportionalFee,
      filingProportionalFee,
      remainingAfterJudgment,
      basicFee: filingProportionalFee,
      judicialServicesFee,
      lawyerStamp,
      bailiffServiceFee,
      courtDevFund,
      urgentFee,
      depositSecurity,
      totalAtFiling,
      postJudgmentFee: remainingAfterJudgment,
      notes: 'يسدد ربع الرسم النسبي مقدماً عند قيد الدعوى، ويستحق باقي الرسم النسبي ورسم التنفيذ (قائمة الرسوم) بعد صدور الحكم النهائي ويلزم به الخاسر.'
    };
  };

  const FEE_CATEGORY_LABELS = {
    civil_monetary: 'دعوى مدنية / تجارية معلومة القيمة (مطالبة بمبلغ مالي)',
    payment_order: 'استصدار أمر أداء (شيك / كمبيالة / سند إذني)',
    civil_unspecified: 'دعوى غير مقدرة القيمة (صحة توقيع، فسخ، طرد، تثبيت ملكية)',
    appeal_civil: 'استئناف حكم مدني / تجاري',
    cassation: 'طعن بالنقض (مدني / تجاري / جنائي)',
    family: 'دعاوى محكمة الأسرة (نفقات، طلاق، خلع، رؤية، حضانة)',
    labor: 'دعاوى عمالية (مستحقات عمالية وفصل تعسفي)'
  };

  const calculatedFees = calculateJudicialFees();

  const handleCopyFeeReport = () => {
    const categoryNameArabic = FEE_CATEGORY_LABELS[feeCategory] || feeCategory;
    const isMonetary = feeCategory === 'civil_monetary' || feeCategory === 'payment_order' || feeCategory === 'appeal_civil';
    const amountFormatted = isMonetary ? `${Number(claimAmount || 0).toLocaleString('ar-EG')} ج.م` : 'غير مقدرة القيمة (رسم ثابت)';

    const text = `
بيان تقديري للرسوم القضائية — أجندة دمياط القضائية:
- نوع الإجراء: ${categoryNameArabic}
- المبلغ المطالب به: ${amountFormatted}
- إجمالي الرسوم المسددة عند قيد الدعوى: ${calculatedFees.isExempt ? 'معفاة بقوة القانون (0.00 ج.م)' : `${calculatedFees.totalAtFiling?.toLocaleString('ar-EG')} ج.م`}
${calculatedFees.postJudgmentFee > 0 ? `- الرسم النسبي اللاحق (قائمة الرسوم): ${calculatedFees.postJudgmentFee?.toLocaleString('ar-EG')} ج.م\n` : ''}- السند القانوني: ${calculatedFees.notes || calculatedFees.exemptReason || ''}
    `.trim();

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
        <div className="fees-calculator-grid">
          {/* Form Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                    <span>قيمة المبلغ المطالب به (جنيه مصري) *</span>
                    <span style={{ color: 'var(--primary-700)', fontWeight: '800' }}>
                      {Number(claimAmount || 0).toLocaleString('ar-EG')} ج.م
                    </span>
                  </label>
                  <input 
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="أدخل قيمة المبلغ..."
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    * يتم احتساب ربع الرسم النسبي مقدماً كقسط أول عند قيد الدعوى بالجدول.
                  </span>
                </div>
              )}

              {/* Court Level */}
              {feeCategory !== 'cassation' && feeCategory !== 'family' && feeCategory !== 'labor' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>المحكمة المختصة / درجة التقاضي *</label>
                  <select 
                    className="form-select"
                    value={courtLevel}
                    onChange={(e) => setCourtLevel(e.target.value)}
                  >
                    <option value="partial">محكمة جزئية (الدعاوى حتى 100,000 جنيه والدعاوى المحددة قانوناً)</option>
                    <option value="first_instance">محكمة ابتدائية / كلية (ما زاد عن 100,000 جنيه والدعاوى غير المقدرة)</option>
                    <option value="appeal">محكمة استئناف عالي (استئناف الأحكام الابتدائية)</option>
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
                  * لحساب مصاريف انتقال المحضرين والإعلانات القضائية بدقة.
                </span>
              </div>

              {/* Urgent Request Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input 
                  type="checkbox"
                  id="urgentRequestCheck"
                  checked={hasUrgentRequest}
                  onChange={(e) => setHasUrgentRequest(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-800)', cursor: 'pointer' }}
                />
                <label htmlFor="urgentRequestCheck" style={{ fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', margin: 0 }}>
                  تتضمن الصحيفة طلباً مستعجلاً (وقف تنفيذ مؤقت أو شق مستعجل)
                </label>
              </div>

              {/* Legal Reference Note Box */}
              <div style={{ padding: '0.9rem', background: 'var(--primary-50)', borderRadius: '8px', border: '1px solid var(--primary-100)', fontSize: '0.82rem', color: 'var(--primary-900)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Info size={18} color="var(--primary-700)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>السند القانوني:</strong> {calculatedFees.notes}
                </div>
              </div>
            </div>
          </div>

          {/* Results & Breakdown Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Total Filing Fee Highlight Box */}
            <div style={{
              padding: '1.4rem',
              borderRadius: '12px',
              background: calculatedFees.isExempt ? '#f0fdf4' : 'linear-gradient(135deg, var(--primary-800) 0%, var(--primary-900) 100%)',
              color: calculatedFees.isExempt ? '#15803d' : '#ffffff',
              border: calculatedFees.isExempt ? '1px solid #bbf7d0' : 'none',
              boxShadow: 'var(--shadow-md)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: '700', opacity: 0.9 }}>
                  {calculatedFees.isExempt ? 'حالة الإعفاء من الرسوم' : 'إجمالي رسوم قيد الدعوى (المسددة بالخزينة)'}
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

              <div style={{ fontSize: calculatedFees.isExempt ? '1.4rem' : '2.4rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
                {calculatedFees.isExempt ? '0.00 ج.م (معفاة تماماً)' : `${calculatedFees.totalAtFiling.toLocaleString('ar-EG')} ج.م`}
              </div>

              {calculatedFees.isExempt ? (
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                  {calculatedFees.exemptReason}
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.75rem', fontSize: '0.82rem', opacity: 0.85, flexWrap: 'wrap' }}>
                  <span>✓ شاملة رسم القيد والخدمات</span>
                  <span>✓ شاملة دمغة المحاماة</span>
                  <span>✓ شاملة إعلان {defendantsCount} خصم</span>
                </div>
              )}
            </div>

            {/* Detailed Fee Breakdown Table */}
            {!calculatedFees.isExempt && (
              <div className="card" style={{ padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>
                    <Receipt size={18} color="var(--primary-700)" />
                    <span>تفصيل بنود الرسوم والمصروفات</span>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>1. رسم القيد الأساسي (ربع النسبي / الثابت):</span>
                    <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.basicFee.toLocaleString('ar-EG')} ج.م</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>2. رسم الخدمات القضائية (الرسم الإضافي 50%):</span>
                    <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.judicialServicesFee.toLocaleString('ar-EG')} ج.م</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>3. دمغة المحاماة ورسوم صندوق النقابة:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.lawyerStamp.toLocaleString('ar-EG')} ج.م</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>4. مصاريف إعلان الصحيفة والمحضرين ({defendantsCount} خصم):</span>
                    <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.bailiffServiceFee.toLocaleString('ar-EG')} ج.م</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>5. صندوق تطوير دور المحاكم والرقمنة:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.courtDevFund.toLocaleString('ar-EG')} ج.م</strong>
                  </div>

                  {calculatedFees.familyFundStamp && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>6. طابع دعم وتأمين الأسرة المصرية:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.familyFundStamp.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  )}

                  {calculatedFees.urgentFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>7. رسم نظر الشق المستعجل:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{calculatedFees.urgentFee.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  )}

                  {calculatedFees.depositSecurity > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-subtle)', background: 'var(--primary-50)', paddingLeft: '0.4rem', paddingRight: '0.4rem', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--primary-900)', fontWeight: '700' }}>8. كفالة الطعن القضائية (تسترد عند قبول الطعن):</span>
                      <strong style={{ color: 'var(--primary-800)' }}>{calculatedFees.depositSecurity.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Post-Judgment Fee / Remaining Proportional Fee Card */}
            {calculatedFees.postJudgmentFee > 0 && (
              <div style={{ padding: '1rem', background: 'var(--bg-card-subtle)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                  <Scale size={16} color="var(--primary-700)" />
                  <span>الرسم النسبي اللاحق (قائمة الرسوم عند صدور الحكم):</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    باقي الرسم النسبي ورسم التنفيذ المستحق (يتحمله الخاسر):
                  </span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--primary-800)', fontWeight: '900' }}>
                    {calculatedFees.postJudgmentFee.toLocaleString('ar-EG')} ج.م
                  </strong>
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
