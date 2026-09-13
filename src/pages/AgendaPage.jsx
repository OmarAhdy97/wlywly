import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Printer,
  Clock,
  CheckCircle,
  AlertTriangle,
  Gavel,
  Filter,
  FileSpreadsheet,
  Scale
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CASE_TYPES, CASE_STATUSES, SESSION_DECISIONS, USER_ROLES } from '../lib/supabase';
import LawFirmPrintHeader from '../components/common/LawFirmPrintHeader';
import { printWithTitle, DEFAULT_APP_TITLE } from '../lib/printUtils';

export default function AgendaPage() {
  const { cases, clients, addSession, addTransaction, officeProfile } = useData();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [courtFilter, setCourtFilter] = useState('ALL');
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  // Modal for quick decision recording directly from table
  const [decisionCase, setDecisionCase] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('adjourned');
  const [adjournmentReason, setAdjournmentReason] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [rulingText, setRulingText] = useState('');
  const [sessionExpense, setSessionExpense] = useState('');
  const [sessionExpenseNote, setSessionExpenseNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter cases matching selected session date
  const filteredCases = cases.filter(c => {
    const matchesDate = c.next_session_date && c.next_session_date.startsWith(selectedDate);
    const matchesCourt = courtFilter === 'ALL' || c.court_name.includes(courtFilter);
    return matchesDate && matchesCourt;
  });

  const getUniqueRollTitle = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const courtStr = courtFilter !== 'ALL' ? courtFilter : 'كافة المحاكم';
    const lawyerStr = officeProfile?.lawyer_name ? ` — أ. ${officeProfile.lawyer_name}` : '';
    return `رول جلسات ${selectedDate} — ${courtStr}${lawyerStr} (${timeStr})`;
  };

  const handlePrint = () => {
    printWithTitle(getUniqueRollTitle());
  };

  // Ensure Ctrl+P or browser menu print also gets the unique document title
  useEffect(() => {
    const onBeforePrint = () => {
      document.title = getUniqueRollTitle().replace(/[/\\:*?"<>|]/g, '-');
    };
    const onAfterPrint = () => {
      document.title = DEFAULT_APP_TITLE;
    };

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [selectedDate, courtFilter, officeProfile]);

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

      const linkedClient = decisionCase.client_id ? clients?.find(c => c.id === decisionCase.client_id) : null;
      const willNotifyTelegram = !!(linkedClient && linkedClient.telegram_chat_id);

      await addSession({
        case_id: decisionCase.id,
        session_date: selectedDate,
        status: decisionStatus,
        adjournment_reason: adjournmentReason || null,
        ruling_text: rulingText || null,
        notes: adjournmentReason || null,
      }, updates);

      // Auto-log session expense to client's financial account if entered
      const expAmount = parseFloat(sessionExpense);
      if (expAmount > 0 && decisionCase.client_id) {
        await addTransaction({
          client_id: decisionCase.client_id,
          case_id: decisionCase.id,
          type: 'expense',
          amount: expAmount,
          description: sessionExpenseNote.trim() || `مصروفات جلسة ${selectedDate}`,
          date: selectedDate,
        }).catch(e => console.log('Auto-add session expense notice:', e));
      }

      setDecisionCase(null);
      setAdjournmentReason('');
      setNextDate('');
      setRulingText('');
      setSessionExpense('');
      setSessionExpenseNote('');

      if (willNotifyTelegram) {
        alert(`✅ تم حفظ القرار وتحديث الأجندة بنجاح، وتم إرسال إشعار فوري للموكل (${linkedClient.name}) عبر التليجرام 📱`);
      }
    } catch (err) {
      alert('خطأ أثناء حفظ القرار: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Top Header & Actions (Screen Only - Hidden in Print) */}
      <div className="agenda-top-header no-print">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#c59828', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#8a5d1b' }}>
              رول الجلسات والمرافعة اليومية
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '900', margin: 0, color: '#37040a', letterSpacing: '-0.3px' }}>
            أجندة ورول الجلسات القضائية
          </h1>
        </div>

        {/* Header Actions */}
        <div className="agenda-header-actions">
          {/* Mobile View Toggle (Card vs Table) */}
          {/* <div className="agenda-mobile-toggle-wrapper hide-desktop" style={{ display: 'none' }}>
            <div style={{
              display: 'flex',
              background: 'var(--bg-card-subtle)',
              padding: '0.2rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: mobileViewMode === 'card' ? 'var(--primary-800)' : 'transparent',
                  color: mobileViewMode === 'card' ? '#ffffff' : 'var(--text-muted)'
                }}
                onClick={() => setMobileViewMode('card')}
              >
                كروت
              </button>
              <button
                type="button"
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: mobileViewMode === 'table' ? 'var(--primary-800)' : 'transparent',
                  color: mobileViewMode === 'table' ? '#ffffff' : 'var(--text-muted)'
                }}
                onClick={() => setMobileViewMode('table')}
              >
                جدول
              </button>
            </div>
          </div> */}

          {/* Print Court Roll Button */}
          <button
            type="button"
            className="agenda-print-btn"
            onClick={handlePrint}
          >
            <Printer size={16} color="#37040a" />
            <span>طباعة رول الجلسة</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Card (Screen Only - Hidden in Print) */}
      <div className="agenda-filter-card no-print">
        {/* Right Side (RTL Start): Date selection group */}
        <div className="agenda-date-group">
          <div className="agenda-date-label">
            <CalendarIcon size={17} color="#37040a" />
            <span>تاريخ الجلسة:</span>
          </div>

          <input
            type="date"
            className="agenda-date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <button
            type="button"
            className="agenda-today-btn"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            اليوم
          </button>
        </div>

        {/* Left Side (RTL End): Court filter group */}
        <div className="agenda-court-group">
          <Filter size={16} color="#6b4c51" style={{ flexShrink: 0 }} />
          <select
            className="agenda-court-select"
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
          >
            <option value="ALL">جميع المحاكم والدوائر</option>
            <option value="دمياط الابتدائية">دمياط الابتدائية</option>
            <option value="فارسكور">فارسكور</option>
            <option value="كفر سعد">كفر سعد</option>
            <option value="رأس البر">رأس البر</option>
            <option value="استئناف المنصورة (مأمورية دمياط)">استئناف مأمورية دمياط</option>
            <option value="مجلس الدولة">مجلس الدولة بدمياط</option>
          </select>
        </div>
      </div>

      {/* Official Printable Court Document Container with Outer Border Frame */}
      <div className="printable-document-frame">
        {/* Unified Law Firm Letterhead */}
        <LawFirmPrintHeader />

        {/* Court Roll Document Header & Metadata */}
        <div className="court-roll-doc-header" style={{
          textAlign: 'center',
          padding: '0.9rem 1.25rem',
          borderBottom: '2.5px solid #37040a',
          marginBottom: '1rem',
          background: 'transparent',
        }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: '900', color: '#37040a', margin: '0 0 0.35rem 0', fontFamily: "'Alexandria', 'Cairo', sans-serif" }}>
            رول الجلسات اليومية
          </h2>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#6d0f1b' }}>
            جلسات يوم: {new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6b4c51', marginTop: '0.25rem', fontWeight: '700' }}>
            {courtFilter !== 'ALL' ? `الدائرة القضائية: ${courtFilter}` : 'كافة الدوائر والمحاكم القضائية'}
            {officeProfile?.office_name ? ` | ${officeProfile.office_name}` : ''}
          </div>

          {/* Roll Metadata Line */}
          <div className="court-roll-metadata-row" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2.5rem',
            marginTop: '0.75rem',
            paddingTop: '0.55rem',
            borderTop: '1px dashed #e5c4c8',
            fontSize: '0.84rem',
            color: '#4f0810',
            flexWrap: 'wrap',
          }}>
            <span>إجمالي الجلسات: <strong style={{ color: '#37040a', background: '#ffffff', padding: '0.15rem 0.5rem' }}>{filteredCases.length} قضية</strong></span>
            <span>المحامي الحاضر: <strong style={{ color: '#37040a' }}>{officeProfile?.lawyer_name ? `أ/ ${officeProfile.lawyer_name}` : '.....................'}</strong></span>
            <span>القاعة / الرول: <strong style={{ color: '#37040a' }}>.....................</strong></span>
          </div>
        </div>

        {/* Empty State */}
        {filteredCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <CalendarIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لا توجد جلسات مجدولة لهذا اليوم</h3>
            <p style={{ fontSize: '0.9rem' }}>يمكنك اختيار تاريخ آخر من الأعلى أو إضافة جلسة جديدة لهذا التاريخ.</p>
          </div>
        ) : (
          <>
            {/* MOBILE ONLY (< 640px): Compact Cards View for Court Sessions */}
            <div className={`agenda-mobile-cards-view no-print ${mobileViewMode === 'table' ? 'agenda-force-hide' : ''}`}>
              {filteredCases.map((c, index) => {
                const isExpanded = expandedCaseId === c.id;
                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      padding: '1rem',
                      borderRadius: '14px',
                      border: '1.5px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Top Row: Case Number & Type */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--primary-100)',
                          color: 'var(--primary-800)',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--primary-800)' }}>
                            {c.case_number}
                          </strong>
                          <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}> / {c.case_year}</span>
                        </div>
                      </div>
                      <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--primary-700)', border: '1px solid var(--border-color)' }}>
                        {CASE_TYPES[c.case_type] || c.case_type}
                      </span>
                    </div>

                    {/* Court & Room */}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: '700' }}>🏛️ {c.court_name}</span>
                      {c.court_room && <span style={{ color: 'var(--text-muted)' }}>— دائرة / قاعة: {c.court_room}</span>}
                    </div>

                    {/* Parties (Client & Opponent) */}
                    <div style={{
                      padding: '0.65rem 0.75rem',
                      background: 'var(--bg-card-subtle)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.84rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem'
                    }}>
                      <div><strong style={{ color: 'var(--primary-700)' }}>المدعي:</strong> {c.plaintiff_name}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>المدعى عليه:</strong> {c.defendant_name}</div>
                    </div>

                    {/* Subject & Previous Status */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <strong>موضوع الدعوى:</strong> {c.case_title || '—'}
                    </div>

                    {c.notes && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--status-adjourned)', background: 'var(--status-adjourned-bg)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                        <strong>الموقف السابق:</strong> {c.notes}
                      </div>
                    )}

                    {/* Primary Touch-Friendly Decision Button */}
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.2rem'
                      }}
                      onClick={() => {
                        const validStatus = SESSION_DECISIONS[c.status] ? c.status : 'adjourned';
                        setDecisionCase(c);
                        setDecisionStatus(validStatus);
                        setAdjournmentReason(c.notes || '');
                        setNextDate(c.next_session_date ? c.next_session_date.split('T')[0] : '');
                        setRulingText(c.ruling_text || '');
                        setSessionExpense('');
                        setSessionExpenseNote('');
                      }}
                    >
                      <Clock size={16} />
                      <span>تسجيل قرار الجلسة / التأجيل</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP & TABLET TABLE (Also shown on mobile if Table View toggled, and ALWAYS in print) */}
            <div className={`card printable-card agenda-desktop-table-view ${mobileViewMode === 'card' ? 'agenda-hide-on-mobile-screen' : ''}`} style={{ padding: '0', overflow: 'hidden', border: 'none', background: 'transparent' }}>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table print-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', direction: 'rtl' }}>
                  <thead>
                    <tr style={{ background: '#37040a', color: '#ffffff' }}>
                      <th style={{ width: '4%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.2rem' }}>م</th>
                      <th style={{ width: '13%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>رقم الدعوى والسنة</th>
                      <th style={{ width: '14%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>المحكمة والقاعة</th>
                      <th style={{ width: '14%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>المدعي (الموكل/الخصم)</th>
                      <th style={{ width: '14%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>المدعى عليه</th>
                      <th style={{ width: '15%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>موضوع الدعوى</th>
                      <th style={{ width: '10%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>الموقف السابق</th>
                      <th className="no-print" style={{ textAlign: 'center', width: '16%', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>تسجيل القرار</th>
                      <th className="only-print print-decision-col" style={{ width: '16%', textAlign: 'center', backgroundColor: '#37040a', color: '#ffffff', padding: '0.65rem 0.3rem' }}>قرار الجلسة والتأجيل (يدون باليد)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((c, index) => {
                      return (
                        <tr key={c.id} style={{ background: index % 2 === 1 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '0.82rem' }}>
                            {index + 1}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#37040a' }}>{c.case_number}</strong> / <span style={{ fontWeight: '700' }}>{c.case_year}</span>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.1rem', fontWeight: '600' }}>{CASE_TYPES[c.case_type] || c.case_type}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.84rem' }}>{c.court_name}</div>
                            {c.court_room && <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.1rem' }}>قاعة / دائرة: {c.court_room}</div>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.84rem' }}>{c.plaintiff_name}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.84rem' }}>{c.defendant_name}</div>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.35, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{c.case_title || '—'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: '600', color: '#475569', fontSize: '0.8rem' }}>
                              {c.notes || '—'}
                            </div>
                          </td>
                          {/* Screen Action Button */}
                          <td className="no-print" style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', minHeight: '36px' }}
                              onClick={() => {
                                const validStatus = SESSION_DECISIONS[c.status] ? c.status : 'adjourned';
                                setDecisionCase(c);
                                setDecisionStatus(validStatus);
                                setAdjournmentReason(c.notes || '');
                                setNextDate(c.next_session_date ? c.next_session_date.split('T')[0] : '');
                                setRulingText(c.ruling_text || '');
                                setSessionExpense('');
                                setSessionExpenseNote('');
                              }}
                            >
                              تسجيل القرار
                            </button>
                          </td>
                          {/* Print Only Space for Handwritten Notes */}
                          <td className="only-print print-decision-col" style={{ verticalAlign: 'top', height: '42px', padding: '3px' }}>
                            <div className="print-handwritten-space"></div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Printable Court Official Footer — Unified with ClientsPage */}
        <div className="printable-court-footer">
          {/* Signature Section */}
          <div className="court-signatures-row">
            <div className="court-signature-col">
              <div className="court-signature-title">المحامي الحاضر بالجلسة</div>
              <div className="court-signature-space"></div>
              <div className="court-signature-dots">..........................................</div>
              <div className="court-signature-name">
                أ/ {officeProfile?.lawyer_name || user?.user_metadata?.full_name || 'المحامي المسؤول'}
              </div>
              <div className="court-signature-role">محامٍ بالنقض والاستئناف</div>
            </div>

            <div className="court-signature-col">
              <div className="court-signature-title">ختم واعتماد المكتب</div>
              <div className="court-signature-space"></div>
              <div className="court-signature-dots">..........................................</div>
              <div className="court-signature-name">
                {officeProfile?.office_name || 'مكتب المحاماة والاستشارات القانونية'}
              </div>
              <div className="court-signature-role">
                {officeProfile?.lawyer_title || 'محامون ومستشارون قانونيون'}
              </div>
            </div>
          </div>

          {/* Bottom divider: معًا نحو تحقيق العدالة */}
          <div className="court-footer-divider">
            <span className="court-footer-divider-line"></span>
            <span className="court-footer-divider-text">معًا نحو تحقيق العدالة</span>
            <Scale size={15} color="#37040a" />
            <span className="court-footer-divider-line"></span>
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

                {/* Optional Session Expenses on Client */}
                {decisionCase?.client_id && (
                  <div style={{
                    padding: '0.75rem 0.9rem',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    marginTop: '0.4rem'
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>💰</span>
                      <span>قيد مصاريف بالجلسة على حساب الموكل (اختياري)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.5rem' }}>
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
                        placeholder="بيان المصروف (أمانة خبير، رسم إيداع، انتقالات...)"
                        style={{ fontSize: '0.82rem' }}
                        value={sessionExpenseNote}
                        onChange={(e) => setSessionExpenseNote(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Telegram Client Notification Status Notice */}
                {(() => {
                  const client = decisionCase?.client_id ? clients?.find(c => c.id === decisionCase.client_id) : null;
                  if (!client) return null;
                  if (client.telegram_chat_id) {
                    return (
                      <div style={{
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.75rem'
                      }}>
                        <span style={{ fontSize: '1.05rem' }}>📱</span>
                        <span>
                          الموكل <b>{client.name}</b> مربوط بالتليجرام — سيتم إرسال إشعار فوري له بنص القرار وتاريخ الجلسة عند الحفظ.
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.95rem' }}>ℹ️</span>
                      <span>
                        الموكل <b>{client.name}</b> غير مربوط بالتليجرام (يمكنك ربطه من صفحة الموكلين لإرسال إشعارات فورية).
                      </span>
                    </div>
                  );
                })()}
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
