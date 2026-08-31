import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  CheckSquare,
  Square,
  Search,
  Check,
  Edit3,
  Trash2,
  X,
  Clock,
  Filter
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES, CASE_TYPES, COURT_LEVELS } from '../lib/supabase';

export default function TeamPage() {
  const { team, cases, addTeamMember, updateTeamMember, deleteTeamMember, updateCase } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Assign Cases Modal State
  const [assigningMember, setAssigningMember] = useState(null);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'ASSIGNED_TO_HIM' | 'UNASSIGNED'
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('authorizedLawyer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addTeamMember({
        name,
        role,
        phone: phone || null,
        email: email || null,
        active_cases_count: 0,
        today_sessions_count: 0,
        pending_tasks_count: 0,
        documents_for_review_count: 0,
      });
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
    } catch (err) {
      alert('خطأ أثناء إضافة المحامي: ' + err.message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await updateTeamMember(editingMember.id, {
        name: editingMember.name,
        role: editingMember.role,
        phone: editingMember.phone || null,
        email: editingMember.email || null,
      });
      setEditingMember(null);
    } catch (err) {
      alert('خطأ أثناء التعديل: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من إزالة هذا العضو من فريق العمل؟')) {
      await deleteTeamMember(id);
    }
  };

  const handleOpenAssignModal = (member) => {
    setAssigningMember(member);
    const assignedIds = cases
      .filter(c => !c.is_archived && (c.next_steps === member.id || c.next_steps === 'assigned:' + member.id))
      .map(c => c.id);
    setSelectedCaseIds(assignedIds);
    setCaseSearchTerm('');
    setFilterMode('ALL');
  };

  const toggleCaseSelection = (caseId) => {
    setSelectedCaseIds(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  const handleSelectAllVisible = (visibleIds) => {
    setSelectedCaseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleDeselectAllVisible = (visibleIds) => {
    setSelectedCaseIds(prev => prev.filter(id => !visibleIds.includes(id)));
  };

  const handleSaveAssignments = async () => {
    if (!assigningMember) return;
    setIsSavingAssignments(true);
    try {
      const activeCases = cases.filter(c => !c.is_archived);
      for (const c of activeCases) {
        const isCurrentlyAssignedToHim = c.next_steps === assigningMember.id || c.next_steps === 'assigned:' + assigningMember.id;
        const isSelectedNow = selectedCaseIds.includes(c.id);

        if (isSelectedNow && !isCurrentlyAssignedToHim) {
          await updateCase(c.id, { next_steps: assigningMember.id });
        } else if (!isSelectedNow && isCurrentlyAssignedToHim) {
          await updateCase(c.id, { next_steps: null });
        }
      }

      await updateTeamMember(assigningMember.id, {
        active_cases_count: selectedCaseIds.length,
      });

      setAssigningMember(null);
    } catch (err) {
      alert('خطأ أثناء حفظ إسناد القضايا: ' + err.message);
    } finally {
      setIsSavingAssignments(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>فريق العمل والمحامين المعاونين</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            توزيع القضايا والجلسات، ومتابعة المهام الإجرائية لأعضاء مكتب المحاماة.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} />
          <span>إضافة محامي / إداري</span>
        </button>
      </div>

      {team.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <UserCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لم يتم تسجيل أعضاء في الفريق بعد</h3>
          <p style={{ fontSize: '0.9rem' }}>أضف محامين معاونين أو سكرتارية المكتب لتوزيع الحضور والجلسات.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {team.map((member) => {
            const memberCases = cases.filter(
              c => !c.is_archived && (c.next_steps === member.id || c.next_steps === 'assigned:' + member.id)
            );
            const memberTodaySessions = memberCases.filter(
              c => c.next_session_date && c.next_session_date.startsWith(todayStr)
            );

            return (
              <div key={member.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div className="avatar" style={{ background: 'linear-gradient(135deg, #001f3f, #133e75)', width: '46px', height: '46px', fontSize: '1.1rem' }}>
                        {member.name ? member.name.charAt(0) : 'م'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>الأستاذ / {member.name}</h3>
                        <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', marginTop: '0.2rem' }}>
                          {USER_ROLES[member.role] || member.role}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        title="تعديل البيانات"
                        onClick={() => setEditingMember({ ...member })}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger btn-icon" 
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        title="حذف"
                        onClick={() => handleDelete(member.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{ padding: '0.75rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {member.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Phone size={13} color="var(--primary-600)" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    {member.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Mail size={13} color="var(--primary-600)" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    {!member.phone && !member.email && (
                      <span style={{ color: 'var(--text-subtle)' }}>لا توجد بيانات اتصال مسجلة</span>
                    )}
                  </div>

                  {/* Workload Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.82rem' }}>
                    <div style={{ padding: '0.6rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)' }}>قضايا مسندة</div>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--primary-700)' }}>{memberCases.length}</strong>
                    </div>
                    <div style={{ padding: '0.6rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)' }}>جلسات اليوم</div>
                      <strong style={{ fontSize: '1.2rem', color: memberTodaySessions.length > 0 ? 'var(--status-warning)' : 'var(--text-main)' }}>
                        {memberTodaySessions.length}
                      </strong>
                    </div>
                  </div>

                  {/* Assigned cases preview */}
                  {memberCases.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>أحدث القضايا المسندة:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.3rem' }}>
                        {memberCases.slice(0, 3).map(c => (
                          <span
                            key={c.id}
                            className="badge"
                            style={{ background: 'var(--primary-50)', color: 'var(--primary-800)', border: '1px solid var(--border-color)', fontSize: '0.74rem' }}
                          >
                            دعوى {c.case_number}/{c.case_year}
                          </span>
                        ))}
                        {memberCases.length > 3 && (
                          <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            +{memberCases.length - 3} أخرى
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assign cases button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={() => handleOpenAssignModal(member)}
                >
                  <Briefcase size={15} />
                  <span>إسناد وتوزيع القضايا ({memberCases.length})</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Cases Modal */}
      {assigningMember && (() => {
        const activeCases = cases.filter(c => !c.is_archived);
        const filteredCases = activeCases.filter(c => {
          const isAssignedToCurrent = c.next_steps === assigningMember.id || c.next_steps === 'assigned:' + assigningMember.id;
          const isSelected = selectedCaseIds.includes(c.id);

          if (filterMode === 'ASSIGNED_TO_HIM' && !isSelected) return false;
          if (filterMode === 'UNASSIGNED' && (c.next_steps || isSelected)) return false;

          if (!caseSearchTerm) return true;
          const q = caseSearchTerm.toLowerCase();
          return (
            (c.case_number && c.case_number.toLowerCase().includes(q)) ||
            (c.case_year && c.case_year.toString().includes(q)) ||
            (c.case_title && c.case_title.toLowerCase().includes(q)) ||
            (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(q)) ||
            (c.defendant_name && c.defendant_name.toLowerCase().includes(q)) ||
            (c.court_name && c.court_name.toLowerCase().includes(q))
          );
        });

        const visibleIds = filteredCases.map(c => c.id);

        return (
          <div className="modal-backdrop" onClick={() => setAssigningMember(null)}>
            <div className="modal-dialog" style={{ maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <Briefcase size={20} color="var(--primary-600)" style={{ flexShrink: 0 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, wordBreak: 'break-word' }}>
                    إسناد وتوزيع القضايا للأستاذ / {assigningMember.name}
                  </h3>
                </div>
                <button className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }} onClick={() => setAssigningMember(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Information and selected count banner */}
                <div style={{ padding: '0.85rem 1rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary-800)', fontWeight: '700' }}>
                    تم تحديد <span style={{ color: 'var(--accent-gold)', fontSize: '1.1rem' }}>{selectedCaseIds.length}</span> قضية مسندة لهذا المحامي
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    إجمالي القضايا النشطة بالمكتب: {activeCases.length}
                  </div>
                </div>

                {/* Search and filter toolbar */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingRight: '2.4rem' }}
                      placeholder="بحث برقم القضية، الموكل، الخصم أو المحكمة..."
                      value={caseSearchTerm}
                      onChange={(e) => setCaseSearchTerm(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn ${filterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                      onClick={() => setFilterMode('ALL')}
                    >
                      الكل ({activeCases.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${filterMode === 'ASSIGNED_TO_HIM' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                      onClick={() => setFilterMode('ASSIGNED_TO_HIM')}
                    >
                      المحددة له ({selectedCaseIds.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${filterMode === 'UNASSIGNED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                      onClick={() => setFilterMode('UNASSIGNED')}
                    >
                      غير مسندة
                    </button>
                  </div>
                </div>

                {/* Bulk selection shortcuts */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>اختر القضايا التي سيتولى هذا المحامي متابعتها وحضور جلساتها:</span>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
                      onClick={() => handleSelectAllVisible(visibleIds)}
                    >
                      تحديد الظاهر
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--danger-color, #d9534f)', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
                      onClick={() => handleDeselectAllVisible(visibleIds)}
                    >
                      إلغاء تحديد الظاهر
                    </button>
                  </div>
                </div>

                {/* Cases List */}
                {filteredCases.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>لا توجد قضايا مطابقة لبحثك</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {filteredCases.map(c => {
                      const isSelected = selectedCaseIds.includes(c.id);
                      const otherAssignee = c.next_steps && c.next_steps !== assigningMember.id && c.next_steps !== 'assigned:' + assigningMember.id
                        ? team.find(m => m.id === c.next_steps || m.id === c.next_steps.replace('assigned:', ''))
                        : null;

                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleCaseSelection(c.id)}
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'var(--primary-50)' : 'var(--bg-card)',
                            border: `1.5px solid ${isSelected ? 'var(--primary-600)' : 'var(--border-color)'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ flexShrink: 0 }}>
                            {isSelected ? (
                              <CheckSquare size={22} color="var(--primary-600)" />
                            ) : (
                              <Square size={22} color="var(--text-subtle)" />
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--primary-800)' : 'var(--text-main)' }}>
                                  دعوى رقم {c.case_number}/{c.case_year}
                                </strong>
                                <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '0.72rem' }}>
                                  {CASE_TYPES[c.case_type] || c.case_type || 'مدني'}
                                </span>
                              </div>

                              {/* Assignment status badge */}
                              {isSelected ? (
                                <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontWeight: '700', fontSize: '0.75rem' }}>
                                  ✓ مسندة للأستاذ / {assigningMember.name}
                                </span>
                              ) : otherAssignee ? (
                                <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '0.75rem' }}>
                                  مسندة حالياً: {otherAssignee.name}
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  غير مسندة
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem', wordBreak: 'break-word' }}>
                              {c.case_title || '—'}
                            </div>

                            <div style={{ display: 'flex', gap: '0.9rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              <span><strong>المحكمة:</strong> {c.court_name || '—'}</span>
                              {c.court_room && <span><strong>الدائرة:</strong> {c.court_room}</span>}
                              <span><strong>المدعي:</strong> {c.plaintiff_name || '—'}</span>
                              <span><strong>المدعى عليه:</strong> {c.defendant_name || '—'}</span>
                              {c.next_session_date && (
                                <span style={{ color: 'var(--primary-600)', fontWeight: '700' }}>
                                  جلسة: {new Date(c.next_session_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  المجموع: {selectedCaseIds.length} قضية مسندة
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setAssigningMember(null)}>
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSavingAssignments}
                    onClick={handleSaveAssignments}
                  >
                    {isSavingAssignments ? 'جاري الحفظ...' : `حفظ وتحديث الإسناد (${selectedCaseIds.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة عضو / محامي جديد للمكتب</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">الدرجة / الصفة المهنية *</label>
                  <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    {Object.entries(USER_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">إضافة المحامي</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="modal-backdrop" onClick={() => setEditingMember(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل بيانات المحامي: {editingMember.name}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setEditingMember(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input type="text" className="form-input" required value={editingMember.name} onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">الدرجة المهنية</label>
                  <select className="form-select" value={editingMember.role} onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}>
                    {Object.entries(USER_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input type="tel" className="form-input" value={editingMember.phone || ''} onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" className="form-input" value={editingMember.email || ''} onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMember(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
