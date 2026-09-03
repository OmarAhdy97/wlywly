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
  Filter,
  ClipboardList,
  Send,
  Building2,
  MapPin,
  Hash
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES, CASE_TYPES, COURT_LEVELS } from '../lib/supabase';

export default function TeamPage() {
  const { 
    team, 
    cases, 
    adminTasks, 
    bailiffTasks, 
    addTeamMember, 
    updateTeamMember, 
    deleteTeamMember, 
    updateCase, 
    updateAdminTask, 
    updateBailiffTask 
  } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // 1. Assign Cases Modal State
  const [assigningMember, setAssigningMember] = useState(null);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'ASSIGNED_TO_HIM' | 'UNASSIGNED'
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // 2. Assign Administrative Tasks Modal State
  const [assigningAdminMember, setAssigningAdminMember] = useState(null);
  const [selectedAdminTaskIds, setSelectedAdminTaskIds] = useState([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminFilterMode, setAdminFilterMode] = useState('ALL'); // 'ALL' | 'ASSIGNED_TO_HIM' | 'UNASSIGNED'
  const [isSavingAdminAssignments, setIsSavingAdminAssignments] = useState(false);

  // 3. Assign Bailiff Orders Modal State
  const [assigningBailiffMember, setAssigningBailiffMember] = useState(null);
  const [selectedBailiffTaskIds, setSelectedBailiffTaskIds] = useState([]);
  const [bailiffSearchTerm, setBailiffSearchTerm] = useState('');
  const [bailiffFilterMode, setBailiffFilterMode] = useState('ALL'); // 'ALL' | 'ASSIGNED_TO_HIM' | 'UNASSIGNED'
  const [isSavingBailiffAssignments, setIsSavingBailiffAssignments] = useState(false);

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

  // --- CASES ASSIGNMENT ---
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

  // --- ADMINISTRATIVE TASKS ASSIGNMENT ---
  const handleOpenAssignAdminModal = (member) => {
    setAssigningAdminMember(member);
    const assignedIds = adminTasks
      .filter(t => t.assigned_to === member.id)
      .map(t => t.id);
    setSelectedAdminTaskIds(assignedIds);
    setAdminSearchTerm('');
    setAdminFilterMode('ALL');
  };

  const toggleAdminTaskSelection = (taskId) => {
    setSelectedAdminTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSaveAdminAssignments = async () => {
    if (!assigningAdminMember) return;
    setIsSavingAdminAssignments(true);
    try {
      for (const task of adminTasks) {
        const isCurrentlyAssignedToHim = task.assigned_to === assigningAdminMember.id;
        const isSelectedNow = selectedAdminTaskIds.includes(task.id);

        if (isSelectedNow && !isCurrentlyAssignedToHim) {
          await updateAdminTask(task.id, { assigned_to: assigningAdminMember.id });
        } else if (!isSelectedNow && isCurrentlyAssignedToHim) {
          await updateAdminTask(task.id, { assigned_to: null });
        }
      }

      setAssigningAdminMember(null);
    } catch (err) {
      alert('خطأ أثناء حفظ إسناد الأعمال الإدارية: ' + err.message);
    } finally {
      setIsSavingAdminAssignments(false);
    }
  };

  // --- BAILIFF NOTICES ASSIGNMENT ---
  const handleOpenAssignBailiffModal = (member) => {
    setAssigningBailiffMember(member);
    const assignedIds = bailiffTasks
      .filter(b => b.assigned_to === member.id)
      .map(b => b.id);
    setSelectedBailiffTaskIds(assignedIds);
    setBailiffSearchTerm('');
    setBailiffFilterMode('ALL');
  };

  const toggleBailiffTaskSelection = (taskId) => {
    setSelectedBailiffTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSaveBailiffAssignments = async () => {
    if (!assigningBailiffMember) return;
    setIsSavingBailiffAssignments(true);
    try {
      for (const task of bailiffTasks) {
        const isCurrentlyAssignedToHim = task.assigned_to === assigningBailiffMember.id;
        const isSelectedNow = selectedBailiffTaskIds.includes(task.id);

        if (isSelectedNow && !isCurrentlyAssignedToHim) {
          await updateBailiffTask(task.id, { assigned_to: assigningBailiffMember.id });
        } else if (!isSelectedNow && isCurrentlyAssignedToHim) {
          await updateBailiffTask(task.id, { assigned_to: null });
        }
      }

      setAssigningBailiffMember(null);
    } catch (err) {
      alert('خطأ أثناء حفظ إسناد أوراق المحضرين: ' + err.message);
    } finally {
      setIsSavingBailiffAssignments(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Top Header */}
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
              منظومة التعاون وإدارة الفريق
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            فريق العمل والمحامين المعاونين
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{
              background: 'var(--primary-800)',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '0.55rem 1.15rem',
              fontSize: '0.88rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              border: '1px solid var(--accent-gold)'
            }}
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>إضافة عضو جديد</span>
          </button>
        </div>
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
            const memberAdminTasks = adminTasks.filter(
              t => t.assigned_to === member.id && t.status !== 'completed'
            );
            const memberBailiffTasks = bailiffTasks.filter(
              b => b.assigned_to === member.id && b.status !== 'delivered'
            );

            return (
              <div key={member.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--primary-900), var(--primary-700))', width: '46px', height: '46px', fontSize: '1.1rem', color: '#ffffff' }}>
                        {member.name ? member.name.charAt(0) : 'م'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>الأستاذ / {member.name}</h3>
                        <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', marginTop: '0.25rem' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', direction: 'ltr' }}>
                        <Phone size={13} color="var(--primary-700)" />
                        <span>🇪🇬 +20 {member.phone.startsWith('0') ? member.phone.substring(1) : member.phone}</span>
                      </div>
                    )}
                    {member.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Mail size={13} color="var(--primary-700)" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    {!member.phone && !member.email && (
                      <span style={{ color: 'var(--text-subtle)' }}>لا توجد بيانات اتصال مسجلة</span>
                    )}
                  </div>

                  {/* Workload Stats - 4 KPI metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ padding: '0.55rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>قضايا مسندة</div>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--primary-800)' }}>{memberCases.length}</strong>
                    </div>

                    <div style={{ padding: '0.55rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>جلسات اليوم</div>
                      <strong style={{ fontSize: '1.15rem', color: memberTodaySessions.length > 0 ? 'var(--status-warning)' : 'var(--text-main)' }}>
                        {memberTodaySessions.length}
                      </strong>
                    </div>

                    <div style={{ padding: '0.55rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>أعمال إدارية</div>
                      <strong style={{ fontSize: '1.15rem', color: memberAdminTasks.length > 0 ? 'var(--primary-700)' : 'var(--text-main)' }}>
                        {memberAdminTasks.length}
                      </strong>
                    </div>

                    <div style={{ padding: '0.55rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>أوراق محضرين</div>
                      <strong style={{ fontSize: '1.15rem', color: memberBailiffTasks.length > 0 ? 'var(--accent-gold)' : 'var(--text-main)' }}>
                        {memberBailiffTasks.length}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Assignment Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem' }}
                    onClick={() => handleOpenAssignModal(member)}
                  >
                    <Briefcase size={14} />
                    <span>إسناد القضايا ({memberCases.length})</span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.6rem' }}
                      onClick={() => handleOpenAssignAdminModal(member)}
                    >
                      <ClipboardList size={13} color="var(--primary-700)" />
                      <span>الأعمال الإدارية ({memberAdminTasks.length})</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.45rem 0.6rem' }}
                      onClick={() => handleOpenAssignBailiffModal(member)}
                    >
                      <Send size={13} color="var(--primary-700)" />
                      <span>المحضرين ({memberBailiffTasks.length})</span>
                    </button>
                  </div>
                </div>
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

      {/* ========================================================================= */}
      {/* 2. ASSIGN ADMINISTRATIVE TASKS MODAL                                      */}
      {/* ========================================================================= */}
      {assigningAdminMember && (() => {
        const activeTasks = adminTasks.filter(t => t.status !== 'completed');
        const filteredTasks = activeTasks.filter(t => {
          const isAssignedToCurrent = t.assigned_to === assigningAdminMember.id;
          const isSelected = selectedAdminTaskIds.includes(t.id);

          if (adminFilterMode === 'ASSIGNED_TO_HIM' && !isSelected) return false;
          if (adminFilterMode === 'UNASSIGNED' && (t.assigned_to || isSelected)) return false;

          if (!adminSearchTerm) return true;
          const q = adminSearchTerm.toLowerCase();
          return (
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.client_name && t.client_name.toLowerCase().includes(q)) ||
            (t.location && t.location.toLowerCase().includes(q)) ||
            (t.requirements && t.requirements.toLowerCase().includes(q))
          );
        });

        const visibleIds = filteredTasks.map(t => t.id);

        return (
          <div className="modal-backdrop" onClick={() => setAssigningAdminMember(null)}>
            <div className="modal-dialog" style={{ maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <ClipboardList size={20} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, wordBreak: 'break-word' }}>
                    إسناد الأعمال الإدارية للأستاذ / {assigningAdminMember.name}
                  </h3>
                </div>
                <button className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }} onClick={() => setAssigningAdminMember(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Information banner */}
                <div style={{ padding: '0.85rem 1rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary-800)', fontWeight: '700' }}>
                    تم تحديد <span style={{ color: 'var(--accent-gold)', fontSize: '1.1rem' }}>{selectedAdminTaskIds.length}</span> عمل إداري مكلف به
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    إجمالي الأعمال الإدارية قيد التنفيذ: {activeTasks.length}
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingRight: '2.4rem' }}
                      placeholder="بحث بعنوان العمل، الموكل، أو مكان التنفيذ..."
                      value={adminSearchTerm}
                      onChange={(e) => setAdminSearchTerm(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn ${adminFilterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                      onClick={() => setAdminFilterMode('ALL')}
                    >
                      الكل ({activeTasks.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${adminFilterMode === 'ASSIGNED_TO_HIM' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                      onClick={() => setAdminFilterMode('ASSIGNED_TO_HIM')}
                    >
                      المسندة له ({selectedAdminTaskIds.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${adminFilterMode === 'UNASSIGNED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                      onClick={() => setAdminFilterMode('UNASSIGNED')}
                    >
                      غير مسندة
                    </button>
                  </div>
                </div>

                {/* Bulk Select/Deselect Bar */}
                {visibleIds.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span>المعروض حالياً: {visibleIds.length} عمل</span>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--primary-700)', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => setSelectedAdminTaskIds(prev => Array.from(new Set([...prev, ...visibleIds])))}
                      >
                        تحديد الكل المعروض
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => setSelectedAdminTaskIds(prev => prev.filter(id => !visibleIds.includes(id)))}
                      >
                        إلغاء تحديد المعروض
                      </button>
                    </div>
                  </div>
                )}

                {/* Tasks List */}
                {filteredTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                    <ClipboardList size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد أعمال إدارية مطابقة لخيارات البحث أو الفلتر.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {filteredTasks.map(t => {
                      const isSelected = selectedAdminTaskIds.includes(t.id);
                      const otherAssignee = t.assigned_to && t.assigned_to !== assigningAdminMember.id
                        ? team.find(m => m.id === t.assigned_to)
                        : null;

                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleAdminTaskSelection(t.id)}
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '1.5px solid var(--primary-700)' : '1px solid var(--border-color)',
                            background: isSelected ? 'var(--primary-50)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ flexShrink: 0 }}>
                            {isSelected ? (
                              <CheckSquare size={22} color="var(--primary-700)" />
                            ) : (
                              <Square size={22} color="var(--text-subtle)" />
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--primary-800)' : 'var(--text-main)' }}>
                                  {t.title}
                                </strong>
                              </div>

                              {/* Assignment status badge */}
                              {isSelected ? (
                                <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontWeight: '700', fontSize: '0.75rem' }}>
                                  ✓ مكلف به: {assigningAdminMember.name}
                                </span>
                              ) : otherAssignee ? (
                                <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '0.75rem' }}>
                                  مكلف به: {otherAssignee.name}
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  غير مكلف
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.9rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              {t.client_name && <span><strong>الموكل:</strong> {t.client_name}</span>}
                              {t.location && <span><strong>المكان:</strong> {t.location}</span>}
                              {t.execution_date && (
                                <span style={{ color: 'var(--primary-700)', fontWeight: '700' }}>
                                  تاريخ التنفيذ: {new Date(t.execution_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                  المجموع: {selectedAdminTaskIds.length} عمل مكلف به
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setAssigningAdminMember(null)}>
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSavingAdminAssignments}
                    onClick={handleSaveAdminAssignments}
                  >
                    {isSavingAdminAssignments ? 'جاري الحفظ...' : `حفظ وتحديث التكليف (${selectedAdminTaskIds.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. ASSIGN BAILIFF NOTICES MODAL                                           */}
      {/* ========================================================================= */}
      {assigningBailiffMember && (() => {
        const activeTasks = bailiffTasks.filter(b => b.status !== 'delivered');
        const filteredTasks = activeTasks.filter(b => {
          const isAssignedToCurrent = b.assigned_to === assigningBailiffMember.id;
          const isSelected = selectedBailiffTaskIds.includes(b.id);

          if (bailiffFilterMode === 'ASSIGNED_TO_HIM' && !isSelected) return false;
          if (bailiffFilterMode === 'UNASSIGNED' && (b.assigned_to || isSelected)) return false;

          if (!bailiffSearchTerm) return true;
          const q = bailiffSearchTerm.toLowerCase();
          return (
            (b.notice_nature && b.notice_nature.toLowerCase().includes(q)) ||
            (b.bailiff_number && b.bailiff_number.toLowerCase().includes(q)) ||
            (b.client_name && b.client_name.toLowerCase().includes(q)) ||
            (b.court_name && b.court_name.toLowerCase().includes(q)) ||
            (b.bailiff_office && b.bailiff_office.toLowerCase().includes(q))
          );
        });

        const visibleIds = filteredTasks.map(b => b.id);

        return (
          <div className="modal-backdrop" onClick={() => setAssigningBailiffMember(null)}>
            <div className="modal-dialog" style={{ maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <Send size={20} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, wordBreak: 'break-word' }}>
                    إسناد أوراق المحضرين للأستاذ / {assigningBailiffMember.name}
                  </h3>
                </div>
                <button className="btn btn-secondary btn-icon" style={{ flexShrink: 0 }} onClick={() => setAssigningBailiffMember(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Information banner */}
                <div style={{ padding: '0.85rem 1rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary-800)', fontWeight: '700' }}>
                    تم تحديد <span style={{ color: 'var(--accent-gold)', fontSize: '1.1rem' }}>{selectedBailiffTaskIds.length}</span> ورقة محضرين مكلف بها
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    إجمالي الأوراق غير المستلمة: {activeTasks.length}
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingRight: '2.4rem' }}
                      placeholder="بحث بطبيعة الإعلان، رقم المحضرين، الموكل أو المحكمة..."
                      value={bailiffSearchTerm}
                      onChange={(e) => setBailiffSearchTerm(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn ${bailiffFilterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                      onClick={() => setBailiffFilterMode('ALL')}
                    >
                      الكل ({activeTasks.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${bailiffFilterMode === 'ASSIGNED_TO_HIM' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                      onClick={() => setBailiffFilterMode('ASSIGNED_TO_HIM')}
                    >
                      المسندة له ({selectedBailiffTaskIds.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${bailiffFilterMode === 'UNASSIGNED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                      onClick={() => setBailiffFilterMode('UNASSIGNED')}
                    >
                      غير مسندة
                    </button>
                  </div>
                </div>

                {/* Bulk Select/Deselect Bar */}
                {visibleIds.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span>المعروض حالياً: {visibleIds.length} ورقة</span>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--primary-700)', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => setSelectedBailiffTaskIds(prev => Array.from(new Set([...prev, ...visibleIds])))}
                      >
                        تحديد الكل المعروض
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => setSelectedBailiffTaskIds(prev => prev.filter(id => !visibleIds.includes(id)))}
                      >
                        إلغاء تحديد المعروض
                      </button>
                    </div>
                  </div>
                )}

                {/* Bailiff Tasks List */}
                {filteredTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                    <Send size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>لا توجد أوراق محضرين مطابقة لخيارات البحث أو الفلتر.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {filteredTasks.map(b => {
                      const isSelected = selectedBailiffTaskIds.includes(b.id);
                      const otherAssignee = b.assigned_to && b.assigned_to !== assigningBailiffMember.id
                        ? team.find(m => m.id === b.assigned_to)
                        : null;

                      return (
                        <div
                          key={b.id}
                          onClick={() => toggleBailiffTaskSelection(b.id)}
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '1.5px solid var(--primary-700)' : '1px solid var(--border-color)',
                            background: isSelected ? 'var(--primary-50)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ flexShrink: 0 }}>
                            {isSelected ? (
                              <CheckSquare size={22} color="var(--primary-700)" />
                            ) : (
                              <Square size={22} color="var(--text-subtle)" />
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.95rem', color: isSelected ? 'var(--primary-800)' : 'var(--text-main)' }}>
                                  {b.notice_nature}
                                </strong>
                                {b.bailiff_number && (
                                  <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontSize: '0.72rem' }}>
                                    رقم: {b.bailiff_number}
                                  </span>
                                )}
                              </div>

                              {/* Assignment status badge */}
                              {isSelected ? (
                                <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontWeight: '700', fontSize: '0.75rem' }}>
                                  ✓ مكلف به: {assigningBailiffMember.name}
                                </span>
                              ) : otherAssignee ? (
                                <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '0.75rem' }}>
                                  مكلف به: {otherAssignee.name}
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  غير مكلف
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.9rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              {b.client_name && <span><strong>الموكل:</strong> {b.client_name}</span>}
                              {b.court_name && <span><strong>المحكمة:</strong> {b.court_name}</span>}
                              {b.bailiff_office && <span><strong>قلم المحضرين:</strong> {b.bailiff_office}</span>}
                              {b.delivery_date && (
                                <span style={{ color: 'var(--primary-700)', fontWeight: '700' }}>
                                  تاريخ التسليم: {new Date(b.delivery_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                  المجموع: {selectedBailiffTaskIds.length} ورقة محضرين مكلفة
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setAssigningBailiffMember(null)}>
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSavingBailiffAssignments}
                    onClick={handleSaveBailiffAssignments}
                  >
                    {isSavingBailiffAssignments ? 'جاري الحفظ...' : `حفظ وتحديث التكليف (${selectedBailiffTaskIds.length})`}
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
                      fontSize: '0.85rem' 
                    }}>
                      <span>🇪🇬</span>
                      <span>+20</span>
                    </span>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="010XXXXXXXX"
                      style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0', textAlign: 'left', direction: 'ltr' }}
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                    />
                  </div>
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
                      fontSize: '0.85rem' 
                    }}>
                      <span>🇪🇬</span>
                      <span>+20</span>
                    </span>
                    <input 
                      type="tel" 
                      className="form-input" 
                      style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0', textAlign: 'left', direction: 'ltr' }}
                      value={editingMember.phone || ''} 
                      onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })} 
                    />
                  </div>
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
