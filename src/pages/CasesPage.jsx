import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Archive,
  Calendar,
  User,
  UserCheck,
  FileText,
  X,
  Check,
  Clock,
  Gavel,
  AlertCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, COURT_LEVELS, CASE_STATUSES, SESSION_DECISIONS, USER_ROLES } from '../lib/supabase';

export default function CasesPage({ onOpenQuickAction }) {
  const { cases, clients, sessions, team, addSession, updateCase, deleteCase } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Case for Details Modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);

  // Decision Modal State
  const [decisionCase, setDecisionCase] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('adjourned');
  const [decisionSessionDate, setDecisionSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjournmentReason, setAdjournmentReason] = useState('');
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [rulingText, setRulingText] = useState('');
  const [assignedLawyerId, setAssignedLawyerId] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  // Active (non-archived) cases
  const activeCases = cases.filter(c => !c.is_archived);

  // Filtered List
  const filteredCases = activeCases.filter(c => {
    const matchesSearch =
      (c.case_number && c.case_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.case_title && c.case_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.court_name && c.court_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      typeFilter === 'ALL' ||
      c.case_type === typeFilter ||
      (CASE_TYPES[typeFilter] && (c.case_type === CASE_TYPES[typeFilter] || c.case_type?.includes(CASE_TYPES[typeFilter]))) ||
      (c.case_type && CASE_TYPES[c.case_type] === CASE_TYPES[typeFilter]);
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleArchiveCase = async (id) => {
    if (window.confirm('هل أنت متأكد من رغبتك في نقل هذه القضية إلى الأرشيف؟')) {
      await updateCase(id, { is_archived: true, archive_date: new Date().toISOString() });
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const handleDeleteCase = async (id) => {
    if (window.confirm('تحذير: سيتم حذف القضية وجميع بياناتها نهائياً! هل تريد المتابعة؟')) {
      await deleteCase(id);
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const handleOpenDecision = (c) => {
    setDecisionCase(c);
    setDecisionStatus('adjourned');
    setDecisionSessionDate(c.next_session_date ? c.next_session_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setAdjournmentReason('');
    setNextSessionDate('');
    setRulingText('');
    setAssignedLawyerId(c.next_steps || '');
  };

  const handleRecordDecision = async (e) => {
    e.preventDefault();
    if (!decisionCase) return;
    setIsSavingDecision(true);
    try {
      const updates = {
        status: decisionStatus,
        next_session_date: decisionStatus === 'adjourned' ? (nextSessionDate || null) : null,
        ruling_text: rulingText || null,
        notes: adjournmentReason || decisionCase.notes || null,
        next_steps: assignedLawyerId || null,
      };

      await addSession({
        case_id: decisionCase.id,
        session_date: decisionSessionDate,
        session_time: '09:00',
        status: decisionStatus,
        adjournment_reason: adjournmentReason || null,
        ruling_text: rulingText || null,
        notes: adjournmentReason || null,
      }, updates);

      if (selectedCase && selectedCase.id === decisionCase.id) {
        setSelectedCase({ ...selectedCase, ...updates });
      }

      setDecisionCase(null);
      setAdjournmentReason('');
      setNextSessionDate('');
      setRulingText('');
      setAssignedLawyerId('');
    } catch (err) {
      alert('خطأ أثناء تسجيل القرار: ' + err.message);
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCase) return;
    try {
      await updateCase(editingCase.id, {
        case_number: editingCase.case_number,
        case_year: parseInt(editingCase.case_year, 10),
        case_type: editingCase.case_type,
        court_level: editingCase.court_level,
        court_name: editingCase.court_name,
        court_room: editingCase.court_room || null,
        case_title: editingCase.case_title,
        plaintiff_name: editingCase.plaintiff_name,
        defendant_name: editingCase.defendant_name,
        status: editingCase.status,
        next_steps: editingCase.next_steps || null,
        next_session_date: editingCase.next_session_date || null,
        notes: editingCase.notes || null,
      });
      setEditingCase(null);
    } catch (err) {
      alert('خطأ أثناء تعديل القضية: ' + err.message);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>إدارة القضايا والدعاوى المتداولة</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            سجل كامل بجميع الدعاوى، الدوائر القضائية، الخصوم، ومواعيد الجلسات.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenQuickAction}>
          <Plus size={18} />
          <span>إضافة دعوى جديدة</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>

          <div className="header-search" style={{ width: '100%' }}>
            <Search size={18} style={{ color: 'var(--text-subtle)' }} />
            <input
              type="text"
              placeholder="بحث برقم القضية، الموكل، أو الخصم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)' }}>النوع:</span>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">جميع الأنواع</option>
              {Object.entries(CASE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)' }}>الحالة:</span>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">جميع الحالات</option>
              {Object.entries(CASE_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Cases Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <Briefcase size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لم يتم العثور على قضايا مطابقة</h3>
            <p style={{ fontSize: '0.9rem' }}>جرب تعديل خيارات البحث أو قم بإضافة قضية جديدة.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الدعوى والسنة</th>
                  <th>موضوع الدعوى</th>
                  <th>المحكمة / الدائرة</th>
                  <th>المدعي والمدعى عليه</th>
                  <th>الجلسة القادمة</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{c.case_number}</strong> / {c.case_year}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{CASE_TYPES[c.case_type] || c.case_type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', maxWidth: '220px' }}>{c.case_title || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{COURT_LEVELS[c.court_level] || c.court_level}</div>
                      </td>
                      <td>
                        <div>{c.court_name}</div>
                        {c.court_room && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>الدائرة: {c.court_room}</div>}
                      </td>
                      <td>
                        <div><strong>المدعي:</strong> {c.plaintiff_name}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}><strong>المدعى عليه:</strong> {c.defendant_name}</div>
                      </td>
                      <td>
                        {c.next_session_date ? (
                          <div style={{ fontWeight: '600', color: 'var(--primary-600)' }}>
                            {new Date(c.next_session_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>غير محدد</span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-icon"
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            title="عرض التفاصيل وتاريخ القضية"
                            onClick={() => setSelectedCase(c)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-secondary btn-icon"
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            title="تسجيل قرار / تأجيل"
                            onClick={() => handleOpenDecision(c)}
                          >
                            <Clock size={15} color="var(--primary-600)" />
                          </button>
                          <button
                            className="btn btn-secondary btn-icon"
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            title="تعديل القضية"
                            onClick={() => setEditingCase({ ...c })}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="btn btn-secondary btn-icon"
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            title="نقل للأرشيف"
                            onClick={() => handleArchiveCase(c.id)}
                          >
                            <Archive size={15} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon"
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            title="حذف"
                            onClick={() => handleDeleteCase(c.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Details Modal */}
      {selectedCase && (() => {
        const current = cases.find(c => c.id === selectedCase.id) || selectedCase;
        const currentStatus = CASE_STATUSES[current.status] || CASE_STATUSES.active;
        const caseSessions = (sessions || [])
          .filter(s => s.case_id === current.id)
          .sort((a, b) => new Date(b.session_date || b.created_at) - new Date(a.session_date || a.created_at));

        return (
          <div className="modal-backdrop" onClick={() => setSelectedCase(null)}>
            <div className="modal-dialog" style={{ maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <Briefcase size={20} color="var(--primary-600)" style={{ flexShrink: 0 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', lineHeight: '1.4', margin: 0, wordBreak: 'break-word' }}>
                    تفاصيل وسجل الدعوى رقم {current.case_number}/{current.case_year}
                  </h3>
                </div>
                <button className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }} onClick={() => setSelectedCase(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Case Info Header Card */}
                <div style={{ padding: '1rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
                    <h4 style={{ color: 'var(--primary-800)', fontSize: '1.05rem', fontWeight: '700', wordBreak: 'break-word', flex: 1, minWidth: '180px' }}>
                      {current.case_title || `دعوى رقم ${current.case_number}`}
                    </h4>
                    <span className="badge" style={{ background: currentStatus.bg, color: currentStatus.color, fontSize: '0.82rem', padding: '0.3rem 0.7rem' }}>
                      الحالة: {currentStatus.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                    <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '0.78rem' }}>
                      نوع الدعوى: {CASE_TYPES[current.case_type] || current.case_type || '—'}
                    </span>
                    <span className="badge" style={{ background: 'var(--status-judgment-bg)', color: 'var(--status-judgment)', fontSize: '0.78rem' }}>
                      درجة التقاضي: {COURT_LEVELS[current.court_level] || current.court_level || '—'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المحكمة :</span>
                      <div style={{ fontWeight: '600', wordBreak: 'break-word' }}>{current.court_name || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>الدائرة :</span>
                      <div style={{ fontWeight: '600' }}>{current.court_room || 'غير محددة'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المدعي:</span>
                      <div style={{ fontWeight: '600', wordBreak: 'break-word' }}>{current.plaintiff_name || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المدعى عليه:</span>
                      <div style={{ fontWeight: '600', wordBreak: 'break-word' }}>{current.defendant_name || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المحامي المكلف:</span>
                      <div style={{ fontWeight: '600', color: current.next_steps ? 'var(--primary-700)' : 'var(--text-muted)' }}>
                        {(() => {
                          const assigned = team.find(m => m.id === current.next_steps || m.id === (current.next_steps || '').replace('assigned:', ''));
                          return assigned ? `الأستاذ / ${assigned.name}` : 'غير مسند';
                        })()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تاريخ الجلسة القادمة:</span>
                      <div style={{ fontWeight: '700', color: current.next_session_date ? 'var(--primary-600)' : 'var(--text-subtle)' }}>
                        {current.next_session_date ? new Date(current.next_session_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'لا توجد جلسة محددة'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ruling text if any */}
                {current.ruling_text && (
                  <div style={{ padding: '1rem', background: 'var(--status-judgment-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <Gavel size={18} color="var(--status-judgment)" />
                      <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--status-judgment)' }}>منطوق الحكم / القرار الصادر:</span>
                    </div>
                    <p style={{ fontSize: '0.92rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{current.ruling_text}</p>
                  </div>
                )}

                {/* Notes */}
                {current.notes && (
                  <div style={{ padding: '0.9rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>ملاحظات ومستندات مطلوبة:</span>
                    <p style={{ marginTop: '0.2rem', fontSize: '0.9rem' }}>{current.notes}</p>
                  </div>
                )}

                {/* Case Sessions & Postponement History */}
                <div style={{ marginTop: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Clock size={18} color="var(--primary-600)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--primary-800)' }}>
                        سجل الجلسات والتأجيلات
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '0.15rem 0.55rem', borderRadius: '12px', fontWeight: '700' }}>
                        {caseSessions.length} جلسات
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
                      onClick={() => handleOpenDecision(current)}
                    >
                      <Plus size={15} />
                      <span>تسجيل قرار / تأجيل</span>
                    </button>
                  </div>

                  {caseSessions.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                      <Calendar size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                      <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>لا يوجد سجل جلسات مسجل لهذه القضية حتى الآن</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                        عند تسجيل قرار الجلسة (تأجيل أو حكم)، سيتم حفظه تلقائيًا في هذا السجل الزمني.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {caseSessions.map((sess, idx) => {
                        const sessStatus = CASE_STATUSES[sess.status] || SESSION_DECISIONS[sess.status] || { label: sess.status, bg: 'var(--primary-100)', color: 'var(--primary-700)' };
                        return (
                          <div
                            key={sess.id || idx}
                            style={{
                              padding: '1rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRight: `4px solid ${sessStatus.color || 'var(--primary-600)'}`,
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} color="var(--primary-600)" />
                                <strong style={{ fontSize: '0.95rem' }}>
                                  جلسة: {sess.session_date ? new Date(sess.session_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                </strong>
                              </div>
                              <span className="badge" style={{ background: sessStatus.bg, color: sessStatus.color, fontWeight: '700' }}>
                                {sessStatus.label}
                              </span>
                            </div>

                            {sess.adjournment_reason && (
                              <div style={{ marginTop: '0.4rem', fontSize: '0.88rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: '700', color: 'var(--text-muted)', minWidth: '90px' }}>سبب التأجيل:</span>
                                <span style={{ color: 'var(--text-main)' }}>{sess.adjournment_reason}</span>
                              </div>
                            )}

                            {sess.ruling_text && (
                              <div style={{ marginTop: '0.4rem', fontSize: '0.88rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start', background: 'var(--status-judgment-bg)', padding: '0.5rem', borderRadius: '6px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--status-judgment)', minWidth: '90px' }}>منطوق الحكم:</span>
                                <span style={{ color: 'var(--text-main)' }}>{sess.ruling_text}</span>
                              </div>
                            )}

                            {sess.notes && sess.notes !== sess.adjournment_reason && (
                              <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <strong>ملاحظات:</strong> {sess.notes}
                              </div>
                            )}

                            {sess.created_at && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-subtle)', textAlign: 'left' }}>
                                تم التسجيل: {new Date(sess.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() => handleOpenDecision(current)}
                >
                  <Clock size={16} />
                  <span>تسجيل قرار / تأجيل جديد</span>
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedCase(null)}>إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Case Modal */}
      {editingCase && (
        <div className="modal-backdrop" onClick={() => setEditingCase(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                <Edit3 size={18} color="var(--primary-600)" style={{ flexShrink: 0 }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, wordBreak: 'break-word' }}>
                  تعديل بيانات القضية رقم {editingCase.case_number}/{editingCase.case_year}
                </h3>
              </div>
              <button className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }} onClick={() => setEditingCase(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">رقم الدعوى *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={editingCase.case_number}
                      onChange={(e) => setEditingCase({ ...editingCase, case_number: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">السنة القضائية *</label>
                    <input
                      type="number"
                      className="form-input"
                      required
                      value={editingCase.case_year}
                      onChange={(e) => setEditingCase({ ...editingCase, case_year: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">نوع القضية</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="مثال: مدني، جنائي، أسرة..."
                      value={CASE_TYPES[editingCase.case_type] || editingCase.case_type || ''}
                      onChange={(e) => setEditingCase({ ...editingCase, case_type: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">درجة التقاضي</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="مثال: ابتدائي، استئناف، نقض..."
                      value={COURT_LEVELS[editingCase.court_level] || editingCase.court_level || ''}
                      onChange={(e) => setEditingCase({ ...editingCase, court_level: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">موضوع الدعوى</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingCase.case_title || ''}
                    onChange={(e) => setEditingCase({ ...editingCase, case_title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">المحكمة</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingCase.court_name || ''}
                      onChange={(e) => setEditingCase({ ...editingCase, court_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الدائرة</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="مثال: الدائرة 3 مدني / قاعة 2"
                      value={editingCase.court_room || ''}
                      onChange={(e) => setEditingCase({ ...editingCase, court_room: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">حالة الدعوى</label>
                    <select
                      className="form-select"
                      value={editingCase.status}
                      onChange={(e) => setEditingCase({ ...editingCase, status: e.target.value })}
                    >
                      {Object.entries(CASE_STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">المحامي المكلف من الفريق</label>
                    <select
                      className="form-select"
                      value={editingCase.next_steps || ''}
                      onChange={(e) => setEditingCase({ ...editingCase, next_steps: e.target.value || null })}
                    >
                      <option value="">-- بدون إسناد / غير مسندة --</option>
                      {team.map((m) => (
                        <option key={m.id} value={m.id}>
                          الأستاذ / {m.name} ({USER_ROLES[m.role] || m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">المدعي</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingCase.plaintiff_name}
                      onChange={(e) => setEditingCase({ ...editingCase, plaintiff_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المدعى عليه</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingCase.defendant_name}
                      onChange={(e) => setEditingCase({ ...editingCase, defendant_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ الجلسة القادمة</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingCase.next_session_date ? editingCase.next_session_date.split('T')[0] : ''}
                    onChange={(e) => setEditingCase({ ...editingCase, next_session_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات وقرارات</label>
                  <textarea
                    className="form-textarea"
                    value={editingCase.notes || ''}
                    onChange={(e) => setEditingCase({ ...editingCase, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCase(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Recording Modal for CasesPage */}
      {decisionCase && (
        <div className="modal-backdrop" onClick={() => setDecisionCase(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                <Clock size={18} color="var(--primary-600)" style={{ flexShrink: 0 }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, wordBreak: 'break-word' }}>
                  تسجيل قرار الجلسة لدعوى رقم {decisionCase.case_number}/{decisionCase.case_year}
                </h3>
              </div>
              <button className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }} onClick={() => setDecisionCase(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordDecision}>
              <div className="modal-body">
                <div style={{ padding: '0.8rem 1rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: '700', color: 'var(--primary-800)', wordBreak: 'break-word' }}>
                    {decisionCase.case_title || `دعوى رقم ${decisionCase.case_number}`}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المحكمة: {decisionCase.court_name}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">تاريخ الجلسة المنظورة *</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={decisionSessionDate}
                      onChange={(e) => setDecisionSessionDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">قرار الجلسة / الحالة *</label>
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
                </div>

                {decisionStatus === 'adjourned' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">سبب التأجيل والقرار</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="مثال: للإعلان بأصل الصحيفة والمستندات"
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
                        value={nextSessionDate}
                        onChange={(e) => setNextSessionDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Optional Team Assignment */}
                <div className="form-group" style={{ marginTop: '0.4rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={16} color="var(--primary-600)" />
                    <span>إسناد / تكليف عضو من الفريق لمتابعة هذه الدعوى (اختياري)</span>
                  </label>
                  <select
                    className="form-select"
                    value={assignedLawyerId}
                    onChange={(e) => setAssignedLawyerId(e.target.value)}
                  >
                    <option value="">-- بدون إسناد / غير مسندة --</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        الأستاذ / {m.name} — ({USER_ROLES[m.role] || m.role})
                      </option>
                    ))}
                  </select>
                </div>

                {(decisionStatus === 'finalJudgment' || decisionStatus === 'preliminaryJudgment') && (
                  <div className="form-group">
                    <label className="form-label">منطوق الحكم</label>
                    <textarea
                      className="form-textarea"
                      placeholder="أدخل منطوق الحكم الصادر في الجلسة بالتفصيل..."
                      rows={3}
                      value={rulingText}
                      onChange={(e) => setRulingText(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDecisionCase(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={isSavingDecision}>
                  {isSavingDecision ? 'جاري الحفظ...' : 'حفظ القرار وتحديث تاريخ القضية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
