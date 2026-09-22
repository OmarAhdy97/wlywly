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

import SessionDecisionModal from '../components/common/SessionDecisionModal';

export default function AgendaPage() {
  const { cases, clients, adminTasks, appeals, agendaEvents, officeProfile } = useData();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [courtFilter, setCourtFilter] = useState('ALL');
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  // Decision Modal State
  const [decisionCase, setDecisionCase] = useState(null);

  // Filter cases matching selected session date (Actual court sessions only)
  const filteredCases = cases.filter(c => {
    const matchesDate = c.next_session_date && c.next_session_date.startsWith(selectedDate);
    const matchesCourt = courtFilter === 'ALL' || (c.court_name && c.court_name.includes(courtFilter));
    return matchesDate && matchesCourt;
  });

  // Additional follow-up events for selected date (Appeals & Administrative Tasks)
  const dayAppeals = (appeals || []).filter(a => a.follow_up_date === selectedDate);
  const dayAdminTasks = (adminTasks || []).filter(t => t.execution_date === selectedDate);

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
                      onClick={() => setDecisionCase(c)}
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
                              onClick={() => setDecisionCase(c)}
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

      {/* Companion Section: Follow-ups for Today (Appeals & Admin Tasks) - Hidden in Print */}
      {(dayAppeals.length > 0 || dayAdminTasks.length > 0) && (
        <div className="card no-print" style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📌</span>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>
              متابعات وأعمال أخرى في هذا اليوم ({selectedDate})
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {/* Appeal Follow-ups */}
            {dayAppeals.map((app) => {
              const relCase = cases.find(c => c.id === app.case_id);
              return (
                <div key={app.id} style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(37, 99, 235, 0.06)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}>
                  <Scale size={18} color="#1d4ed8" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '800', color: '#1e40af', fontSize: '0.88rem' }}>
                      متابعة استئناف — دعوى {relCase ? `${relCase.case_number}/${relCase.case_year}` : 'محددة'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.2rem' }}>
                      {app.judgment_text ? `منطوق الحكم: ${app.judgment_text.slice(0, 60)}...` : 'ميعاد متابعة قيد الاستئناف'}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Admin Tasks */}
            {dayAdminTasks.map((tsk) => (
              <div key={tsk.id} style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <Briefcase size={18} color="#b45309" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '800', color: '#92400e', fontSize: '0.88rem' }}>
                    {tsk.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#451a03', marginTop: '0.2rem' }}>
                    {tsk.requirements || tsk.notes || tsk.location || 'إجراء إداري مطلوب اليوم'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Recording Modal */}
      <SessionDecisionModal
        isOpen={!!decisionCase}
        caseItem={decisionCase}
        currentSessionDate={selectedDate}
        onClose={() => setDecisionCase(null)}
      />
    </div>
  );
}
