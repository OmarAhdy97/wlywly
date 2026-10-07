import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Gavel,
  FileText,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Coins,
  Send,
  Sparkles,
  Search,
  Scale,
  Users,
  Ban,
  CalendarCheck2,
  FileCheck,
  TriangleAlert,
  ClipboardList
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calculateAppealFollowUpDate, formatArabicDate, addDaysToDate, APPEAL_FOLLOW_UP_DAYS } from '../../lib/dateRules';

const DECISIONS = [
  { id: 'adjourned', tone: 'adjourned', label: 'تأجيل', hint: 'تحديد جلسة محكمة قادمة وسبب التأجيل', Icon: Clock },
  { id: 'finalJudgment', tone: 'final', label: 'حكم نهائي', hint: 'منطوق الحكم وخيار متابعة الاستئناف', Icon: Gavel },
  { id: 'preliminaryJudgment', tone: 'prelim', label: 'حكم تمهيدي', hint: 'ندب خبير، مستندات، أو عمل إداري', Icon: Briefcase },
];

const PRELIM_ACTIONS = [
  { id: 'expert', label: 'ندب خبير', Icon: UserCheck },
  { id: 'documents', label: 'تقديم مستندات', Icon: FileText },
  { id: 'notice', label: 'إعلان قضائي', Icon: Send },
  { id: 'inspection', label: 'معاينة', Icon: Search },
  { id: 'witnesses', label: 'سماع شهود', Icon: Users },
  { id: 'other', label: 'إجراء آخر', Icon: Sparkles },
];

const ADJOURN_REASONS = [
  'للإعلان',
  'لتقديم مستندات',
  'للاطلاع والرد',
  'لتقديم مذكرة',
  'لحضور الخصم',
  'لتقرير الخبير',
  'لسداد الأمانة',
  'للحكم',
];

const NEXT_DATE_CHIPS = [
  { label: 'بعد أسبوع', days: 7 },
  { label: 'بعد أسبوعين', days: 14 },
  { label: 'بعد 3 أسابيع', days: 21 },
  { label: 'بعد شهر', days: 30 },
];

// Egyptian courts do not sit on Friday and Saturday
const isCourtOffDay = (dateStr) => {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 5 || day === 6;
};

