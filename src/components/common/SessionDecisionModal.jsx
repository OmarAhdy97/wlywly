import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar as CalendarIcon,
  Gavel,
  FileText,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Coins,
  Send,
  Sparkles,
  Search,
  Scale,
  CalendarCheck2,
  FileCheck
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calculateAppealFollowUpDate, formatArabicDate, addDaysToDate, APPEAL_FOLLOW_UP_DAYS } from '../../lib/dateRules';

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

  // ----------------------------------------------------
  // FORM FIELDS: 1. Postponement (تأجيل)
  // ----------------------------------------------------
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [adjournmentReason, setAdjournmentReason] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // ----------------------------------------------------
  // FORM FIELDS: 2. Final Judgment (حكم نهائي)
  // ----------------------------------------------------
  const [rulingText, setRulingText] = useState('');
  const [rulingNotes, setRulingNotes] = useState('');
  const [judgmentDate, setJudgmentDate] = useState(baseSessionDate);
  const [willAppeal, setWillAppeal] = useState(null); // true | false | null

  // ----------------------------------------------------
  // FORM FIELDS: 3. Preliminary Judgment (حكم تمهيدي)
  // ----------------------------------------------------
  const [prelimActionType, setPrelimActionType] = useState('expert'); // 'expert' | 'documents' | 'notice' | 'inspection' | 'witnesses' | 'other'
  const [expertName, setExpertName] = useState('');
  const [expertTask, setExpertTask] = useState('');
  const [actionFollowUpDate, setActionFollowUpDate] = useState(addDaysToDate(baseSessionDate, 14));
  const [actionNotes, setActionNotes] = useState('');
  const [hasNextCourtSession, setHasNextCourtSession] = useState(false);
  const [nextCourtSessionDate, setNextCourtSessionDate] = useState('');

  // Optional: Session Expenses & Assignment (Preserved features)
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

      // Postponement defaults
      setNextSessionDate('');
      setAdjournmentReason(caseItem.notes || '');
      setSessionNotes('');

      // Judgment defaults
      setRulingText(caseItem.ruling_text || '');
      setRulingNotes('');
      setJudgmentDate(baseSessionDate);
      setWillAppeal(null);

      // Preliminary defaults
      setPrelimActionType('expert');
      setExpertName('');
      setExpertTask('متابعة مباشرة مأمورية الخبير وسداد الأمانة');
      setActionFollowUpDate(addDaysToDate(baseSessionDate, 14));
      setActionNotes('');
      setHasNextCourtSession(false);
      setNextCourtSessionDate('');

      // Optional
      setShowOptionalFields(false);
      setSessionExpense('');
      setSessionExpenseNote('');
      setAssignedLawyerId(caseItem.next_steps || '');
    }
  }, [caseItem, baseSessionDate]);

  if (!isOpen || !caseItem) return null;

  // Linked Client
  const clientObj = caseItem.client_id ? clients.find(c => c.id === caseItem.client_id) : null;
  const hasTelegram = !!(clientObj && clientObj.telegram_chat_id);

  // Calculated Appeal Follow-up Date
  const calculatedAppealDate = judgmentDate ? calculateAppealFollowUpDate(judgmentDate, APPEAL_FOLLOW_UP_DAYS) : '';

  // Dynamic Stepper Titles
  const getStepTitles = () => {
    if (decisionType === 'adjourned') {
      return ['القرار', 'الجلسة القادمة', 'التفاصيل والحفظ'];
    }
    if (decisionType === 'finalJudgment') {
      return ['القرار', 'منطوق الحكم', 'الاستئناف والحفظ'];
    }
    if (decisionType === 'preliminaryJudgment') {
      return ['القرار', 'الإجراء المطلوب', 'المراجعة والحفظ'];
    }
    return ['القرار', 'الموعد / الإجراء', 'التأكيد والحفظ'];
  };

  const stepTitles = getStepTitles();

  // Validate current step before moving next
  const canProceed = () => {
    if (step === 1) {
      return !!decisionType;
    }
    if (step === 2) {
      if (decisionType === 'adjourned') {
        return !!nextSessionDate;
      }
      if (decisionType === 'finalJudgment') {
        return !!rulingText.trim();
      }
      if (decisionType === 'preliminaryJudgment') {
        if (prelimActionType === 'expert' && !expertTask.trim()) return false;
        if (hasNextCourtSession && !nextCourtSessionDate) return false;
        return true;
      }
    }
    if (step === 3) {
      if (decisionType === 'finalJudgment') {
        return willAppeal !== null;
      }
      if (decisionType === 'adjourned') {
        return true;
      }
      if (decisionType === 'preliminaryJudgment') {
        return true;
      }
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

      // ----------------------------------------------------
      // BRANCH 1: Postponement (تأجيل)
      // ----------------------------------------------------
      if (decisionType === 'adjourned') {
        currentSessionData = {
          ...currentSessionData,
          status: 'adjourned',
          adjournment_reason: adjournmentReason.trim() || null,
          notes: sessionNotes.trim() || adjournmentReason.trim() || 'تأجيل الجلسة',
          ruling_text: null,
        };

        // Scheduled Next Court Session
        nextSessionData = {
          session_date: nextSessionDate,
          session_time: '09:00',
          status: 'scheduled',
          court_room: caseItem.court_room || null,
          notes: `مؤجلة من جلسة ${baseSessionDate}${adjournmentReason ? ': ' + adjournmentReason.trim() : ''}`,
        };

        // Case update with actual court session date
        caseUpdates = {
          status: 'adjourned',
          next_session_date: nextSessionDate,
          notes: adjournmentReason.trim() || caseItem.notes || null,
          next_steps: assignedLawyerId || caseItem.next_steps || null,
        };

        successMessage = `تم تسجيل التأجيل وتحديد الجلسة القادمة: ${formatArabicDate(nextSessionDate, true)}`;
      }

      // ----------------------------------------------------
      // BRANCH 2: Final Judgment (حكم نهائي)
      // ----------------------------------------------------
      else if (decisionType === 'finalJudgment') {
        currentSessionData = {
          ...currentSessionData,
          status: 'finalJudgment',
          ruling_text: rulingText.trim(),
          notes: willAppeal
            ? `حكم نهائي — تقرر الاستئناف (موعد المتابعة: ${calculatedAppealDate})${rulingNotes ? ' — ' + rulingNotes.trim() : ''}`
            : `حكم نهائي — لا يوجد استئناف${rulingNotes ? ' — ' + rulingNotes.trim() : ''}`,
        };

        // Case update: next_session_date is NOT court session, so it is NULL
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

      // ----------------------------------------------------
      // BRANCH 3: Preliminary Judgment (حكم تمهيدي)
      // ----------------------------------------------------
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

        // If next court session is scheduled
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
            next_session_date: null, // expert follow-up is NOT a court session!
            ruling_text: rulingText.trim() || `حكم تمهيدي: ${actionLabel}`,
            notes: `حكم تمهيدي: ${actionLabel}${actionNotes ? ' — ' + actionNotes.trim() : ''}`,
            next_steps: `متابعة العمل الإداري: ${actionLabel}`,
          };
        }

        // Administrative Follow-up Task in AdministrativePage
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

      // Execute unified database/context action
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{
          maxWidth: '680px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="modal-header" style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(55, 4, 10, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Scale size={20} color="#37040a" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.08rem', fontWeight: '800', margin: 0, color: '#37040a' }}>
                  تسجيل قرار الجلسة
                </h3>
                <span className="badge" style={{ background: '#fdf2f2', color: '#37040a', border: '1px solid rgba(55, 4, 10, 0.15)', fontSize: '0.8rem', fontWeight: '700' }}>
                  دعوى {caseItem.case_number} / {caseItem.case_year}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {caseItem.court_name} {caseItem.court_room ? `— قاعة ${caseItem.court_room}` : ''} | تاريخ الجلسة: <b>{formatArabicDate(baseSessionDate, false)}</b>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* STEPPER INDICATOR */}
        <div style={{
          background: '#f8fafc',
          padding: '0.65rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          {stepTitles.map((title, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;

            return (
              <React.Fragment key={idx}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: isActive || isCompleted ? '700' : '500',
                  color: isActive ? '#37040a' : (isCompleted ? '#15803d' : '#94a3b8'),
                }}>
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    background: isActive ? '#37040a' : (isCompleted ? '#dcfce7' : '#e2e8f0'),
                    color: isActive ? '#ffffff' : (isCompleted ? '#15803d' : '#64748b'),
                    fontWeight: '800'
                  }}>
                    {isCompleted ? '✓' : stepNum}
                  </span>
                  <span>{title}</span>
                </div>
                {idx < stepTitles.length - 1 && (
                  <div style={{ width: '20px', height: '1.5px', background: isCompleted ? '#22c55e' : '#cbd5e1' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div className="modal-body" style={{ padding: '1.25rem', overflowY: 'auto' }}>
          {/* SUCCESS FEEDBACK STATE */}
          {feedbackSuccess && (
            <div style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              color: '#15803d',
              margin: '1rem 0'
            }}>
              <CheckCircle2 size={42} color="#22c55e" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '800', fontSize: '1.15rem' }}>
                تم تسجيل قرار الجلسة بنجاح
              </h4>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#166534', lineHeight: 1.5 }}>
                {feedbackSuccess}
              </p>
            </div>
          )}

          {!feedbackSuccess && (
            <>
              {/* ==================================================== */}
              {/* STEP 1: SELECT NEXT EVENT TYPE                      */}
              {/* ==================================================== */}
              {step === 1 && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#37040a', margin: '0 0 0.4rem' }}>
                      ما هو القرار / الحدث القادم للقضية؟
                    </h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
                      اختر القرار الصادر في جلسة اليوم ({formatArabicDate(baseSessionDate, false)}) للمتابعة
                    </p>
                  </div>

                  {/* 3 Main Choice Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem', marginBottom: '1rem' }}>
                    {/* Option 1: تأجيل */}
                    <div
                      onClick={() => setDecisionType('adjourned')}
                      style={{
                        padding: '1.1rem 1rem',
                        borderRadius: '14px',
                        border: decisionType === 'adjourned' ? '2.5px solid #ea580c' : '1.5px solid #e2e8f0',
                        background: decisionType === 'adjourned' ? 'rgba(234, 88, 12, 0.05)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: decisionType === 'adjourned' ? '0 4px 12px rgba(234, 88, 12, 0.15)' : 'none',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: decisionType === 'adjourned' ? '#ea580c' : '#fff7ed',
                        color: decisionType === 'adjourned' ? '#ffffff' : '#ea580c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Clock size={24} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.1rem', color: decisionType === 'adjourned' ? '#ea580c' : 'var(--text-main)', display: 'block' }}>
                          تأجيل
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                          تحديد جلسة محكمة قادمة وسبب التأجيل
                        </span>
                      </div>
                    </div>

                    {/* Option 2: حكم نهائي */}
                    <div
                      onClick={() => setDecisionType('finalJudgment')}
                      style={{
                        padding: '1.1rem 1rem',
                        borderRadius: '14px',
                        border: decisionType === 'finalJudgment' ? '2.5px solid #15803d' : '1.5px solid #e2e8f0',
                        background: decisionType === 'finalJudgment' ? 'rgba(21, 128, 61, 0.05)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: decisionType === 'finalJudgment' ? '0 4px 12px rgba(21, 128, 61, 0.15)' : 'none',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: decisionType === 'finalJudgment' ? '#15803d' : '#f0fdf4',
                        color: decisionType === 'finalJudgment' ? '#ffffff' : '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Gavel size={24} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.1rem', color: decisionType === 'finalJudgment' ? '#15803d' : 'var(--text-main)', display: 'block' }}>
                          حكم نهائي
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                          منطوق الحكم وخيار متابعة الاستئناف
                        </span>
                      </div>
                    </div>

                    {/* Option 3: حكم تمهيدي */}
                    <div
                      onClick={() => setDecisionType('preliminaryJudgment')}
                      style={{
                        padding: '1.1rem 1rem',
                        borderRadius: '14px',
                        border: decisionType === 'preliminaryJudgment' ? '2.5px solid #1d4ed8' : '1.5px solid #e2e8f0',
                        background: decisionType === 'preliminaryJudgment' ? 'rgba(29, 78, 216, 0.05)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: decisionType === 'preliminaryJudgment' ? '0 4px 12px rgba(29, 78, 216, 0.15)' : 'none',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: decisionType === 'preliminaryJudgment' ? '#1d4ed8' : '#eff6ff',
                        color: decisionType === 'preliminaryJudgment' ? '#ffffff' : '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.1rem', color: decisionType === 'preliminaryJudgment' ? '#1d4ed8' : 'var(--text-main)', display: 'block' }}>
                          حكم تمهيدي
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                          ندب خبير، مستندات، أو عمل إداري
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Case Context Pill */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.84rem',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div>
                      الموكل: <b>{caseItem.plaintiff_name || '—'}</b> | الخصم: <b>{caseItem.defendant_name || '—'}</b>
                    </div>
                    <div>
                      موضوع الدعوى: <b>{caseItem.case_title || '—'}</b>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* STEP 2: DETAILS BASED ON DECISION                   */}
              {/* ==================================================== */}
              {step === 2 && (
                <div>
                  {/* Branch 1 Step 2: Postponement -> Next Session Date Picker */}
                  {decisionType === 'adjourned' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Clock size={20} color="#ea580c" />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          تحديد تاريخ الجلسة القادمة
                        </h4>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: '700' }}>
                          تاريخ الجلسة القادمة بالمحكمة *
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          required
                          style={{ fontSize: '1.05rem', padding: '0.7rem' }}
                          value={nextSessionDate}
                          onChange={(e) => setNextSessionDate(e.target.value)}
                        />
                      </div>

                      {/* Quick Jump Date Chips */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>
                          خيارات سريعة للموعد:
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {[
                            { label: 'بعد أسبوع', days: 7 },
                            { label: 'بعد أسبوعين', days: 14 },
                            { label: 'بعد 3 أسابيع', days: 21 },
                            { label: 'بعد شهر', days: 30 },
                          ].map((chip) => {
                            const target = addDaysToDate(baseSessionDate, chip.days);
                            const isSelected = nextSessionDate === target;
                            return (
                              <button
                                key={chip.days}
                                type="button"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  borderRadius: '20px',
                                  border: isSelected ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                                  background: isSelected ? '#fff7ed' : '#ffffff',
                                  color: isSelected ? '#c2410c' : '#475569',
                                  fontWeight: isSelected ? '700' : '500',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setNextSessionDate(target)}
                              >
                                {chip.label} ({formatArabicDate(target, false)})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {nextSessionDate && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: '#fff7ed',
                          borderRadius: '10px',
                          border: '1px solid #ffedd5',
                          fontSize: '0.86rem',
                          color: '#9a3412',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <CalendarCheck2 size={18} />
                          <span>الجلسة القادمة ستكون يوم: <b>{formatArabicDate(nextSessionDate, true)}</b></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Branch 2 Step 2: Final Judgment -> Ruling Text */}
                  {decisionType === 'finalJudgment' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Gavel size={20} color="#15803d" />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          ما هو الحكم الصادر في الدعوى؟
                        </h4>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: '700' }}>
                          منطوق الحكم الصادر بالجلسة *
                        </label>
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
                        <label className="form-label">
                          ملاحظات إضافية حول الحكم (اختياري)
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="مثال: الحكم مشمول بالنفاذ المعجل / تسليم صورة تنفيذية..."
                          value={rulingNotes}
                          onChange={(e) => setRulingNotes(e.target.value)}
                        />
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>📅 تاريخ صدور الحكم:</span>
                        <b>{formatArabicDate(judgmentDate, true)}</b>
                      </div>
                    </div>
                  )}

                  {/* Branch 3 Step 2: Preliminary Judgment -> Action selection */}
                  {decisionType === 'preliminaryJudgment' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Briefcase size={20} color="#1d4ed8" />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          ما الإجراء المطلوب بعد الحكم التمهيدي؟
                        </h4>
                      </div>

                      {/* Action selector buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                        {[
                          { id: 'expert', label: 'خبير', icon: '⚖️' },
                          { id: 'documents', label: 'تقديم مستندات', icon: '📄' },
                          { id: 'notice', label: 'إعلان قضائي', icon: '📢' },
                          { id: 'inspection', label: 'معاينة', icon: '🔍' },
                          { id: 'witnesses', label: 'سماع شهود', icon: '👥' },
                          { id: 'other', label: 'إجراء آخر', icon: '⚡' },
                        ].map((act) => {
                          const isSelected = prelimActionType === act.id;
                          return (
                            <button
                              key={act.id}
                              type="button"
                              style={{
                                padding: '0.65rem 0.5rem',
                                borderRadius: '10px',
                                border: isSelected ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                color: isSelected ? '#1e40af' : '#334155',
                                fontWeight: isSelected ? '700' : '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                fontSize: '0.85rem'
                              }}
                              onClick={() => {
                                setPrelimActionType(act.id);
                                if (act.id === 'expert' && !expertTask) {
                                  setExpertTask('متابعة مباشرة مأمورية الخبير وسداد الأمانة');
                                }
                              }}
                            >
                              <span>{act.icon}</span>
                              <span>{act.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Expert Fields */}
                      {prelimActionType === 'expert' ? (
                        <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">اسم الخبير (اختياري)</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="مثال: الخبير الهندسي / الحسابي..."
                                value={expertName}
                                onChange={(e) => setExpertName(e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">تاريخ متابعة الخبير *</label>
                              <input
                                type="date"
                                className="form-input"
                                value={actionFollowUpDate}
                                onChange={(e) => setActionFollowUpDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
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
                        /* Other Action Fields */
                        <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">تاريخ متابعة الإجراء *</label>
                            <input
                              type="date"
                              className="form-input"
                              value={actionFollowUpDate}
                              onChange={(e) => setActionFollowUpDate(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
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

                      {/* Next Court Session Query for Preliminary Judgment */}
                      <div style={{
                        padding: '0.85rem 1rem',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>
                            هل تم تحديد جلسة محكمة قادمة أيضاً؟
                          </span>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              style={{
                                padding: '0.35rem 0.9rem',
                                borderRadius: '8px',
                                border: hasNextCourtSession ? '2px solid #15803d' : '1px solid #cbd5e1',
                                background: hasNextCourtSession ? '#f0fdf4' : '#ffffff',
                                color: hasNextCourtSession ? '#15803d' : '#475569',
                                fontWeight: '700',
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                              onClick={() => setHasNextCourtSession(true)}
                            >
                              نعم
                            </button>
                            <button
                              type="button"
                              style={{
                                padding: '0.35rem 0.9rem',
                                borderRadius: '8px',
                                border: !hasNextCourtSession ? '2px solid #64748b' : '1px solid #cbd5e1',
                                background: !hasNextCourtSession ? '#f1f5f9' : '#ffffff',
                                color: !hasNextCourtSession ? '#334155' : '#475569',
                                fontWeight: '700',
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
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
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                            <label className="form-label" style={{ fontWeight: '700', color: '#15803d' }}>
                              تاريخ جلسة المحكمة القادمة *
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={nextCourtSessionDate}
                              onChange={(e) => setNextCourtSessionDate(e.target.value)}
                              required
                            />
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              سيتم إدراج هذه الجلسة في رول الجلسات والأجندة كموعد محكمة فعلي.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* STEP 3: DETAILS & CONFIRMATION                       */}
              {/* ==================================================== */}
              {step === 3 && (
                <div>
                  {/* Branch 1 Step 3: Postponement Details */}
                  {decisionType === 'adjourned' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Clock size={20} color="#ea580c" />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          بيانات وقرار التأجيل
                        </h4>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: '700' }}>
                          سبب التأجيل وقرار الجلسة *
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="مثال: للإعلان بأصل الصحيفة والمستندات / لسداد أمانة الخبير"
                          value={adjournmentReason}
                          onChange={(e) => setAdjournmentReason(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          القرار / ملاحظات الجلسة بالتفصيل (اختياري)
                        </label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          placeholder="أي ملاحظات أو قرارات صدرت بالجلسة..."
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                        />
                      </div>

                      {/* Summary Banner */}
                      <div style={{
                        padding: '0.75rem 1rem',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.84rem',
                        color: '#334155',
                        marginBottom: '0.75rem'
                      }}>
                        <div>• الجلسة الحالية: <b>{formatArabicDate(baseSessionDate, false)} (مؤجلة)</b></div>
                        <div>• الجلسة القادمة: <b style={{ color: '#ea580c' }}>{formatArabicDate(nextSessionDate, true)}</b></div>
                      </div>
                    </div>
                  )}

                  {/* Branch 2 Step 3: Final Judgment -> Appeal Decision */}
                  {decisionType === 'finalJudgment' && (
                    <div>
                      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#15803d', margin: '0 0 0.35rem' }}>
                          هل سيتم استئناف الحكم؟
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                          حدد ما إذا كان المكتب سيقوم بقيد استئناف على هذا الحكم الصادر
                        </p>
                      </div>

                      {/* Yes / No Choices */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '1.25rem' }}>
                        <button
                          type="button"
                          style={{
                            padding: '1.1rem 1rem',
                            borderRadius: '12px',
                            border: willAppeal === true ? '2.5px solid #15803d' : '1.5px solid #e2e8f0',
                            background: willAppeal === true ? '#f0fdf4' : '#ffffff',
                            color: willAppeal === true ? '#15803d' : '#334155',
                            fontWeight: '800',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setWillAppeal(true)}
                        >
                          <span style={{ fontSize: '1.4rem' }}>⚖️</span>
                          <span>نعم، سيتم الاستئناف</span>
                        </button>

                        <button
                          type="button"
                          style={{
                            padding: '1.1rem 1rem',
                            borderRadius: '12px',
                            border: willAppeal === false ? '2.5px solid #64748b' : '1.5px solid #e2e8f0',
                            background: willAppeal === false ? '#f1f5f9' : '#ffffff',
                            color: willAppeal === false ? '#1e293b' : '#334155',
                            fontWeight: '800',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setWillAppeal(false)}
                        >
                          <span style={{ fontSize: '1.4rem' }}>🛑</span>
                          <span>لا (عدم الاستئناف)</span>
                        </button>
                      </div>

                      {/* Appeal Follow-up Date Banner */}
                      {willAppeal === true && (
                        <div style={{
                          padding: '0.9rem 1.15rem',
                          background: 'rgba(37, 99, 235, 0.08)',
                          border: '1.5px solid rgba(37, 99, 235, 0.35)',
                          borderRadius: '12px',
                          color: '#1e40af',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '0.95rem' }}>
                            <CalendarCheck2 size={20} color="#1d4ed8" />
                            <span>موعد متابعة قيد الاستئناف المحسوب آلياً:</span>
                          </div>
                          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1e3a8a', marginTop: '0.35rem' }}>
                            {formatArabicDate(calculatedAppealDate, true)}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: '0.3rem', lineHeight: 1.4 }}>
                            • تم الحساب برمجياً: تاريخ صدور الحكم + {APPEAL_FOLLOW_UP_DAYS} يوماً (مع ترحيل يوم الجمعة إلى السبت تلقائياً).<br />
                            • سيتم إضافة هذا الموعد إلى الأجندة والتقويم كموعد متابعة مستقل دون اعتباره جلسة محكمة.
                          </div>
                        </div>
                      )}

                      {willAppeal === false && (
                        <div style={{
                          padding: '0.85rem 1rem',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.84rem',
                          color: '#475569',
                          marginBottom: '1rem'
                        }}>
                          سيتم حفظ الحكم النهائي وتحديث حالة القضية، دون إنشاء موعد استئناف بالأجندة.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Branch 3 Step 3: Preliminary Judgment Review */}
                  {decisionType === 'preliminaryJudgment' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <FileCheck size={20} color="#1d4ed8" />
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          مراجعة الحكم التمهيدي والعمل الإداري
                        </h4>
                      </div>

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

                      {/* Review Card */}
                      <div style={{
                        padding: '0.9rem 1rem',
                        background: '#eff6ff',
                        borderRadius: '12px',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.84rem',
                        color: '#1e3a8a',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>📋</span>
                          <span>سيتم إنشاء عمل إداري في (الأعمال الإدارية):</span>
                        </div>
                        <div>• الموضوع: <b>{prelimActionType === 'expert' ? `متابعة الخبير (${expertName || 'مكتب الخبراء'})` : 'متابعة الإجراء'}</b></div>
                        <div>• تاريخ تنفيذ العمل الإداري: <b>{formatArabicDate(actionFollowUpDate, true)}</b></div>
                        {hasNextCourtSession && nextCourtSessionDate && (
                          <div style={{ color: '#15803d', fontWeight: '700' }}>
                            • جلسة المحكمة القادمة: {formatArabicDate(nextCourtSessionDate, true)} (ستظهر برول الجلسات)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OPTIONAL COLLAPSIBLE SECTION: Expenses & Lawyer assignment */}
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: 0
                      }}
                      onClick={() => setShowOptionalFields(!showOptionalFields)}
                    >
                      <span>{showOptionalFields ? '▲ إخفاء الخيارات الإضافية' : '▼ خيارات إضافية: مصاريف الجلسة وتكليف الفريق'}</span>
                    </button>

                    {showOptionalFields && (
                      <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {/* Session Expenses */}
                        {caseItem.client_id && (
                          <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Coins size={15} color="#c59828" />
                              <span>قيد مصروفات بالجلسة على حساب الموكل (اختياري)</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                              <input
                                type="number"
                                step="any"
                                className="form-input"
                                placeholder="المبلغ (ج.م)"
                                style={{ fontSize: '0.82rem', direction: 'ltr', textAlign: 'left' }}
                                value={sessionExpense}
                                onChange={(e) => setSessionExpense(e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-input"
                                placeholder="بيان المصروف (أمانة خبير، رسم، انتقالات...)"
                                style={{ fontSize: '0.82rem' }}
                                value={sessionExpenseNote}
                                onChange={(e) => setSessionExpenseNote(e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Team Assignment */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <UserCheck size={15} color="#37040a" />
                            <span>إسناد / تكليف عضو من الفريق لمتابعة هذه الدعوى (اختياري)</span>
                          </label>
                          <select
                            className="form-select"
                            style={{ fontSize: '0.82rem' }}
                            value={assignedLawyerId}
                            onChange={(e) => setAssignedLawyerId(e.target.value)}
                          >
                            <option value="">-- بدون إسناد / الإبقاء على الحالي --</option>
                            {team.map((m) => (
                              <option key={m.id} value={m.id}>
                                الأستاذ / {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Telegram Client Notice */}
                  {clientObj && (
                    <div style={{
                      padding: '0.55rem 0.8rem',
                      background: hasTelegram ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-card-subtle)',
                      border: `1px solid ${hasTelegram ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      color: hasTelegram ? '#15803d' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      marginTop: '0.75rem'
                    }}>
                      <span>{hasTelegram ? '📱' : 'ℹ️'}</span>
                      <span>
                        {hasTelegram
                          ? `الموكل (${clientObj.name}) مربوط بالتليجرام — سيتم إرسال إشعار فوري له بنص القرار وتاريخ المتابعة فور الحفظ.`
                          : `الموكل (${clientObj.name}) غير مربوط بالتليجرام.`
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        {!feedbackSuccess && (
          <div className="modal-footer" style={{
            background: '#ffffff',
            borderTop: '1px solid var(--border-color)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {/* Left Button (Cancel on step 1, Back on step 2 & 3) */}
            {step === 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem', fontWeight: '700', borderRadius: '8px' }}
                onClick={onClose}
              >
                إلغاء
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onClick={() => setStep(prev => Math.max(1, prev - 1))}
              >
                <ChevronRight size={16} />
                <span>رجوع</span>
              </button>
            )}

            {/* Right Button (Next on step 1 & 2, Save on step 3) */}
            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: '#37040a',
                  color: '#ffffff',
                  padding: '0.55rem 1.4rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: canProceed() ? 1 : 0.5,
                  cursor: canProceed() ? 'pointer' : 'not-allowed'
                }}
                disabled={!canProceed()}
                onClick={() => setStep(prev => prev + 1)}
              >
                <span>التالي</span>
                <ChevronLeft size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: '#37040a',
                  color: '#ffffff',
                  padding: '0.55rem 1.6rem',
                  fontSize: '0.92rem',
                  fontWeight: '800',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  opacity: canProceed() && !isSubmitting ? 1 : 0.5,
                  cursor: canProceed() && !isSubmitting ? 'pointer' : 'not-allowed'
                }}
                disabled={!canProceed() || isSubmitting}
                onClick={handleSave}
              >
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
