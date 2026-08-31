import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Printer, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Gavel, 
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, CASE_STATUSES, SESSION_DECISIONS } from '../lib/supabase';

export default function AgendaPage({ onOpenQuickAction }) {
  const { cases, addSession } = useData();
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
    <div className="page-wrapper">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>أجندة ورول الجلسات القضائية</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            متابعة الجلسات اليومية أمام الدوائر والمحاكم وتسجيل القرارات الفورية.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }} className="no-print">
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={18} />
            <span>طباعة رول الجلسة</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenQuickAction}>
            <Plus size={18} />
            <span>إضافة جلسة / دعوى</span>
          </button>
        </div>
      </div>

      {/* Date & Court Filter Bar (Hidden in Print) */}
      <div className="card no-print" style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} color="var(--primary-600)" />
              <label style={{ fontWeight: '700', fontSize: '0.95rem' }}>تاريخ الجلسة:</label>
            </div>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '180px', padding: '0.5rem 0.8rem' }}
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
            />
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              اليوم
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Filter size={18} color="var(--text-subtle)" />
            <select 
              className="form-select" 
              style={{ width: '220px', padding: '0.5rem 0.8rem' }}
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

      {/* Printable Court Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem 0', borderBottom: '2px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
          رول جلسات يوم: {new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          مكتب المحاماة — الأجندة القضائية الإلكترونية {courtFilter !== 'ALL' ? `(تصفية: ${courtFilter})` : ''}
        </p>
      </div>

      {/* Court Roll Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <CalendarIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لا توجد جلسات مجدولة لهذا اليوم</h3>
            <p style={{ fontSize: '0.9rem' }}>يمكنك اختيار تاريخ آخر من الأعلى أو إضافة جلسة جديدة لهذا التاريخ.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>م</th>
                  <th>رقم الدعوى والسنة</th>
                  <th>المحكمة والقاعة</th>
                  <th>المدعي (الموكل/الخصم)</th>
                  <th>المدعى عليه</th>
                  <th>موضوع الدعوى</th>
                  <th>القرار / الموقف</th>
                  <th className="no-print" style={{ textAlign: 'center' }}>تسجيل القرار</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c, index) => {
                  const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: '700', textAlign: 'center' }}>{index + 1}</td>
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
                        <div style={{ maxWidth: '200px' }}>{c.case_title || '—'}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                        {c.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {c.notes}
                          </div>
                        )}
                      </td>
                      <td className="no-print" style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
                          onClick={() => {
                            setDecisionCase(c);
                            setDecisionStatus(c.status);
                            setAdjournmentReason(c.notes || '');
                          }}
                        >
                          <Gavel size={14} />
                          <span>إثبات القرار</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
