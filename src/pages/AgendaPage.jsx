import React, { useState, useEffect } from 'react';
import { Printer, Gavel, Scale, ChevronRight, ChevronLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CASE_TYPES } from '../lib/supabase';
import LawFirmPrintHeader from '../components/common/LawFirmPrintHeader';
import { printWithTitle, DEFAULT_APP_TITLE } from '../lib/printUtils';

import SessionDecisionModal from '../components/common/SessionDecisionModal';
import Select from '../components/common/Select';
import DateInput from '../components/common/DateInput';

const todayIso = () => new Date().toISOString().split('T')[0];

export default function AgendaPage() {
  const data = useData() || {};
  const { cases = [], clients = [], adminTasks = [], appeals = [], agendaEvents = [], officeProfile = {} } = data;
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [courtFilter, setCourtFilter] = useState('ALL');

  // Available Courts from existing cases
  const availableCourts = React.useMemo(() => {
    const set = new Set();
    (cases || []).forEach(c => {
      if (c.court_name && c.court_name.trim()) set.add(c.court_name.trim());
    });
    return Array.from(set);
  }, [cases]);

  const [decisionCase, setDecisionCase] = useState(null);

  const shiftDay = (delta) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta);
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
  };

  // Filter cases matching selected session date (Actual court sessions only)
  const filteredCases = (cases || []).filter(c => {
    if (c.is_archived) return false;
    const sessionDate = c.next_session_date ? c.next_session_date.split('T')[0] : null;
    const matchesDate = sessionDate === selectedDate;
    const matchesCourt = courtFilter === 'ALL' || (c.court_name && c.court_name.includes(courtFilter));
    return matchesDate && matchesCourt;
  });

  // Safe localized date string (without UTC shift)
  const formattedSelectedDate = React.useMemo(() => {
    try {
      if (!selectedDate) return '';
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return selectedDate;
    }
  }, [selectedDate]);

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
      <div className="page-head no-print">
        <div>
          <h1>رول الجلسات</h1>
          <p className="page-sub">{formattedSelectedDate}</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> طباعة الرول
          </button>
        </div>
      </div>

      <div className="page-toolbar no-print">
        <div className="date-stepper">
          <button type="button" className="icon-btn" onClick={() => shiftDay(-1)} aria-label="اليوم السابق">
            <ChevronRight size={18} />
          </button>
          <DateInput className="form-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} aria-label="تاريخ الجلسة" />
          <button type="button" className="icon-btn" onClick={() => shiftDay(1)} aria-label="اليوم التالي">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSelectedDate(todayIso())}>اليوم</button>
        </div>
        <Select className="form-select toolbar-select" value={courtFilter} onChange={(e) => setCourtFilter(e.target.value)} aria-label="المحكمة">
          <option value="ALL">كل المحاكم والدوائر</option>
          {availableCourts.map((courtName) => (
            <option key={courtName} value={courtName}>{courtName}</option>
          ))}
        </Select>
      </div>

      {/* On screen: the same row list as the cases page */}
      <div className="no-print">
        {filteredCases.length === 0 ? (
          <div className="card empty-block">
            <h3>لا توجد جلسات في هذا اليوم</h3>
            <p>اختر تاريخاً آخر من الأعلى.</p>
          </div>
        ) : (
          <div className="card row-list">
            {filteredCases.map((c, index) => {
              const client = clients.find((k) => k.id === c.client_id);
              return (
                <article key={c.id} className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-body list-row-person">
                      <span className="roll-no" aria-label={`رقم ${index + 1} في الرول`}>{index + 1}</span>
                      <div className="list-row-person-text">
                        <div className="list-row-top">
                          <h3 className="row-title">
                            <span className="row-key">{c.case_number}/{c.case_year}</span>
                            <span className="row-title-text" title={c.case_title || ''}>{c.case_title || CASE_TYPES[c.case_type] || 'قضية'}</span>
                          </h3>
                        </div>
                        <p className="list-row-sub">
                          {[CASE_TYPES[c.case_type] || c.case_type, c.court_name, c.court_room && `دائرة ${c.court_room}`].filter(Boolean).join(' · ')}
                        </p>
                        <p className="row-parties">
                          <span className="row-party"><small>المدعي</small>{c.plaintiff_name || '—'}</span>
                          <span className="row-vs">ضد</span>
                          <span className="row-party"><small>المدعى عليه</small>{c.defendant_name || '—'}</span>
                        </p>
                      </div>
                    </div>

                    <dl className="list-row-facts">
                      <div>
                        <dt>الموقف السابق</dt>
                        <dd className="roll-prev" title={c.notes || ''}>{c.notes || <span className="cell-sub">—</span>}</dd>
                      </div>
                      <div>
                        <dt>الموكل</dt>
                        <dd className="row-owner">
                          {client ? (<>{client.name}</>) : <span className="cell-sub">غير مرتبط</span>}
                        </dd>
                      </div>
                    </dl>

                    <div className="list-row-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDecisionCase(c)}>
                        <Gavel size={14} /> تسجيل القرار
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* The official court roll: shown only when printing */}
      <div className="printable-document-frame only-print">
        <LawFirmPrintHeader />

        <div className="court-roll-doc-header">
          <h2>رول الجلسات اليومية</h2>
          <div className="roll-date">جلسات يوم: {formattedSelectedDate}</div>
          <div className="roll-court">
            {courtFilter !== 'ALL' ? `الدائرة القضائية: ${courtFilter}` : 'كافة الدوائر والمحاكم القضائية'}
            {officeProfile?.office_name ? ` | ${officeProfile.office_name}` : ''}
          </div>
          <div className="court-roll-metadata-row">
            <span>إجمالي الجلسات: <strong>{filteredCases.length} قضية</strong></span>
            <span>المحامي الحاضر: <strong>{officeProfile?.lawyer_name ? `أ/ ${officeProfile.lawyer_name}` : '.....................'}</strong></span>
            <span>القاعة / الرول: <strong>.....................</strong></span>
          </div>
        </div>

        <div className="card printable-card roll-table-wrap">
          <div className="table-container">
            <table className="data-table print-table roll-table">
              <thead>
                <tr>
                  <th className="rc-no">م</th>
                  <th className="rc-case">رقم الدعوى والسنة</th>
                  <th className="rc-court">المحكمة والقاعة</th>
                  <th className="rc-party">المدعي</th>
                  <th className="rc-party">المدعى عليه</th>
                  <th className="rc-subject">موضوع الدعوى</th>
                  <th className="rc-prev">الموقف السابق</th>
                  <th className="print-decision-col rc-act">قرار الجلسة والتأجيل (يدون باليد)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c, index) => (
                  <tr key={c.id}>
                    <td className="rc-center rc-muted">{index + 1}</td>
                    <td className="rc-center">
                      <strong>{c.case_number}</strong> / <span>{c.case_year}</span>
                      <div className="rc-small">{CASE_TYPES[c.case_type] || c.case_type}</div>
                    </td>
                    <td>
                      <div className="rc-strong">{c.court_name}</div>
                      {c.court_room && <div className="rc-small">دائرة {c.court_room}</div>}
                    </td>
                    <td><div className="rc-strong">{c.plaintiff_name}</div></td>
                    <td><div className="rc-strong">{c.defendant_name}</div></td>
                    <td className="rc-wrap">{c.case_title || '—'}</td>
                    <td className="rc-center rc-muted">{c.notes || '—'}</td>
                    <td className="print-decision-col">
                      <div className="print-handwritten-space"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="printable-court-footer">
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

          <div className="court-footer-divider">
            <span className="court-footer-divider-line"></span>
            <span className="court-footer-divider-text">معًا نحو تحقيق العدالة</span>
            <Scale size={15} color="#111827" />
            <span className="court-footer-divider-line"></span>
          </div>
        </div>
      </div>

      {(dayAppeals.length > 0 || dayAdminTasks.length > 0) && (
        <div className="card no-print day-extra">
          <h3>متابعات وأعمال أخرى في هذا اليوم</h3>
          <ul className="mini-list">
            {dayAppeals.map((app) => {
              const relCase = cases.find((c) => c.id === app.case_id);
              return (
                <li key={app.id}>
                  <div>
                    <strong>متابعة استئناف — دعوى {relCase ? `${relCase.case_number}/${relCase.case_year}` : 'محددة'}</strong>
                    <span className="cell-sub">
                      {app.judgment_text ? `منطوق الحكم: ${app.judgment_text.slice(0, 80)}${app.judgment_text.length > 80 ? '…' : ''}` : 'ميعاد متابعة قيد الاستئناف'}
                    </span>
                  </div>
                  <span className="badge">استئناف</span>
                </li>
              );
            })}
            {dayAdminTasks.map((tsk) => (
              <li key={tsk.id}>
                <div>
                  <strong>{tsk.title}</strong>
                  <span className="cell-sub">{tsk.requirements || tsk.notes || tsk.location || 'إجراء إداري مطلوب'}</span>
                </div>
                <span className="badge">إداري</span>
              </li>
            ))}
          </ul>
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
