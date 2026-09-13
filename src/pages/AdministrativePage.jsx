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
  ListFilter
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES } from '../lib/supabase';

export default function AdministrativePage() {
  const { adminTasks, clients, team, addAdminTask, updateAdminTask, deleteAdminTask, toggleAdminTaskStatus } = useData();

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' | 'completed' | 'all'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form Fields
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [executionDate, setExecutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [requirements, setRequirements] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Open modal for new task
  const handleOpenNew = () => {
    setEditingTask(null);
    setClientId('');
    setTitle('');
    setExecutionDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setRequirements('');
    setNotes('');
    setAssignedTo('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (task) => {
    setEditingTask(task);
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
        client_id: clientId || null,
        client_name: clientObj ? clientObj.name : null,
        execution_date: executionDate,
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
      alert('خطأ أثناء حفظ العمل الإداري: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العمل الإداري نهائياً؟')) {
      await deleteAdminTask(id);
    }
  };

  // Filter Tasks
  const query = searchTerm.toLowerCase().trim();
  const filteredTasks = adminTasks.filter(task => {
    // Status filter
    if (filterStatus === 'pending' && task.status === 'completed') return false;
    if (filterStatus === 'completed' && task.status !== 'completed') return false;

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
  const pendingCount = adminTasks.filter(t => t.status !== 'completed').length;
  const completedCount = adminTasks.filter(t => t.status === 'completed').length;
  const totalCount = adminTasks.length;

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
              الإدارة والمعاملات الخارجية
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            الأعمال الإدارية
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
          <span>إضافة</span>
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
            placeholder="ابحث عن عمل، موكل، أو مكان تنفيذ..."
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
            border: filterStatus === 'pending' ? '1.5px solid var(--primary-700)' : '1px solid var(--border-color)',
            background: filterStatus === 'pending' ? 'var(--primary-800)' : 'var(--bg-card)',
            color: filterStatus === 'pending' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'pending' ? '0 3px 10px rgba(55, 4, 10, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('pending')}
        >
          <Clock size={16} />
          <span>قيد التنفيذ</span>
          <span style={{
            background: filterStatus === 'pending' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {pendingCount}
          </span>
        </button>

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
          <span>مكتمل</span>
          <span style={{
            background: filterStatus === 'completed' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {completedCount}
          </span>
        </button>

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
        <span>عدد الأعمال الإدارية المعروضة</span>
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
            حاول تغيير الفلتر أو البحث عن شيء آخر، أو أضف عملاً إدارياً جديداً للمكتب.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))', gap: '1rem' }}>
          {filteredTasks.map(task => {
            const isDone = task.status === 'completed';
            const assignedMember = team.find(m => m.id === task.assigned_to);

            return (
              <div
                key={task.id}
                style={{
                  background: 'var(--bg-card)',
                  border: isDone ? '1px solid #dcfce7' : '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.2rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  position: 'relative',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Card Top: Client badge & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card-subtle)', padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    <User size={13} color="var(--primary-700)" />
                    <span>{task.client_name || 'بدون موكل محدد'}</span>
                  </div>

                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    background: isDone ? '#f0fdf4' : 'var(--primary-50)',
                    color: isDone ? '#15803d' : 'var(--primary-800)',
                    border: isDone ? '1px solid #bbf7d0' : '1px solid var(--primary-100)'
                  }}>
                    {isDone ? <Check size={12} strokeWidth={3} /> : <Clock size={12} />}
                    <span>{isDone ? 'مكتمل' : 'قيد التنفيذ'}</span>
                  </span>
                </div>

                {/* Task Title */}
                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: '800', color: isDone ? 'var(--text-muted)' : 'var(--text-main)', margin: '0 0 0.35rem', textDecoration: isDone ? 'line-through' : 'none' }}>
                    {task.title}
                  </h3>
                </div>

                {/* Key Details: Date & Location */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem', background: 'var(--bg-card-subtle)', padding: '0.75rem 0.9rem', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                    <Calendar size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                    <span><strong>تاريخ التنفيذ:</strong> {task.execution_date ? new Date(task.execution_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'غير محدد'}</span>
                  </div>

                  {task.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                      <MapPin size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                      <span><strong>المكان:</strong> {task.location}</span>
                    </div>
                  )}

                  {assignedMember && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                      <UserCheck size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                      <span><strong>المكلف:</strong> الأستاذ / {assignedMember.name}</span>
                    </div>
                  )}
                </div>

                {/* Requirements / المطلوب */}
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontStyle: 'italic', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem' }}>
                    ملاحظات: {task.notes}
                  </div>
                )}

                {/* Card Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: isDone ? '#fef2f2' : '#f0fdf4',
                      color: isDone ? '#dc2626' : '#16a34a',
                      border: isDone ? '1px solid #fecaca' : '1px solid #bbf7d0',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleAdminTaskStatus(task.id)}
                  >
                    {isDone ? <RotateCcw size={14} /> : <Check size={14} strokeWidth={3} />}
                    <span>{isDone ? 'إعادة للتنفيذ' : 'إتمام العمل'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      style={{ width: '32px', height: '32px', padding: 0 }}
                      title="تعديل العمل الإداري"
                      onClick={() => handleOpenEdit(task)}
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      style={{ width: '32px', height: '32px', padding: 0 }}
                      title="حذف"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT ADMINISTRATIVE TASK MODAL (MATCHING SCREENSHOT 2)              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '620px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}
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
                {/* SECTION 1: بيانات الموكل */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    <User size={16} color="var(--primary-700)" />
                    <span>بيانات الموكل (اختياري)</span>
                  </div>

                  <select
                    className="form-select"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '0.65rem 0.9rem', fontSize: '0.92rem' }}
                  >
                    <option value="">-- اضغط لاختيار الموكل من السجل... --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
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
                        placeholder="مثال: استخراج شهادة ميلاد، تقديم طلب شهادة، قيد إعلان..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <FileText size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* تاريخ التنفيذ */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>تاريخ التنفيذ *</label>
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
                    <label className="form-label" style={{ fontWeight: '700' }}>مكان التنفيذ (الجهة / المحكمة / القسم)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="مثال: محكمة الأسرة، قسم الشرطة، الشهر العقاري، السجل المدني..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <MapPin size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* المطلوب */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>المطلوب (الأوراق أو الإجراءات المطلوبة) *</label>
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
                      placeholder="أي ملاحظات إضافية أو تعليمات للمحامي المنفذ..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* المكلف بالتنفيذ */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserCheck size={15} color="var(--primary-700)" />
                      <span>تكليف عضو من الفريق بالمتابعة والتنفيذ</span>
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
