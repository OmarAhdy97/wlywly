import React, { useState } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Briefcase,
  Calendar,
  MapPin,
  FileText,
  User,
  UserCheck,
  Edit3,
  Trash2,
  X,
  RotateCcw,
  Check,
  ChevronLeft,
  FileCheck,
  FolderX,
  Mic,
  ListFilter,
  AlertTriangle,
  Ban,
  History,
  Scale,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES } from '../lib/supabase';
import AdministrativeTaskUpdateModal, { ADMIN_TASK_STATUSES } from '../components/common/AdministrativeTaskUpdateModal';

export default function AdministrativePage() {
  const {
    adminTasks,
    adminTaskUpdates,
    clients,
    cases,
    team,
    officeProfile,
    addAdminTask,
    updateAdminTask,
    deleteAdminTask,
    toggleAdminTaskStatus
  } = useData();

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' | 'postponed' | 'waiting' | 'completed' | 'cancelled' | 'all'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToUpdate, setTaskToUpdate] = useState(null); // For AdministrativeTaskUpdateModal

  // Expandable Timeline State per Card
  const [expandedHistoryTaskIds, setExpandedHistoryTaskIds] = useState(new Set());

  // Form Fields for Add/Edit Basic Task
  const [caseId, setCaseId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [executionDate, setExecutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [requirements, setRequirements] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Toggle History View for a specific task
  const toggleTaskHistory = (taskId) => {
    setExpandedHistoryTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Open modal for new task
  const handleOpenNew = () => {
    setEditingTask(null);
    setCaseId('');
    setClientId('');
    setTitle('');
    setExecutionDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setRequirements('');
    setNotes('');
    setAssignedTo('');
    setIsModalOpen(true);
  };

  // Open modal for editing basic task data
  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setCaseId(task.case_id || '');
    setClientId(task.client_id || '');
    setTitle(task.title || '');
    setExecutionDate(task.execution_date ? task.execution_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setLocation(task.location || '');
    setRequirements(task.requirements || '');
    setNotes(task.notes || '');
    setAssignedTo(task.assigned_to || '');
    setIsModalOpen(true);
  };

  const handleResetForm = () => {
    setCaseId('');
    setClientId('');
    setTitle('');
    setExecutionDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setRequirements('');
    setNotes('');
    setAssignedTo('');
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('يرجى إدخال عنوان العمل الإداري');
      return;
    }

    setIsSaving(true);
    try {
      const clientObj = clients.find(c => c.id === clientId);
      const taskData = {
        title: title.trim(),
        case_id: caseId || null,
        client_id: clientId || null,
        client_name: clientObj ? clientObj.name : null,
        execution_date: executionDate || null,
        location: location.trim() || null,
        requirements: requirements.trim() || null,
        notes: notes.trim() || null,
        assigned_to: assignedTo || null,
      };

      if (editingTask) {
        await updateAdminTask(editingTask.id, taskData);
      } else {
        await addAdminTask(taskData);
      }

      setIsModalOpen(false);
      handleResetForm();
    } catch (err) {
      alert('خطأ أثناء حفظ العمل الإداري: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العمل الإداري وسجله نهائياً؟')) {
      await deleteAdminTask(id);
    }
  };

  // Filter Tasks
  const query = searchTerm.toLowerCase().trim();
  const filteredTasks = adminTasks.filter(task => {
    // Status filter
    const status = task.status || 'pending';
    if (filterStatus === 'active') {
      if (status === 'completed' || status === 'cancelled') return false;
    } else if (filterStatus === 'postponed') {
      if (status !== 'postponed') return false;
    } else if (filterStatus === 'waiting') {
      if (status !== 'waiting') return false;
    } else if (filterStatus === 'completed') {
      if (status !== 'completed') return false;
    } else if (filterStatus === 'cancelled') {
      if (status !== 'cancelled') return false;
    }

    // Search query
    if (!query) return true;
    return (
      (task.title && task.title.toLowerCase().includes(query)) ||
      (task.client_name && task.client_name.toLowerCase().includes(query)) ||
      (task.location && task.location.toLowerCase().includes(query)) ||
      (task.requirements && task.requirements.toLowerCase().includes(query)) ||
      (task.notes && task.notes.toLowerCase().includes(query))
    );
  });

  // Counts
  const activeCount = adminTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const postponedCount = adminTasks.filter(t => t.status === 'postponed').length;
  const waitingCount = adminTasks.filter(t => t.status === 'waiting').length;
  const completedCount = adminTasks.filter(t => t.status === 'completed').length;
  const cancelledCount = adminTasks.filter(t => t.status === 'cancelled').length;
  const totalCount = adminTasks.length;

  // Resolve actor name from ID
  const resolveActorName = (actorId) => {
    if (!actorId) return 'المسؤول';
    const member = team.find(m => m.id === actorId);
    if (member) return `أ/ ${member.name}`;
    if (officeProfile?.lawyer_name) return `أ/ ${officeProfile.lawyer_name}`;
    return 'المكتب';
  };

  const resolveAssigneeName = (id) => {
    if (!id) return 'غير محدد';
    const m = team.find(t => t.id === id);
    return m ? `أ/ ${m.name}` : 'غير محدد';
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
              الإدارة والمعاملات ومسار الأعمال الخارجية
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            الأعمال الإدارية ودورة حياة المتابعة
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
            onClick={handleOpenNew}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>إضافة عمل إداري</span>
          </button>
        </div>
      </div>

      {/* Action Bar (Search + Add Button) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{
            background: 'var(--primary-800)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '0.75rem 1.4rem',
            fontSize: '0.95rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(55, 4, 10, 0.25)',
            border: '1px solid var(--accent-gold)'
          }}
          onClick={handleOpenNew}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>إضافة عمل</span>
        </button>

        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          padding: '0 1rem',
          minHeight: '46px'
        }}>
          <Search size={18} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="ابحث عن عمل إداري، موكل، قضية، أو مكان تنفيذ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              fontSize: '0.92rem',
              color: 'var(--text-main)',
              border: 'none',
              outline: 'none',
              background: 'transparent'
            }}
          />
          <Mic size={17} style={{ color: 'var(--text-subtle)', opacity: 0.6, cursor: 'pointer', flexShrink: 0 }} />
        </div>
      </div>

      {/* Filter Tabs (Pills) */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 1. Active Tab */}
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            border: filterStatus === 'active' ? '1.5px solid var(--primary-700)' : '1px solid var(--border-color)',
            background: filterStatus === 'active' ? 'var(--primary-800)' : 'var(--bg-card)',
            color: filterStatus === 'active' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'active' ? '0 3px 10px rgba(55, 4, 10, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('active')}
        >
          <Clock size={16} />
          <span>قيد المتابعة والتنفيذ</span>
          <span style={{
            background: filterStatus === 'active' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {activeCount}
          </span>
        </button>

        {/* 2. Postponed Tab */}
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            border: filterStatus === 'postponed' ? '1.5px solid #ea580c' : '1px solid var(--border-color)',
            background: filterStatus === 'postponed' ? '#ea580c' : 'var(--bg-card)',
            color: filterStatus === 'postponed' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'postponed' ? '0 3px 10px rgba(234, 88, 12, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('postponed')}
        >
          <AlertTriangle size={16} />
          <span>المؤجلة</span>
          <span style={{
            background: filterStatus === 'postponed' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {postponedCount}
          </span>
        </button>

        {/* 3. Waiting Tab */}
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            border: filterStatus === 'waiting' ? '1.5px solid #7c3aed' : '1px solid var(--border-color)',
            background: filterStatus === 'waiting' ? '#7c3aed' : 'var(--bg-card)',
            color: filterStatus === 'waiting' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'waiting' ? '0 3px 10px rgba(124, 58, 237, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('waiting')}
        >
          <RotateCcw size={16} />
          <span>بانتظار إجراء</span>
          <span style={{
            background: filterStatus === 'waiting' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {waitingCount}
          </span>
        </button>

        {/* 4. Completed Tab */}
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            border: filterStatus === 'completed' ? '1.5px solid #16a34a' : '1px solid var(--border-color)',
            background: filterStatus === 'completed' ? '#16a34a' : 'var(--bg-card)',
            color: filterStatus === 'completed' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'completed' ? '0 3px 10px rgba(22, 163, 74, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('completed')}
        >
          <CheckCircle2 size={16} />
          <span>تم التنفيذ</span>
          <span style={{
            background: filterStatus === 'completed' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {completedCount}
          </span>
        </button>

        {/* 5. Cancelled Tab */}
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            border: filterStatus === 'cancelled' ? '1.5px solid #dc2626' : '1px solid var(--border-color)',
            background: filterStatus === 'cancelled' ? '#dc2626' : 'var(--bg-card)',
            color: filterStatus === 'cancelled' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'cancelled' ? '0 3px 10px rgba(220, 38, 38, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('cancelled')}
        >
          <Ban size={16} />
          <span>ملغاة</span>
          <span style={{
            background: filterStatus === 'cancelled' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {cancelledCount}
          </span>
        </button>

        {/* 6. All Tab */}
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            border: filterStatus === 'all' ? '1.5px solid var(--primary-700)' : '1px solid var(--border-color)',
            background: filterStatus === 'all' ? 'var(--primary-800)' : 'var(--bg-card)',
            color: filterStatus === 'all' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'all' ? '0 3px 10px rgba(55, 4, 10, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('all')}
        >
          <ListFilter size={16} />
          <span>الكل</span>
          <span style={{
            background: filterStatus === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {totalCount}
          </span>
        </button>
      </div>

      {/* Task Count indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: '600' }}>
        <span style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', padding: '0.15rem 0.6rem', borderRadius: '12px', fontWeight: '800' }}>
          {filteredTasks.length}
        </span>
        <span>أعمال إدارية معروضة</span>
      </div>

      {/* Task List or Empty State */}
      {filteredTasks.length === 0 ? (
        <div style={{
          padding: '4rem 1.5rem',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px dashed var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '1rem'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--bg-card-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-subtle)',
            marginBottom: '1.25rem',
            opacity: 0.6
          }}>
            <Briefcase size={38} strokeWidth={1.5} />
          </div>

          <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            لا توجد أعمال إدارية تطابق بحثك
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
            حاول تغيير تبويب الفلتر أو البحث عن شيء آخر، أو أضف عملاً إدارياً جديداً للمكتب.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'var(--primary-800)', borderRadius: '10px', padding: '0.6rem 1.4rem', fontWeight: '700' }}
            onClick={handleOpenNew}
          >
            <Plus size={16} />
            <span>إضافة عمل إداري جديد</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.1rem', alignItems: 'start' }}>
          {filteredTasks.map(task => {
            const isDone = task.status === 'completed';
            const isCancelled = task.status === 'cancelled';
            const assignedMember = team.find(m => m.id === task.assigned_to);
            const statusConfig = ADMIN_TASK_STATUSES[task.status] || ADMIN_TASK_STATUSES.pending;
            const StatusIcon = statusConfig.icon;
            const relatedCase = task.case_id ? cases.find(c => c.id === task.case_id) : null;

            // Audit history for this task
            const taskHistory = (adminTaskUpdates || [])
              .filter(u => u.admin_task_id === task.id)
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const isHistoryExpanded = expandedHistoryTaskIds.has(task.id);

            // Calculate how many times postponed
            const postponementCount = taskHistory.filter(u => u.action_type === 'postponed' || u.new_status === 'postponed').length;

            return (
              <div
                key={task.id}
                style={{
                  background: 'var(--bg-card)',
                  border: isDone ? '1px solid #dcfce7' : (isCancelled ? '1px solid #fee2e2' : '1px solid var(--border-color)'),
                  borderRadius: '14px',
                  padding: '1.2rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Card Top: Client & Case badge + Current Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {/* Client Name */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'var(--bg-card-subtle)',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: 'var(--text-main)'
                    }}>
                      <User size={13} color="var(--primary-700)" />
                      <span>{task.client_name || 'بدون موكل محدد'}</span>
                    </div>

                    {/* Related Case Badge if present */}
                    {relatedCase && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        border: '1px solid #bfdbfe'
                      }}>
                        <Scale size={13} />
                        <span>دعوى {relatedCase.case_number}/{relatedCase.case_year}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    background: statusConfig.bg,
                    color: statusConfig.color,
                    border: `1px solid ${statusConfig.border}`
                  }}>
                    <StatusIcon size={13} />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>

                {/* Task Title */}
                <div>
                  <h3 style={{
                    fontSize: '1.08rem',
                    fontWeight: '800',
                    color: isDone || isCancelled ? 'var(--text-muted)' : 'var(--text-main)',
                    margin: '0 0 0.2rem',
                    textDecoration: isDone || isCancelled ? 'line-through' : 'none'
                  }}>
                    {task.title}
                  </h3>
                </div>

                {/* Key Details: Current Follow-up Date, Assignee, Location */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  background: 'var(--bg-card-subtle)',
                  padding: '0.8rem 0.95rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {/* Current Follow-up Date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                      <Calendar size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                      <span>
                        <strong>المتابعة القادمة:</strong>{' '}
                        {task.execution_date
                          ? new Date(task.execution_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'بدون موعد محدد'}
                      </span>
                    </div>

                    {postponementCount > 0 && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        color: '#c2410c',
                        background: '#fff7ed',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #ffedd5'
                      }}>
                        تأجلت {postponementCount} {postponementCount === 1 ? 'مرة' : 'مرات'}
                      </span>
                    )}
                  </div>

                  {/* Assignee */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                    <UserCheck size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                    <span><strong>المسند إليه حالياً:</strong> {assignedMember ? `الأستاذ / ${assignedMember.name}` : 'غير مسند'}</span>
                  </div>

                  {/* Location */}
                  {task.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                      <MapPin size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                      <span><strong>المكان:</strong> {task.location}</span>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                {task.requirements && (
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: '1.45' }}>
                    <strong style={{ color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <FileCheck size={14} /> المطلوب:
                    </strong>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                      {task.requirements}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {task.notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontStyle: 'italic', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.35rem' }}>
                    ملاحظات: {task.notes}
                  </div>
                )}

                {/* Card Actions Toolbar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '0.7rem',
                  borderTop: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {/* Primary Button: تحديث */}
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'var(--primary-800)',
                        color: '#ffffff',
                        border: '1px solid var(--accent-gold)',
                        padding: '0.38rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.83rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(55, 4, 10, 0.15)'
                      }}
                      onClick={() => setTaskToUpdate(task)}
                    >
                      <Clock size={14} />
                      <span>تحديث</span>
                    </button>

                    {/* Secondary Button: عرض السجل */}
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: isHistoryExpanded ? 'var(--primary-50)' : 'var(--bg-card)',
                        color: isHistoryExpanded ? 'var(--primary-800)' : 'var(--text-main)',
                        border: isHistoryExpanded ? '1.5px solid var(--primary-600)' : '1px solid var(--border-color)',
                        padding: '0.38rem 0.8rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleTaskHistory(task.id)}
                    >
                      <History size={14} color="var(--primary-700)" />
                      <span>{isHistoryExpanded ? 'إخفاء السجل' : 'عرض السجل'}</span>
                      <span style={{
                        background: isHistoryExpanded ? 'var(--primary-200)' : 'var(--bg-card-subtle)',
                        color: 'var(--primary-800)',
                        fontSize: '0.72rem',
                        padding: '0.05rem 0.4rem',
                        borderRadius: '8px',
                        fontWeight: '800'
                      }}>
                        {taskHistory.length || 1}
                      </span>
                      {isHistoryExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Right side icon actions */}
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {/* Quick Toggle Done/Reopen */}
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: isDone ? '1px solid #fecaca' : '1px solid #bbf7d0',
                        background: isDone ? '#fef2f2' : '#f0fdf4',
                        color: isDone ? '#dc2626' : '#16a34a',
                        cursor: 'pointer'
                      }}
                      title={isDone ? 'إعادة المهمة للتنفيذ' : 'إتمام العمل بنجاح'}
                      onClick={() => toggleAdminTaskStatus(task.id)}
                    >
                      {isDone ? <RotateCcw size={14} /> : <Check size={14} strokeWidth={3} />}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
                      title="تعديل البيانات الأساسية"
                      onClick={() => handleOpenEdit(task)}
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
                      title="حذف"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* EXPANDABLE AUDIT TIMELINE SECTION (السجل الزمني الكامل للمهمة)             */}
                {/* ========================================================================= */}
                {isHistoryExpanded && (
                  <div style={{
                    marginTop: '0.4rem',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-card-subtle)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.45rem' }}>
                      <History size={15} color="var(--primary-700)" />
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        سجل التحديثات والحركات التاريخية ({taskHistory.length || 1})
                      </strong>
                    </div>

                    {/* Timeline List */}
                    <div style={{ position: 'relative', paddingRight: '16px' }}>
                      {/* Vertical connector line */}
                      <div style={{
                        position: 'absolute',
                        right: '5px',
                        top: '8px',
                        bottom: '8px',
                        width: '2px',
                        background: 'var(--border-color)',
                        borderRight: '1.5px dashed var(--border-subtle)'
                      }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {(taskHistory.length > 0 ? taskHistory : [
                          {
                            id: `init_${task.id}`,
                            action_type: 'created',
                            new_status: task.status || 'pending',
                            new_due_date: task.execution_date,
                            new_assigned_to: task.assigned_to,
                            update_text: task.requirements || 'تم إنشاء العمل الإداري',
                            created_at: task.created_at || new Date().toISOString(),
                            created_by: null
                          }
                        ]).map((item, idx) => {
                          const itemStatus = ADMIN_TASK_STATUSES[item.new_status] || ADMIN_TASK_STATUSES.pending;
                          const dateObj = new Date(item.created_at);
                          const dateStr = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
                          const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

                          let actionTitle = 'تحديث مسار العمل الإداري';
                          let actionColor = itemStatus.color;

                          if (item.action_type === 'created') {
                            actionTitle = 'تم إنشاء العمل الإداري والتكليف المبدئي';
                            actionColor = 'var(--primary-700)';
                          } else if (item.action_type === 'postponed' || item.new_status === 'postponed') {
                            actionTitle = 'تم تأجيل المتابعة';
                            actionColor = '#c2410c';
                          } else if (item.action_type === 'completed' || item.new_status === 'completed') {
                            actionTitle = 'تم إتمام العمل الإداري بنجاح';
                            actionColor = '#15803d';
                          } else if (item.action_type === 'reopened') {
                            actionTitle = 'إعادة فتح المهمة للتنفيذ';
                            actionColor = '#7c3aed';
                          } else if (item.action_type === 'cancelled' || item.new_status === 'cancelled') {
                            actionTitle = 'تم إلغاء العمل الإداري';
                            actionColor = '#dc2626';
                          } else if (item.action_type === 'reassigned') {
                            actionTitle = 'إعادة إسناد المهمة';
                            actionColor = '#0284c7';
                          }

                          return (
                            <div key={item.id || idx} style={{ position: 'relative' }}>
                              {/* Node Dot */}
                              <div style={{
                                position: 'absolute',
                                right: '-15px',
                                top: '4px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: actionColor,
                                border: '2px solid #ffffff',
                                boxShadow: `0 0 0 1.5px ${actionColor}`,
                                zIndex: 1
                              }} />

                              {/* Event Body */}
                              <div style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                padding: '0.65rem 0.8rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                                fontSize: '0.82rem'
                              }}>
                                {/* Header: Date/Time + Actor */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                                  <div style={{ fontWeight: '800', color: actionColor, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <span>{actionTitle}</span>
                                  </div>

                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                                    {dateStr} — {timeStr}
                                  </div>
                                </div>

                                {/* Status & Assignee transition */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.78rem' }}>
                                  {/* Status transition if provided */}
                                  {item.previous_status && item.previous_status !== item.new_status ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                                      <span>الحالة:</span>
                                      <span style={{ textDecoration: 'line-through' }}>{ADMIN_TASK_STATUSES[item.previous_status]?.label || item.previous_status}</span>
                                      <ArrowRight size={11} />
                                      <strong style={{ color: itemStatus.color }}>{itemStatus.label}</strong>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <span>الحالة:</span>
                                      <strong style={{ color: itemStatus.color }}>{itemStatus.label}</strong>
                                    </div>
                                  )}

                                  {/* Assignee transition if changed */}
                                  {item.previous_assigned_to !== item.new_assigned_to && item.new_assigned_to && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                                      <span>المسؤول:</span>
                                      {item.previous_assigned_to && (
                                        <>
                                          <span style={{ textDecoration: 'line-through' }}>{resolveAssigneeName(item.previous_assigned_to)}</span>
                                          <ArrowRight size={11} />
                                        </>
                                      )}
                                      <strong style={{ color: 'var(--primary-800)' }}>{resolveAssigneeName(item.new_assigned_to)}</strong>
                                    </div>
                                  )}
                                </div>

                                {/* Due date postponement info */}
                                {item.previous_due_date !== item.new_due_date && item.new_due_date && (
                                  <div style={{
                                    fontSize: '0.78rem',
                                    color: '#c2410c',
                                    background: '#fff7ed',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}>
                                    <Calendar size={12} />
                                    <span>
                                      المتابعة: {item.previous_due_date ? `كانت ${item.previous_due_date.split('T')[0]}` : 'لم تكن محددة'} ← <strong>الجديد: {item.new_due_date.split('T')[0]}</strong>
                                    </span>
                                  </div>
                                )}

                                {/* Notes / Reasons */}
                                {item.update_text && (
                                  <div style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--text-main)',
                                    background: 'var(--bg-card-subtle)',
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '6px',
                                    borderRight: `3px solid ${actionColor}`,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.4'
                                  }}>
                                    {item.update_text}
                                  </div>
                                )}

                                {/* Actor snapshot */}
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', textAlign: 'left', marginTop: '0.1rem' }}>
                                  بواسطة: {resolveActorName(item.created_by)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. UPDATE ADMINISTRATIVE TASK WORKFLOW MODAL                               */}
      {/* ========================================================================= */}
      <AdministrativeTaskUpdateModal
        isOpen={!!taskToUpdate}
        task={taskToUpdate}
        onClose={() => setTaskToUpdate(null)}
      />

      {/* ========================================================================= */}
      {/* 2. ADD / EDIT BASIC ADMINISTRATIVE TASK MODAL                              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  style={{ width: '34px', height: '34px', padding: 0, borderRadius: '8px' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  {editingTask ? 'تعديل العمل الإداري' : 'إضافة عمل إداري جديد'}
                </h3>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-icon"
                style={{ width: '34px', height: '34px', padding: 0, borderRadius: '8px' }}
                title="إعادة تعيين الحقول"
                onClick={handleResetForm}
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* SECTION 1: بيانات الموكل والقضية */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
                  {/* الموكل */}
                  <div>
                    <label className="form-label" style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User size={15} color="var(--primary-700)" />
                      <span>الموكل (اختياري)</span>
                    </label>
                    <select
                      className="form-select"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                    >
                      <option value="">-- بدون موكل محدد --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* القضية المرتبطة */}
                  <div>
                    <label className="form-label" style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Scale size={15} color="var(--primary-700)" />
                      <span>القضية المرتبطة (اختياري)</span>
                    </label>
                    <select
                      className="form-select"
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value)}
                      style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                    >
                      <option value="">-- عمل إداري عام غير مرتبط بدعوى --</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>
                          دعوى {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name || 'بدون مسمى'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECTION 2: تفاصيل العمل */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    <ClipboardList size={16} color="var(--primary-700)" />
                    <span>تفاصيل العمل</span>
                  </div>

                  {/* عنوان العمل الإداري */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>عنوان العمل الإداري *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="مثال: متابعة الخبير، استخراج شهادة، قيد صحيفة استئناف..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <FileText size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* تاريخ المتابعة / التنفيذ الأول */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>موعد المتابعة / التنفيذ الأولي *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={executionDate}
                        onChange={(e) => setExecutionDate(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <Calendar size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* مكان التنفيذ */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>مكان التنفيذ (الجهة / المحكمة / مكتب الخبراء)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="مثال: مكتب خبراء وزارة العدل، محكمة الأسرة، الشهر العقاري..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <MapPin size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* المطلوب */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>المطلوب (الإجراءات أو المستندات المطلوبة) *</label>
                    <textarea
                      required
                      className="form-textarea"
                      rows={3}
                      placeholder="اكتب الأوراق أو الإجراءات المطلوبة بالتفصيل..."
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                    />
                  </div>

                  {/* الملاحظات */}
                  <div className="form-group">
                    <label className="form-label">الملاحظات (اختياري)</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="أي ملاحظات إضافية أو تعليمات للمحامي المكلف..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* المكلف بالتنفيذ */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserCheck size={15} color="var(--primary-700)" />
                      <span>إسناد المهمة لمحامٍ أو عضو بالفريق</span>
                    </label>
                    <select
                      className="form-select"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                    >
                      <option value="">-- بدون تكليف محدد --</option>
                      {team.map(m => (
                        <option key={m.id} value={m.id}>
                          الأستاذ / {m.name} ({USER_ROLES[m.role] || m.role || 'محامي'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.4rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ borderRadius: '10px', padding: '0.6rem 1.5rem', fontWeight: '700' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{ background: 'var(--primary-800)', color: '#ffffff', borderRadius: '10px', padding: '0.6rem 1.6rem', fontWeight: '700', border: '1px solid var(--accent-gold)' }}
                >
                  {isSaving ? 'جاري الحفظ...' : (editingTask ? 'تحديث العمل الإداري' : 'حفظ العمل الإداري')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
