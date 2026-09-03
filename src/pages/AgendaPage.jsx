import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Printer, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Gavel, 
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CASE_TYPES, CASE_STATUSES, SESSION_DECISIONS, USER_ROLES } from '../lib/supabase';

export default function AgendaPage() {
  const { cases, addSession } = useData();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [courtFilter, setCourtFilter] = useState('ALL');
  
  // Modal for quick decision recording directly from table
  const [decisionCase, setDecisionCase] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('adjourned');
  const [adjournmentReason, setAdjournmentReason] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [rulingText, setRulingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter cases matching selected session date
  const filteredCases = cases.filter(c => {
    const matchesDate = c.next_session_date && c.next_session_date.startsWith(selectedDate);
    const matchesCourt = courtFilter === 'ALL' || c.court_name.includes(courtFilter);
    return matchesDate && matchesCourt;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleRecordDecision = async (e) => {
    e.preventDefault();
    if (!decisionCase) return;
    setIsSaving(true);
    try {
      const updates = {
        status: decisionStatus,
        next_session_date: nextDate || null,
        ruling_text: rulingText || null,
        notes: adjournmentReason || null,
      };

      await addSession({
        case_id: decisionCase.id,
        session_date: selectedDate,
        status: decisionStatus,
        adjournment_reason: adjournmentReason || null,
        ruling_text: rulingText || null,
        notes: adjournmentReason || null,
      }, updates);

      setDecisionCase(null);
      setAdjournmentReason('');
      setNextDate('');
      setRulingText('');
    } catch (err) {
      alert('خطأ أثناء تسجيل القرار: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Top Header */}
      <div className="no-print" style={{
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
              رول الجلسات والمرافعة اليومية
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            أجندة ورول الجلسات القضائية
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ borderRadius: '10px', padding: '0.55rem 1rem', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            onClick={handlePrint}
          >
            <Printer size={16} />
            <span>طباعة رول الجلسة</span>
          </button>
        </div>
      </div>

      {/* Minimal Date & Court Filter Bar (Hidden in Print) */}
      <div className="card no-print" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.15rem', borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-700)' }}>
              <CalendarIcon size={17} />
              <label style={{ fontWeight: '700', fontSize: '0.86rem' }}>تاريخ الجلسة:</label>
            </div>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '160px', padding: '0.45rem 0.75rem', fontSize: '0.86rem', minHeight: '38px', borderRadius: '10px' }}
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
            />
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', minHeight: '38px', borderRadius: '10px' }}
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              اليوم
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Filter size={16} color="var(--text-subtle)" />
            <select 
              className="form-select" 
              style={{ width: '200px', padding: '0.45rem 0.75rem', fontSize: '0.86rem', minHeight: '38px', borderRadius: '10px' }}
              value={courtFilter} 
              onChange={(e) => setCourtFilter(e.target.value)}
            >
              <option value="ALL">جميع المحاكم والدوائر</option>
              <option value="دمياط">محكمة دمياط الابتدائية</option>
              <option value="فارسكور">محكمة فارسكور الجزئية</option>
              <option value="كفر سعد">محكمة كفر سعد</option>
              <option value="رأس البر">محكمة رأس البر</option>
              <option value="الأسرة">محكمة الأسرة</option>
              <option value="الجنايات">محكمة الجنايات</option>
            </select>
          </div>
        </div>
      </div>

      {/* Official Printable Court Document Container with Outer Border Frame */}
      <div className="printable-document-frame">
        {/* Printable Court Official Header */}
        <div className="printable-court-header">
          <div className="print-header-grid">
            <div className="print-header-col right">
              <div style={{ fontWeight: '800', fontSize: '0.98rem', color: 'var(--primary-900)' }}>
                {user?.user_metadata?.full_name 
                  ? (user.user_metadata.full_name.includes('مكتب') ? user.user_metadata.full_name : `مكتب الأستاذ / ${user.user_metadata.full_name}`)
                  : 'مكتب المحاماة والاستشارات القانونية'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {USER_ROLES[user?.user_metadata?.role] || user?.user_metadata?.role || 'المحاماة والاستشارات القانونية'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {user?.user_metadata?.phone 
                  ? `هاتف: ${user.user_metadata.phone}` 
                  : (user?.email ? `البريد: ${user.email}` : 'جمهورية مصر العربية')}
              </div>
            </div>

            <div className="print-header-col center">
              <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary-800)', margin: 0 }}>
                رول الجلسات القضائية اليومي
              </h2>
              <div style={{ fontSize: '0.92rem', fontWeight: '700', marginTop: '0.15rem', color: 'var(--text-main)' }}>
                يوم: {new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {courtFilter !== 'ALL' ? `الدائرة: ${courtFilter}` : 'كافة الدوائر والمحاكم القضائية'}
              </div>
            </div>

            <div className="print-header-col left">
              <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                إجمالي القضايا بالرول: <span style={{ color: 'var(--primary-800)' }}>{filteredCases.length} قضية</span>
              </div>
              <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                المحامي الحاضر: .....................
              </div>
              <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                القاعة / الرول: .....................
              </div>
            </div>
          </div>
        </div>

        {/* Court Roll Table */}
        <div className="card printable-card" style={{ padding: '0', overflow: 'hidden' }}>
          {filteredCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
              <CalendarIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لا توجد جلسات مجدولة لهذا اليوم</h3>
              <p style={{ fontSize: '0.9rem' }}>يمكنك اختيار تاريخ آخر من الأعلى أو إضافة جلسة جديدة لهذا التاريخ.</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table print-table">
                <thead>
                  <tr>
                    <th style={{ width: '4%', textAlign: 'center' }}>م</th>
                    <th style={{ width: '13%' }}>رقم الدعوى والسنة</th>
                    <th style={{ width: '14%' }}>المحكمة والقاعة</th>
                    <th style={{ width: '14%' }}>المدعي (الموكل/الخصم)</th>
                    <th style={{ width: '14%' }}>المدعى عليه</th>
                    <th style={{ width: '15%' }}>موضوع الدعوى</th>
                    <th style={{ width: '10%' }}>الموقف السابق</th>
                    <th className="no-print" style={{ textAlign: 'center', width: '16%' }}>تسجيل القرار</th>
                    <th className="only-print print-decision-col" style={{ width: '16%' }}>قرار الجلسة والتأجيل (يدون باليد)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c, index) => {
                    const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
                    return (
                      <tr key={c.id}>
                        <td style={{ textAlign: 'center' }}></td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{c.case_number}</strong> / {c.case_year}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{CASE_TYPES[c.case_type] || c.case_type}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{c.court_name}</div>
                          {c.court_room && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>قاعة: {c.court_room}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{c.plaintiff_name}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{c.defendant_name}</div>
                        </td>
                        <td>
                          <div>{c.case_title || '—'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                            {c.notes || '—'}
                          </div>
                        </td>
                        {/* Screen Action Button */}
                        <td className="no-print" style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
                            onClick={() => {
                              const validStatus = SESSION_DECISIONS[c.status] ? c.status : 'adjourned';
                              setDecisionCase(c);
                              setDecisionStatus(validStatus);
                              setAdjournmentReason(c.notes || '');
                              setNextDate(c.next_session_date ? c.next_session_date.split('T')[0] : '');
                              setRulingText(c.ruling_text || '');
                            }}
                          >
                            <Gavel size={14} />
                            <span>إثبات القرار</span>
                          </button>
                        </td>
                        {/* Printable Handwritten Notes Cell */}
                        <td className="only-print print-decision-cell">
                          <div className="print-handwritten-space"></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Printable Court Official Footer */}
        <div className="printable-court-footer only-print">
          <div className="print-footer-grid">
            <div>
              <strong>توقيع الأستاذ الحاضر بالجلسة:</strong> ....................................................
            </div>
            <div>
              <strong>ختم واعتماد المكتب:</strong> ....................................................
            </div>
            <div style={{ textAlign: 'left', direction: 'ltr', fontSize: '0.78rem', color: '#666' }}>
              طبع بتاريخ: {new Date().toLocaleDateString('ar-EG')} — الأجندة القضائية
            </div>
          </div>
        </div>
      </div>

      {/* Decision Recording Modal */}
      {decisionCase && (
        <div className="modal-backdrop" onClick={() => setDecisionCase(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تسجيل قرار الجلسة لدعوى رقم {decisionCase.case_number}/{decisionCase.caseYear || decisionCase.case_year}</h3>
            </div>
            <form onSubmit={handleRecordDecision}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">قرار المحكمة في الجلسة *</label>
                  <select 
                    className="form-select" 
                    value={decisionStatus} 
                    onChange={(e) => setDecisionStatus(e.target.value)}
                  >
                    {Object.entries(SESSION_DECISIONS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                {decisionStatus === 'adjourned' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">سبب التأجيل والقرار بالجلسة</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="مثال: لتقديم المذكرات وسداد أمانة الخبير" 
                        value={adjournmentReason} 
                        onChange={(e) => setAdjournmentReason(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">تاريخ الجلسة القادمة *</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        required 
                        value={nextDate} 
                        onChange={(e) => setNextDate(e.target.value)} 
                      />
                    </div>
                  </>
                )}

                {(decisionStatus === 'finalJudgment' || decisionStatus === 'preliminaryJudgment') && (
                  <div className="form-group">
                    <label className="form-label">منطوق الحكم</label>
                    <textarea 
                      className="form-textarea" 
                      placeholder="أدخل منطوق الحكم الصادر في الجلسة بالتفصيل..." 
                      value={rulingText} 
                      onChange={(e) => setRulingText(e.target.value)} 
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDecisionCase(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'جاري الحفظ...' : 'حفظ القرار وتحديث الأجندة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
