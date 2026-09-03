import React, { useState } from 'react';
import {
  Briefcase,
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
  AlertCircle,
  Plus,
  Printer,
  Phone,
  Scale,
  Building2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, COURT_LEVELS, CASE_STATUSES, SESSION_DECISIONS, USER_ROLES } from '../lib/supabase';

export default function CasesPage() {
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
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Page Header */}
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
              السجل القضائي وملفات الدعاوى
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            إدارة القضايا والدعاوى المتداولة
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
            {filteredCases.length} قضية نشطة
          </span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.15rem', borderRadius: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>

          <div className="header-search" style={{ width: '100%', minHeight: '40px', borderRadius: '10px' }}>
            <Search size={17} style={{ color: 'var(--text-subtle)' }} />
            <input
              type="text"
              placeholder="بحث برقم القضية، الموكل، أو الخصم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>النوع:</span>
            <select className="form-select" style={{ fontSize: '0.86rem', minHeight: '40px', borderRadius: '10px', padding: '0.45rem 0.75rem' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">جميع الأنواع</option>
              {Object.entries(CASE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>الحالة:</span>
            <select className="form-select" style={{ fontSize: '0.86rem', minHeight: '40px', borderRadius: '10px', padding: '0.45rem 0.75rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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

        const assigned = team.find(m => m.id === current.next_steps || m.id === (current.next_steps || '').replace('assigned:', ''));

        return (
          <div className="modal-backdrop" onClick={() => setSelectedCase(null)}>
            <div className="modal-dialog" style={{ maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                    <Scale size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
                    تفاصيل وسجل الدعوى رقم {current.case_number}/{current.case_year}
                  </h3>
                </div>
                <button
                  className="btn btn-secondary btn-icon"
                  style={{ borderRadius: '8px', width: '36px', height: '36px', padding: 0 }}
                  onClick={() => setSelectedCase(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Case Info Top Card */}
                <div className="case-modal-top-card">
                  {/* Title & Status Badge */}
                  <div className="case-modal-header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <FileText size={20} color="var(--primary-800)" style={{ flexShrink: 0 }} />
                      <h4 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                        {current.case_title || `دعوى ${CASE_TYPES[current.case_type] || current.case_type || 'مدني'} رقم ${current.case_number}`}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fdf2f2', color: 'var(--primary-800)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.88rem', fontWeight: '700', border: '1px solid rgba(109, 15, 27, 0.15)', whiteSpace: 'nowrap' }}>
                      <Check size={15} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span>الحالة: {currentStatus.label}</span>
                    </div>
                  </div>

                  {/* Row 1: 4 Column Metric Grid */}
                  <div className="case-modal-metrics-4">
                    {/* نوع الدعوى */}
                    <div className="case-metric-item">
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>نوع الدعوى</span>
                      <div className="case-metric-val">
                        <Gavel size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span>{CASE_TYPES[current.case_type] || current.case_type || 'مدني'}</span>
                      </div>
                    </div>

                    {/* درجة التقاضي */}
                    <div className="case-metric-item has-border" style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>درجة التقاضي</span>
                      <div className="case-metric-val">
                        <Building2 size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span>{COURT_LEVELS[current.court_level] || current.court_level || 'ابتدائي'}</span>
                      </div>
                    </div>

                    {/* المدعى عليه */}
                    <div className="case-metric-item has-border" style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المدعى عليه</span>
                      <div className="case-metric-val">
                        <User size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span>{current.defendant_name || '—'}</span>
                      </div>
                    </div>

                    {/* المحامي / المدعي */}
                    <div className="case-metric-item has-border" style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المحامي</span>
                      <div className="case-metric-val">
                        <User size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span>{current.plaintiff_name || 'والي'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Divider */}
                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '1rem 0' }} />

                  {/* Row 2: 3 Column Metric Grid (المحكمة + المحامي المكلف + تاريخ الجلسة القادمة) */}
                  <div className="case-modal-metrics-3">
                    {/* المحكمة */}
                    <div className="case-metric-item">
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المحكمة</span>
                      <div className="case-metric-val">
                        <Building2 size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span>{current.court_name || 'محكمة دمياط الابتدائية'}</span>
                      </div>
                    </div>

                    {/* المحامي المكلف */}
                    <div className="case-metric-item has-border" style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المحامي المكلف</span>
                      <div className="case-metric-val">
                        <Briefcase size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span>{assigned ? `الأستاذ / ${assigned.name}` : 'غير مسند'}</span>
                      </div>
                    </div>

                    {/* تاريخ الجلسة القادمة */}
                    <div className="case-metric-item has-border" style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>تاريخ الجلسة القادمة</span>
                      <div className="case-metric-val" style={{ color: current.next_session_date ? 'var(--primary-700)' : 'var(--text-main)' }}>
                        <Calendar size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span>{current.next_session_date ? new Date(current.next_session_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'لا توجد جلسة محددة'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Header: سجل الجلسات والتأجيلات */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.4rem 0', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={16} color="var(--text-main)" />
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                      سجل الجلسات والتأجيلات
                    </h4>
                    <span style={{ background: '#fdf2f2', color: 'var(--primary-800)', padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid rgba(109, 15, 27, 0.1)', whiteSpace: 'nowrap' }}>
                      {caseSessions.length} جلسات
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: 'var(--primary-800)', color: '#ffffff', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.88rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                    onClick={() => handleOpenDecision(current)}
                  >
                    <Plus size={16} />
                    <span>تسجيل قرار / تأجيل</span>
                  </button>
                </div>

                {/* Vertical Timeline */}
                {caseSessions.length === 0 ? (
                  <div style={{ padding: '1.75rem', textAlign: 'center', background: 'var(--bg-card-subtle)', borderRadius: '12px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                    <Calendar size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.92rem', fontWeight: '600' }}>لا يوجد سجل جلسات مسجل لهذه القضية حتى الآن</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                      عند تسجيل قرار الجلسة (تأجيل أو حكم)، سيتم حفظه تلقائيًا في هذا السجل الزمني.
                    </p>
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingRight: '26px' }}>
                    {/* Continuous vertical dashed line */}
                    <div style={{ position: 'absolute', right: '9px', top: '16px', bottom: '16px', width: '2px', background: '#e2e8f0', borderRight: '2px dashed #cbd5e1' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                      {caseSessions.map((sess, idx) => {
                        const isJudgment = sess.status === 'finalJudgment' || sess.status === 'preliminaryJudgment' || (sess.status && sess.status.includes('judgment'));

                        let statusBadgeText = 'مؤجلة';
                        let statusBadgeBg = '#fff7ed';
                        let statusBadgeColor = '#c2410c';
                        let statusBadgeBorder = '#ffedd5';

                        if (sess.status === 'finalJudgment') {
                          statusBadgeText = 'حكم نهائي';
                          statusBadgeBg = '#f0fdf4';
                          statusBadgeColor = '#15803d';
                          statusBadgeBorder = '#dcfce7';
                        } else if (sess.status === 'preliminaryJudgment') {
                          statusBadgeText = 'حكم تمهيدي';
                          statusBadgeBg = '#eff6ff';
                          statusBadgeColor = '#1d4ed8';
                          statusBadgeBorder = '#dbeafe';
                        }

                        const sessDateStr = sess.session_date
                          ? new Date(sess.session_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
                          : '—';

                        const recordTimeStr = sess.created_at
                          ? new Date(sess.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) + ' - ' + new Date(sess.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                          : sessDateStr;

                        const lawyerName = assigned ? assigned.name : 'محمود';

                        return (
                          <div key={sess.id || idx} style={{ position: 'relative' }}>
                            {/* Timeline Node Dot */}
                            <div style={{
                              position: 'absolute',
                              right: '-26px',
                              top: '20px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: isJudgment ? '#22c55e' : '#ea580c',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px solid #ffffff',
                              boxShadow: `0 0 0 2px ${isJudgment ? '#22c55e' : '#ea580c'}`,
                              zIndex: 2
                            }}>
                              {isJudgment && <Check size={12} strokeWidth={3} />}
                            </div>

                            {/* Session Card */}
                            <div className="case-modal-session-card">
                              {/* Right: Date & Reasons */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Calendar size={18} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                                  <strong style={{ fontSize: '1.02rem', color: 'var(--text-main)', fontWeight: '800' }}>
                                    جلسة: {sessDateStr}
                                  </strong>
                                </div>

                                {sess.adjournment_reason && (
                                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                                    سبب التأجيل: <span style={{ color: 'var(--text-muted)' }}>{sess.adjournment_reason}</span>
                                  </div>
                                )}

                                {sess.ruling_text && (
                                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                                    منطوق الحكم: <span style={{ color: 'var(--text-muted)' }}>{sess.ruling_text}</span>
                                  </div>
                                )}
                              </div>

                              {/* Left: Badge & Registered by */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.45rem', flexShrink: 0 }}>
                                <span style={{
                                  background: statusBadgeBg,
                                  color: statusBadgeColor,
                                  border: `1px solid ${statusBadgeBorder}`,
                                  fontWeight: '700',
                                  fontSize: '0.82rem',
                                  padding: '0.25rem 0.85rem',
                                  borderRadius: '8px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {statusBadgeText}
                                </span>

                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', direction: 'rtl', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                  تم التسجيل: {recordTimeStr}
                                </div>

                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <User size={14} style={{ flexShrink: 0 }} />
                                  <span>بواسطة: {lawyerName}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {/* <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ borderRadius: '8px', padding: '0.55rem 1.5rem', fontWeight: '700' }} 
                  onClick={() => setSelectedCase(null)}
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--primary-800)', color: '#ffffff', borderRadius: '8px', padding: '0.55rem 1.35rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => handleOpenDecision(current)}
                >
                  <Clock size={16} />
                  <span>تسجيل قرار / تأجيل جديد</span>
                </button>
              </div> */}
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
                    <label className="form-label">تاريخ الجلسة المتداولة *</label>
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
