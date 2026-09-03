import React, { useState } from 'react';
import { X, Briefcase, Users, CalendarPlus, UserCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CASE_TYPES, COURT_LEVELS, CASE_STATUSES, SESSION_DECISIONS } from '../../lib/supabase';

export default function QuickActionModal({ isOpen, onClose, initialMode = 'case' }) {
  const [activeMode, setActiveMode] = useState(initialMode);
  const { clients, cases, addCase, addClient, addSession, addTeamMember } = useData();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for Case
  const [caseNumber, setCaseNumber] = useState('');
  const [caseYear, setCaseYear] = useState(new Date().getFullYear());
  const [caseType, setCaseType] = useState('مدني');
  const [courtLevel, setCourtLevel] = useState('ابتدائي');
  const [courtName, setCourtName] = useState('محكمة دمياط الابتدائية');
  const [caseTitle, setCaseTitle] = useState('');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [defendantName, setDefendantName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [status, setStatus] = useState('active');
  const [courtRoom, setCourtRoom] = useState('');
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [notes, setNotes] = useState('');

  // Form states for Client
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNationalId, setClientNationalId] = useState('');
  const [clientPoaNumber, setClientPoaNumber] = useState('');
  const [clientPoaType, setClientPoaType] = useState('توكيل رسمي عام في القضايا');
  const [financialBalance, setFinancialBalance] = useState(0);

  // Form states for Session
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('09:00');
  const [sessionStatus, setSessionStatus] = useState('adjourned');
  const [adjournmentReason, setAdjournmentReason] = useState('');
  const [rulingText, setRulingText] = useState('');
  const [futureSessionDate, setFutureSessionDate] = useState('');

  if (!isOpen) return null;

  const handleSaveCase = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addCase({
        case_number: caseNumber,
        case_year: parseInt(caseYear, 10),
        case_type: caseType,
        court_level: courtLevel,
        court_name: courtName,
        case_title: caseTitle || (caseType ? `دعوى ${CASE_TYPES[caseType] || caseType} رقم ${caseNumber}` : `دعوى رقم ${caseNumber}`),
        plaintiff_name: plaintiffName,
        defendant_name: defendantName,
        client_id: selectedClientId || null,
        status: status,
        court_room: courtRoom || null,
        next_session_date: nextSessionDate ? nextSessionDate : null,
        notes: notes || null,
        is_archived: false,
      });
      setSuccessMsg('تمت إضافة القضية بنجاح!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      alert('خطأ أثناء إضافة القضية: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addClient({
        name: clientName,
        phone: clientPhone || null,
        national_id: clientNationalId || null,
        power_of_attorney_number: clientPoaNumber || null,
        power_of_attorney_type: clientPoaType || null,
        financial_balance: parseFloat(financialBalance) || 0,
        is_power_of_attorney_active: true,
        active_cases_count: 0,
      });
      setSuccessMsg('تمت إضافة الموكل بنجاح!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      alert('خطأ أثناء إضافة الموكل: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!selectedCaseId) {
      alert('يرجى اختيار القضية أولاً');
      return;
    }
    setLoading(true);
    try {
      const updates = {
        status: sessionStatus,
        next_session_date: futureSessionDate || null,
        ruling_text: rulingText || null,
        notes: adjournmentReason || notes || null,
      };

      await addSession({
        case_id: selectedCaseId,
        session_date: sessionDate,
        session_time: sessionTime,
        status: sessionStatus,
        adjournment_reason: adjournmentReason || null,
        ruling_text: rulingText || null,
        notes: notes || null,
      }, updates);

      setSuccessMsg('تم تسجيل الجلسة وتحديث القضية بنجاح!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      alert('خطأ أثناء تسجيل الجلسة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button 
              type="button"
              className={`btn ${activeMode === 'case' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveMode('case')}
            >
              <Briefcase size={16} />
              <span>إضافة قضية</span>
            </button>
            <button 
              type="button"
              className={`btn ${activeMode === 'client' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveMode('client')}
            >
              <Users size={16} />
              <span>إضافة موكل</span>
            </button>
            <button 
              type="button"
              className={`btn ${activeMode === 'session' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveMode('session')}
            >
              <CalendarPlus size={16} />
              <span>تسجيل جلسة</span>
            </button>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {successMsg && (
            <div style={{ padding: '0.8rem', background: 'var(--status-active-bg)', color: 'var(--status-active)', borderRadius: '8px', marginBottom: '1rem', fontWeight: 'bold' }}>
              {successMsg}
            </div>
          )}

          {/* Mode 1: Case */}
          {activeMode === 'case' && (
            <form onSubmit={handleSaveCase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">رقم الدعوى *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="مثال: 1245" 
                    required 
                    value={caseNumber} 
                    onChange={(e) => setCaseNumber(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">السنة القضائية *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    value={caseYear} 
                    onChange={(e) => setCaseYear(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">نوع القضية *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="مثال: مدني، جنائي، أسرة، تعويضات..." 
                    required 
                    value={caseType} 
                    onChange={(e) => setCaseType(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">درجة التقاضي *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="مثال: ابتدائي، استئناف، نقض، جزئي..." 
                    required 
                    value={courtLevel} 
                    onChange={(e) => setCourtLevel(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">المحكمة *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="مثال: محكمة دمياط الابتدائية" 
                    value={courtName} 
                    onChange={(e) => setCourtName(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الدائرة</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="مثال: الدائرة 3 مدني / قاعة 2" 
                    value={courtRoom} 
                    onChange={(e) => setCourtRoom(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">موضوع الدعوى</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="مثال: صحة ونفاذ عقد بيع عقار" 
                  value={caseTitle} 
                  onChange={(e) => setCaseTitle(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">المدعي (الطرف الأول) *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={plaintiffName} 
                    onChange={(e) => setPlaintiffName(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">المدعى عليه (الطرف الثاني) *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={defendantName} 
                    onChange={(e) => setDefendantName(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">الموكل المرتبط بالدعوى</label>
                  <select 
                    className="form-select" 
                    value={selectedClientId} 
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">-- بدون ربط أو اختر لاحقاً --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone || 'بدون هاتف'})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ أول / أقرب جلسة</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={nextSessionDate} 
                    onChange={(e) => setNextSessionDate(e.target.value)} 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ القضية'}
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Client */}
          {activeMode === 'client' && (
            <form onSubmit={handleSaveClient}>
              <div className="form-group">
                <label className="form-label">اسم الموكل بالكامل *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="مثال: أحمد محمد إبراهيم" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف (مصر)</label>
                  <div style={{ display: 'flex', direction: 'ltr', alignItems: 'center' }}>
                    <span style={{ 
                      padding: '0.6rem 0.75rem', 
                      background: 'var(--bg-card-subtle)', 
                      border: '1px solid var(--border-color)', 
                      borderRight: 'none', 
                      borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      fontWeight: '700', 
                      fontSize: '0.85rem',
                      color: 'var(--text-main)'
                    }}>
                      <span>🇪🇬</span>
                      <span>+20</span>
                    </span>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="010XXXXXXXX" 
                      style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0', textAlign: 'left', direction: 'ltr' }}
                      value={clientPhone} 
                      onChange={(e) => setClientPhone(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">الرقم القومي (14 رقم)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="2XXXXXXXXXXXXX" 
                    value={clientNationalId} 
                    onChange={(e) => setClientNationalId(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">رقم التوكيل</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="مثال: 4520 لسنة 2025 توثيق دمياط" 
                    value={clientPoaNumber} 
                    onChange={(e) => setClientPoaNumber(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">نوع التوكيل</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={clientPoaType} 
                    onChange={(e) => setClientPoaType(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">الرصيد المالي المبدئي (موجب له / سالب عليه أتعاب)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={financialBalance} 
                  onChange={(e) => setFinancialBalance(e.target.value)} 
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ الموكل'}
                </button>
              </div>
            </form>
          )}

          {/* Mode 3: Session */}
          {activeMode === 'session' && (
            <form onSubmit={handleSaveSession}>
              <div className="form-group">
                <label className="form-label">اختر الدعوى / القضية *</label>
                <select 
                  className="form-select" 
                  required 
                  value={selectedCaseId} 
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                >
                  <option value="">-- اختر القضية من القائمة --</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      قضية رقم {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">تاريخ الجلسة المتداولة *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required 
                    value={sessionDate} 
                    onChange={(e) => setSessionDate(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">قرار الجلسة / الحالة</label>
                  <select 
                    className="form-select" 
                    value={sessionStatus} 
                    onChange={(e) => setSessionStatus(e.target.value)}
                  >
                    {Object.entries(SESSION_DECISIONS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {sessionStatus === 'adjourned' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">سبب التأجيل والقرار</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="مثال: للإعلان بأصل الصحيفة وتقديم المستندات" 
                      value={adjournmentReason} 
                      onChange={(e) => setAdjournmentReason(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ الجلسة القادمة *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={futureSessionDate} 
                      onChange={(e) => setFutureSessionDate(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {(sessionStatus === 'finalJudgment' || sessionStatus === 'preliminaryJudgment') && (
                <div className="form-group">
                  <label className="form-label">منطوق الحكم</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="أدخل منطوق الحكم الصادر في الجلسة..." 
                    value={rulingText} 
                    onChange={(e) => setRulingText(e.target.value)} 
                  />
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'جاري التسجيل...' : 'تسجيل وتحديث القضية'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