export default function SessionDecisionModal({
  isOpen,
  caseItem,
  currentSessionDate,
  onClose,
  onSuccess,
}) {
  const { clients, team, recordSessionDecision } = useData();

  // Multi-step state: 1 (Decision), 2 (Action/Date/Ruling), 3 (Details/Confirmation)
  const [step, setStep] = useState(1);
  const [decisionType, setDecisionType] = useState(null); // 'adjourned' | 'finalJudgment' | 'preliminaryJudgment'

  // Submitting Guard
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);

  // Default Session Date
  const baseSessionDate = currentSessionDate
    ? (currentSessionDate.includes('T') ? currentSessionDate.split('T')[0] : currentSessionDate)
    : new Date().toISOString().split('T')[0];

  // FORM FIELDS: 1. Postponement (تأجيل)
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [adjournmentReason, setAdjournmentReason] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // FORM FIELDS: 2. Final Judgment (حكم نهائي)
  const [rulingText, setRulingText] = useState('');
  const [rulingNotes, setRulingNotes] = useState('');
  const [judgmentDate, setJudgmentDate] = useState(baseSessionDate);
  const [willAppeal, setWillAppeal] = useState(null); // true | false | null

  // FORM FIELDS: 3. Preliminary Judgment (حكم تمهيدي)
  const [prelimActionType, setPrelimActionType] = useState('expert');
  const [expertName, setExpertName] = useState('');
  const [expertTask, setExpertTask] = useState('');
  const [actionFollowUpDate, setActionFollowUpDate] = useState(addDaysToDate(baseSessionDate, 14));
  const [actionNotes, setActionNotes] = useState('');
  const [hasNextCourtSession, setHasNextCourtSession] = useState(false);
  const [nextCourtSessionDate, setNextCourtSessionDate] = useState('');

  // Optional: Session Expenses & Assignment
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [sessionExpense, setSessionExpense] = useState('');
  const [sessionExpenseNote, setSessionExpenseNote] = useState('');
  const [assignedLawyerId, setAssignedLawyerId] = useState('');

  // Reset form when caseItem changes or modal opens
  useEffect(() => {
    if (caseItem) {
      setStep(1);
      setDecisionType(null);
      setIsSubmitting(false);
      setFeedbackSuccess(null);

      setNextSessionDate('');
      setAdjournmentReason('');
      setSessionNotes('');

      setRulingText(caseItem.ruling_text || '');
      setRulingNotes('');
      setJudgmentDate(baseSessionDate);
      setWillAppeal(null);

      setPrelimActionType('expert');
      setExpertName('');
      setExpertTask('متابعة مباشرة مأمورية الخبير وسداد الأمانة');
      setActionFollowUpDate(addDaysToDate(baseSessionDate, 14));
      setActionNotes('');
      setHasNextCourtSession(false);
      setNextCourtSessionDate('');

      setShowOptionalFields(false);
      setSessionExpense('');
      setSessionExpenseNote('');
      setAssignedLawyerId(caseItem.next_steps || '');
    }
  }, [caseItem, baseSessionDate]);

  // Past step 1 the lawyer has typed things: an accidental backdrop click or Esc must not wipe them
  const isDirty = step > 1 || isSubmitting;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !isDirty) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isDirty, onClose]);

  if (!isOpen || !caseItem) return null;

  // Linked Client
  const clientObj = caseItem.client_id ? clients.find(c => c.id === caseItem.client_id) : null;
  const hasTelegram = !!(clientObj && clientObj.telegram_chat_id);

  // Calculated Appeal Follow-up Date
  const calculatedAppealDate = judgmentDate ? calculateAppealFollowUpDate(judgmentDate, APPEAL_FOLLOW_UP_DAYS) : '';

  const activeDecision = DECISIONS.find(d => d.id === decisionType);

  // Dynamic Stepper Titles
  const getStepTitles = () => {
    if (decisionType === 'adjourned') return ['القرار', 'الجلسة القادمة', 'السبب والحفظ'];
    if (decisionType === 'finalJudgment') return ['القرار', 'منطوق الحكم', 'الاستئناف والحفظ'];
    if (decisionType === 'preliminaryJudgment') return ['القرار', 'الإجراء المطلوب', 'المراجعة والحفظ'];
    return ['القرار', 'الموعد / الإجراء', 'التأكيد والحفظ'];
  };

  const stepTitles = getStepTitles();

  // The next court session has to be after the session being recorded
  const nextDateIsAfter = !nextSessionDate || nextSessionDate > baseSessionDate;
  const nextCourtDateIsAfter = !nextCourtSessionDate || nextCourtSessionDate > baseSessionDate;

  // Validate current step before moving next
  const canProceed = () => {
    if (step === 1) return !!decisionType;
    if (step === 2) {
      if (decisionType === 'adjourned') return !!nextSessionDate && nextDateIsAfter;
      if (decisionType === 'finalJudgment') return !!rulingText.trim();
      if (decisionType === 'preliminaryJudgment') {
        if (!actionFollowUpDate) return false;
        if (prelimActionType === 'expert' && !expertTask.trim()) return false;
        if (hasNextCourtSession && (!nextCourtSessionDate || !nextCourtDateIsAfter)) return false;
        return true;
      }
    }
    if (step === 3) {
      if (decisionType === 'finalJudgment') return willAppeal !== null;
      if (decisionType === 'adjourned') return !!adjournmentReason.trim();
    }
    return true;
  };

  // Handle Save Submission
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      let currentSessionData = {
        session_date: baseSessionDate,
        session_time: '09:00',
        court_room: caseItem.court_room || null,
      };

      let nextSessionData = null;
      let caseUpdates = {};
      let appealData = null;
      let adminTaskData = null;
      let transactionData = null;
      let successMessage = 'تم تسجيل قرار الجلسة بنجاح';

      // BRANCH 1: Postponement (تأجيل)
      if (decisionType === 'adjourned') {
        currentSessionData = {
          ...currentSessionData,
          status: 'adjourned',
          adjournment_reason: adjournmentReason.trim() || null,
          notes: sessionNotes.trim() || adjournmentReason.trim() || 'تأجيل الجلسة',
          ruling_text: null,
        };

        nextSessionData = {
          session_date: nextSessionDate,
          session_time: '09:00',
          status: 'scheduled',
          court_room: caseItem.court_room || null,
          notes: `مؤجلة من جلسة ${baseSessionDate}${adjournmentReason ? ': ' + adjournmentReason.trim() : ''}`,
        };

        caseUpdates = {
          status: 'adjourned',
          next_session_date: nextSessionDate,
          notes: adjournmentReason.trim() || caseItem.notes || null,
          next_steps: assignedLawyerId || caseItem.next_steps || null,
        };

        successMessage = `تم تسجيل التأجيل وتحديد الجلسة القادمة: ${formatArabicDate(nextSessionDate, true)}`;
      }

      // BRANCH 2: Final Judgment (حكم نهائي)
      else if (decisionType === 'finalJudgment') {
        currentSessionData = {
          ...currentSessionData,
          status: 'finalJudgment',
          ruling_text: rulingText.trim(),
          notes: willAppeal
            ? `حكم نهائي — تقرر الاستئناف (موعد المتابعة: ${calculatedAppealDate})${rulingNotes ? ' — ' + rulingNotes.trim() : ''}`
            : `حكم نهائي — لا يوجد استئناف${rulingNotes ? ' — ' + rulingNotes.trim() : ''}`,
        };

        // next_session_date is NOT a court session here, so it is NULL
        caseUpdates = {
          status: 'finalJudgment',
          next_session_date: null,
          ruling_text: rulingText.trim(),
          notes: `حكم نهائي: ${rulingText.trim().slice(0, 80)}${willAppeal ? ' (جارٍ الاستئناف)' : ''}`,
          next_steps: willAppeal ? `متابعة قيد الاستئناف قبل ${calculatedAppealDate}` : 'صدور حكم نهائي',
        };

        if (willAppeal) {
          appealData = {
            judgment_date: judgmentDate,
            judgment_text: rulingText.trim(),
            appeal_requested: true,
            follow_up_date: calculatedAppealDate,
            notes: rulingNotes.trim() || null,
          };
          successMessage = `تم تسجيل الحكم النهائي وإضافة متابعة الاستئناف بتاريخ: ${formatArabicDate(calculatedAppealDate, true)}`;
        } else {
          successMessage = 'تم تسجيل الحكم النهائي بنجاح وإغلاق جدول الجلسات.';
        }
      }

      // BRANCH 3: Preliminary Judgment (حكم تمهيدي)
      else if (decisionType === 'preliminaryJudgment') {
        const actionLabels = {
          expert: 'ندب خبير',
          documents: 'تقديم مستندات',
          notice: 'إعلان قضائي',
          inspection: 'معاينة',
          witnesses: 'سماع شهود',
          other: 'إجراء آخر',
        };
        const actionLabel = actionLabels[prelimActionType] || 'إجراء تمهيدي';

        currentSessionData = {
          ...currentSessionData,
          status: 'preliminaryJudgment',
          ruling_text: rulingText.trim() || `حكم تمهيدي: ${actionLabel}`,
          notes: `حكم تمهيدي — ${actionLabel}${actionNotes ? ' (' + actionNotes.trim() + ')' : ''}`,
        };

        if (hasNextCourtSession && nextCourtSessionDate) {
          nextSessionData = {
            session_date: nextCourtSessionDate,
            session_time: '09:00',
            status: 'scheduled',
            court_room: caseItem.court_room || null,
            notes: `جلسة بعد الحكم التمهيدي (${actionLabel})`,
          };

          caseUpdates = {
            status: 'preliminaryJudgment',
            next_session_date: nextCourtSessionDate,
            ruling_text: rulingText.trim() || `حكم تمهيدي: ${actionLabel}`,
            notes: `حكم تمهيدي: ${actionLabel}${actionNotes ? ' — ' + actionNotes.trim() : ''}`,
            next_steps: `متابعة ${actionLabel} والجلسة القادمة ${nextCourtSessionDate}`,
          };
        } else {
          caseUpdates = {
            status: 'preliminaryJudgment',
            next_session_date: null, // expert follow-up is NOT a court session
            ruling_text: rulingText.trim() || `حكم تمهيدي: ${actionLabel}`,
            notes: `حكم تمهيدي: ${actionLabel}${actionNotes ? ' — ' + actionNotes.trim() : ''}`,
            next_steps: `متابعة العمل الإداري: ${actionLabel}`,
          };
        }

        const taskTitle = prelimActionType === 'expert'
          ? `متابعة الخبير في الدعوى رقم ${caseItem.case_number}/${caseItem.case_year} (${caseItem.court_name})`
          : `متابعة إجراء (${actionLabel}) - دعوى ${caseItem.case_number}/${caseItem.case_year}`;

        adminTaskData = {
          title: taskTitle,
          client_id: caseItem.client_id || null,
          client_name: clientObj ? clientObj.name : caseItem.plaintiff_name || null,
          execution_date: actionFollowUpDate || addDaysToDate(baseSessionDate, 14),
          location: prelimActionType === 'expert' ? 'مكتب خبراء وزارة العدل' : (caseItem.court_name || null),
          requirements: prelimActionType === 'expert'
            ? `مهمة الخبير: ${expertTask.trim() || 'مباشرة المأمورية'}${expertName ? ' — اسم الخبير: ' + expertName.trim() : ''}`
            : actionNotes.trim() || actionLabel,
          notes: `حكم تمهيدي بالجلسة: ${rulingText.trim() || actionLabel}${actionNotes ? ' — ' + actionNotes.trim() : ''}`,
          assigned_to: assignedLawyerId || null,
          status: 'pending',
        };

        successMessage = `تم تسجيل الحكم التمهيدي وإدراج العمل الإداري بمكتب الأعمال الإدارية${hasNextCourtSession && nextCourtSessionDate ? ` (والجلسة القادمة: ${formatArabicDate(nextCourtSessionDate, true)})` : ''}`;
      }

      // Optional: Client Transaction Expense
      if (sessionExpense && parseFloat(sessionExpense) > 0 && caseItem.client_id) {
        transactionData = {
          client_id: caseItem.client_id,
          case_id: caseItem.id,
          type: 'expense',
          amount: parseFloat(sessionExpense),
          description: sessionExpenseNote.trim() || `مصروفات جلسة ${baseSessionDate}`,
          date: baseSessionDate,
        };
      }

      await recordSessionDecision({
        caseItem,
        currentSessionData,
        nextSessionData,
        caseUpdates,
        appealData,
        adminTaskData,
        transactionData,
      });

      setFeedbackSuccess(successMessage);

      if (onSuccess) {
        onSuccess({
          ...caseUpdates,
          decisionType,
        });
      }

      setTimeout(() => {
        onClose();
      }, 1400);

    } catch (err) {
      console.error('Error in recordSessionDecision:', err);
      alert('حدث خطأ أثناء حفظ القرار: ' + (err.message || 'يرجى إعادة المحاولة'));
      setIsSubmitting(false);
    }
  };

  const DateWarnings = ({ value, afterOk }) => (
    <>
      {!afterOk && (
        <div className="sd-alert sd-alert-danger">
          <TriangleAlert size={16} />
          <span>يجب أن يكون الموعد بعد تاريخ الجلسة الحالية ({formatArabicDate(baseSessionDate, false)}).</span>
        </div>
      )}
      {afterOk && isCourtOffDay(value) && (
        <div className="sd-alert sd-alert-warn">
          <TriangleAlert size={16} />
          <span>هذا اليوم إجازة بالمحاكم (الجمعة / السبت) — تأكد من التاريخ.</span>
        </div>
      )}
    </>
  );

  return (
    <div className="modal-backdrop" onClick={() => { if (!isDirty) onClose(); }}>
      <div className="modal-dialog sd-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header">
          <div className="sd-head">
            <div className="sd-head-icon"><Scale size={20} /></div>
            <div className="sd-head-text">
              <div className="sd-head-title">
                <h3>تسجيل قرار الجلسة</h3>
                <span className="badge sd-case-badge">دعوى {caseItem.case_number} / {caseItem.case_year}</span>
              </div>
              <div className="sd-head-sub">
                {caseItem.court_name}{caseItem.court_room ? ` — قاعة ${caseItem.court_room}` : ''} | تاريخ الجلسة: <b>{formatArabicDate(baseSessionDate, false)}</b>
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-icon sd-close" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        {/* STEPPER */}
        <ol className="sd-stepper">
          {stepTitles.map((title, idx) => {
            const stepNum = idx + 1;
            const state = step === stepNum ? 'active' : step > stepNum ? 'done' : 'todo';
            return (
              <React.Fragment key={idx}>
                <li className={`sd-step is-${state}`}>
                  <span className="sd-step-dot">{state === 'done' ? '✓' : stepNum}</span>
                  <span className="sd-step-label">{title}</span>
                </li>
                {idx < stepTitles.length - 1 && <li className={`sd-step-line ${state === 'done' ? 'is-done' : ''}`} aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </ol>

        {/* BODY */}
        <div className={`modal-body sd-body ${activeDecision ? `sd-tone-${activeDecision.tone}` : ''}`}>
          {feedbackSuccess && (
            <div className="sd-success">
              <CheckCircle2 size={42} />
              <h4>تم تسجيل قرار الجلسة بنجاح</h4>
              <p>{feedbackSuccess}</p>
            </div>
          )}

          {!feedbackSuccess && (
            <>
              {/* STEP 1 */}
              {step === 1 && (
                <div>
                  <div className="sd-intro">
                    <h4>ما هو القرار / الحدث القادم للقضية؟</h4>
                    <p>اختر القرار الصادر في جلسة اليوم ({formatArabicDate(baseSessionDate, false)}) للمتابعة</p>
                  </div>

                  <div className="sd-choice-grid" role="radiogroup" aria-label="القرار الصادر بالجلسة">
                    {DECISIONS.map(({ id, tone, label, hint, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={decisionType === id}
                        className={`sd-choice sd-tone-${tone} ${decisionType === id ? 'is-selected' : ''}`}
                        onClick={() => setDecisionType(id)}
                      >
                        <span className="sd-choice-icon"><Icon size={24} /></span>
                        <strong>{label}</strong>
                        <span className="sd-choice-hint">{hint}</span>
                      </button>
                    ))}
                  </div>

                  <div className="sd-context">
                    <div>الموكل: <b>{caseItem.plaintiff_name || '—'}</b> | الخصم: <b>{caseItem.defendant_name || '—'}</b></div>
                    <div>موضوع الدعوى: <b>{caseItem.case_title || '—'}</b></div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div>
                  {decisionType === 'adjourned' && (
                    <div>
                      <h4 className="sd-section-title"><Clock size={20} /> تحديد تاريخ الجلسة القادمة</h4>

                      <div className="form-group">
                        <label className="form-label sd-label">تاريخ الجلسة القادمة بالمحكمة *</label>
                        <input
                          type="date"
                          className="form-input"
                          required
                          min={addDaysToDate(baseSessionDate, 1)}
                          value={nextSessionDate}
                          onChange={(e) => setNextSessionDate(e.target.value)}
                        />
                      </div>

                      <div className="sd-quick">
                        <span className="sd-quick-label">خيارات سريعة للموعد:</span>
                        <div className="sd-chips">
                          {NEXT_DATE_CHIPS.map((chip) => {
                            const target = addDaysToDate(baseSessionDate, chip.days);
                            return (
                              <button
                                key={chip.days}
                                type="button"
                                className={`sd-chip ${nextSessionDate === target ? 'is-selected' : ''}`}
                                onClick={() => setNextSessionDate(target)}
                              >
                                {chip.label} ({formatArabicDate(target, false)})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <DateWarnings value={nextSessionDate} afterOk={nextDateIsAfter} />

                      {nextSessionDate && nextDateIsAfter && (
                        <div className="sd-alert sd-alert-tone">
                          <CalendarCheck2 size={18} />
                          <span>الجلسة القادمة ستكون يوم: <b>{formatArabicDate(nextSessionDate, true)}</b></span>
                        </div>
                      )}
                    </div>
                  )}

                  {decisionType === 'finalJudgment' && (
                    <div>
                      <h4 className="sd-section-title"><Gavel size={20} /> ما هو الحكم الصادر في الدعوى؟</h4>

                      <div className="form-group">
                        <label className="form-label sd-label">منطوق الحكم الصادر بالجلسة *</label>
                        <textarea
                          className="form-textarea"
                          rows={4}
                          placeholder="أدخل منطوق الحكم بالتفصيل (مثال: حكمت المحكمة بإلزام المدعى عليه بأن يؤدي للمدعي مبلغ وقدره... والمصاريف ومقابل أتعاب المحاماة)"
                          value={rulingText}
                          onChange={(e) => setRulingText(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">ملاحظات إضافية حول الحكم (اختياري)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="مثال: الحكم مشمول بالنفاذ المعجل / تسليم صورة تنفيذية..."
                          value={rulingNotes}
                          onChange={(e) => setRulingNotes(e.target.value)}
                        />
                      </div>

                      <div className="sd-note">
                        <CalendarCheck2 size={15} />
                        <span>تاريخ صدور الحكم:</span>
                        <b>{formatArabicDate(judgmentDate, true)}</b>
                      </div>
                    </div>
                  )}

                  {decisionType === 'preliminaryJudgment' && (
                    <div>
                      <h4 className="sd-section-title"><Briefcase size={20} /> ما الإجراء المطلوب بعد الحكم التمهيدي؟</h4>

                      <div className="sd-action-grid" role="radiogroup" aria-label="نوع الإجراء">
                        {PRELIM_ACTIONS.map(({ id, label, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={prelimActionType === id}
                            className={`sd-action ${prelimActionType === id ? 'is-selected' : ''}`}
                            onClick={() => {
                              setPrelimActionType(id);
                              if (id === 'expert' && !expertTask) {
                                setExpertTask('متابعة مباشرة مأمورية الخبير وسداد الأمانة');
                              }
                            }}
                          >
                            <Icon size={17} />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>

                      {prelimActionType === 'expert' ? (
                        <div className="sd-panel">
                          <div className="sd-grid-2">
                            <div className="form-group">
                              <label className="form-label">اسم الخبير (اختياري)</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="مثال: الخبير الهندسي / الحسابي..."
                                value={expertName}
                                onChange={(e) => setExpertName(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">تاريخ متابعة الخبير *</label>
                              <input
                                type="date"
                                className="form-input"
                                value={actionFollowUpDate}
                                onChange={(e) => setActionFollowUpDate(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="form-group sd-flush">
                            <label className="form-label">مهمة الخبير / المطلوب منه *</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="مثال: الانتقال للعين محل النزاع وبيان أسباب التلفيات وسداد الأمانة"
                              value={expertTask}
                              onChange={(e) => setExpertTask(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="sd-panel">
                          <div className="form-group">
                            <label className="form-label">تاريخ متابعة الإجراء *</label>
                            <input
                              type="date"
                              className="form-input"
                              value={actionFollowUpDate}
                              onChange={(e) => setActionFollowUpDate(e.target.value)}
                            />
                          </div>
                          <div className="form-group sd-flush">
                            <label className="form-label">تفاصيل وملاحظات الإجراء المطلوب</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="أدخل تفاصيل الإجراء..."
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="sd-panel sd-panel-plain">
                        <div className="sd-yesno-row">
                          <span className="sd-label">هل تم تحديد جلسة محكمة قادمة أيضًا؟</span>
                          <div className="sd-segment">
                            <button
                              type="button"
                              className={hasNextCourtSession ? 'is-selected' : ''}
                              onClick={() => setHasNextCourtSession(true)}
                            >
                              نعم
                            </button>
                            <button
                              type="button"
                              className={!hasNextCourtSession ? 'is-selected' : ''}
                              onClick={() => {
                                setHasNextCourtSession(false);
                                setNextCourtSessionDate('');
                              }}
                            >
                              لا (إجراء إداري فقط)
                            </button>
                          </div>
                        </div>

                        {hasNextCourtSession && (
                          <div className="sd-next-court">
                            <label className="form-label sd-label">تاريخ جلسة المحكمة القادمة *</label>
                            <input
                              type="date"
                              className="form-input"
                              min={addDaysToDate(baseSessionDate, 1)}
                              value={nextCourtSessionDate}
                              onChange={(e) => setNextCourtSessionDate(e.target.value)}
                              required
                            />
                            <DateWarnings value={nextCourtSessionDate} afterOk={nextCourtDateIsAfter} />
                            <div className="sd-help">سيتم إدراج هذه الجلسة في رول الجلسات والأجندة كموعد محكمة فعلي.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div>
                  {decisionType === 'adjourned' && (
                    <div>
                      <h4 className="sd-section-title"><Clock size={20} /> بيانات وقرار التأجيل</h4>

                      <div className="form-group">
                        <label className="form-label sd-label">سبب التأجيل وقرار الجلسة *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="مثال: للإعلان بأصل الصحيفة والمستندات / لسداد أمانة الخبير"
                          value={adjournmentReason}
                          onChange={(e) => setAdjournmentReason(e.target.value)}
                          required
                        />
                        <div className="sd-chips sd-chips-tight">
                          {ADJOURN_REASONS.map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              className={`sd-chip ${adjournmentReason === reason ? 'is-selected' : ''}`}
                              onClick={() => setAdjournmentReason(reason)}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">القرار / ملاحظات الجلسة بالتفصيل (اختياري)</label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          placeholder="أي ملاحظات أو قرارات صدرت بالجلسة..."
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                        />
                      </div>

                      <div className="sd-summary">
                        <div>• الجلسة الحالية: <b>{formatArabicDate(baseSessionDate, false)} (مؤجلة)</b></div>
                        <div>• الجلسة القادمة: <b className="sd-accent">{formatArabicDate(nextSessionDate, true)}</b></div>
                      </div>
                    </div>
                  )}

                  {decisionType === 'finalJudgment' && (
                    <div>
                      <div className="sd-intro">
                        <h4>هل سيتم استئناف الحكم؟</h4>
                        <p>حدد ما إذا كان المكتب سيقوم بقيد استئناف على هذا الحكم الصادر</p>
                      </div>

                      <div className="sd-yesno-grid" role="radiogroup" aria-label="استئناف الحكم">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={willAppeal === true}
                          className={`sd-yesno sd-yes ${willAppeal === true ? 'is-selected' : ''}`}
                          onClick={() => setWillAppeal(true)}
                        >
                          <Scale size={24} />
                          <span>نعم، سيتم الاستئناف</span>
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={willAppeal === false}
                          className={`sd-yesno sd-no ${willAppeal === false ? 'is-selected' : ''}`}
                          onClick={() => setWillAppeal(false)}
                        >
                          <Ban size={24} />
                          <span>لا (عدم الاستئناف)</span>
                        </button>
                      </div>

                      {willAppeal === true && (
                        <div className="sd-alert sd-alert-tone sd-alert-block">
                          <div className="sd-alert-title"><CalendarCheck2 size={20} /> موعد متابعة قيد الاستئناف المحسوب آليًا:</div>
                          <div className="sd-alert-big">{formatArabicDate(calculatedAppealDate, true)}</div>
                          <div className="sd-help">
                            • تاريخ صدور الحكم + {APPEAL_FOLLOW_UP_DAYS} يومًا (مع ترحيل يوم الجمعة إلى السبت تلقائيًا).<br />
                            • سيُضاف هذا الموعد إلى الأجندة والتقويم كموعد متابعة مستقل دون اعتباره جلسة محكمة.
                          </div>
                        </div>
                      )}

                      {willAppeal === false && (
                        <div className="sd-summary">
                          سيتم حفظ الحكم النهائي وتحديث حالة القضية، دون إنشاء موعد استئناف بالأجندة.
                        </div>
                      )}
                    </div>
                  )}

                  {decisionType === 'preliminaryJudgment' && (
                    <div>
                      <h4 className="sd-section-title"><FileCheck size={20} /> مراجعة الحكم التمهيدي والعمل الإداري</h4>

                      <div className="form-group">
                        <label className="form-label">منطوق القرار الصادر بالجلسة</label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          placeholder="مثال: حكمت المحكمة بتمهيد القضاء بندب خبير..."
                          value={rulingText}
                          onChange={(e) => setRulingText(e.target.value)}
                        />
                      </div>

                      <div className="sd-summary sd-summary-tone">
                        <div className="sd-summary-title"><ClipboardList size={16} /> سيتم إنشاء عمل إداري في (الأعمال الإدارية):</div>
                        <div>• الموضوع: <b>{prelimActionType === 'expert' ? `متابعة الخبير (${expertName || 'مكتب الخبراء'})` : 'متابعة الإجراء'}</b></div>
                        <div>• تاريخ تنفيذ العمل الإداري: <b>{formatArabicDate(actionFollowUpDate, true)}</b></div>
                        {hasNextCourtSession && nextCourtSessionDate && (
                          <div className="sd-accent">• جلسة المحكمة القادمة: {formatArabicDate(nextCourtSessionDate, true)} (ستظهر برول الجلسات)</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Optional: expenses & team assignment */}
                  <div className="sd-optional">
                    <button type="button" className="sd-optional-toggle" onClick={() => setShowOptionalFields(!showOptionalFields)}>
                      {showOptionalFields ? '▲ إخفاء الخيارات الإضافية' : '▼ خيارات إضافية: مصاريف الجلسة وتكليف الفريق'}
                    </button>

                    {showOptionalFields && (
                      <div className="sd-optional-body">
                        {caseItem.client_id && (
                          <div className="sd-panel sd-panel-sm">
                            <div className="sd-mini-title"><Coins size={15} /> قيد مصروفات بالجلسة على حساب الموكل (اختياري)</div>
                            <div className="sd-expense-grid">
                              <input
                                type="number"
                                step="any"
                                className="form-input sd-ltr"
                                placeholder="المبلغ (ج.م)"
                                value={sessionExpense}
                                onChange={(e) => setSessionExpense(e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-input"
                                placeholder="بيان المصروف (أمانة خبير، رسم، انتقالات...)"
                                value={sessionExpenseNote}
                                onChange={(e) => setSessionExpenseNote(e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        <div className="form-group sd-flush">
                          <label className="form-label sd-mini-title"><UserCheck size={15} /> إسناد / تكليف عضو من الفريق لمتابعة هذه الدعوى (اختياري)</label>
                          <select className="form-select" value={assignedLawyerId} onChange={(e) => setAssignedLawyerId(e.target.value)}>
                            <option value="">-- بدون إسناد / الإبقاء على الحالي --</option>
                            {team.map((m) => (
                              <option key={m.id} value={m.id}>الأستاذ / {m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {clientObj && (
                    <div className={`sd-telegram ${hasTelegram ? 'is-linked' : ''}`}>
                      <Send size={15} />
                      <span>
                        {hasTelegram
                          ? `الموكل (${clientObj.name}) مربوط بالتليجرام — سيتم إرسال إشعار فوري له بنص القرار وتاريخ المتابعة فور الحفظ.`
                          : `الموكل (${clientObj.name}) غير مربوط بالتليجرام.`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        {!feedbackSuccess && (
          <div className="modal-footer sd-footer">
            {step === 1 ? (
              <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(prev => Math.max(1, prev - 1))}>
                <ChevronRight size={16} />
                <span>رجوع</span>
              </button>
            )}

            {step < 3 ? (
              <button type="button" className="btn btn-primary" disabled={!canProceed()} onClick={() => setStep(prev => prev + 1)}>
                <span>التالي</span>
                <ChevronLeft size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={!canProceed() || isSubmitting} onClick={handleSave}>
                {isSubmitting ? (
                  <span>جاري حفظ القرار...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>حفظ القرار</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
