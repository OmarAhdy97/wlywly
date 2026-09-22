import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Ban,
  Calendar,
  UserCheck,
  FileText,
  Briefcase,
  User,
  ArrowRight,
  Info
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const ADMIN_TASK_STATUSES = {
  pending: {
    key: 'pending',
    label: 'قيد الانتظار',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    icon: Clock
  },
  in_progress: {
    key: 'in_progress',
    label: 'قيد التنفيذ',
    color: 'var(--primary-800)',
    bg: 'var(--primary-50)',
    border: 'var(--primary-200)',
    icon: Clock
  },
  postponed: {
    key: 'postponed',
    label: 'تأجيل',
    color: '#c2410c',
    bg: '#fff7ed',
    border: '#ffedd5',
    icon: AlertTriangle
  },
  waiting: {
    key: 'waiting',
    label: 'بانتظار إجراء',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: RotateCcw
  },
  completed: {
    key: 'completed',
    label: 'تم التنفيذ',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: CheckCircle2
  },
  cancelled: {
    key: 'cancelled',
    label: 'إلغاء',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: Ban
  }
};

export default function AdministrativeTaskUpdateModal({
  isOpen,
  task,
  onClose,
  onSuccess
}) {
  const { team, cases, updateAdminTaskWorkflow } = useData();

  const [newStatus, setNewStatus] = useState('in_progress');
  const [newDueDate, setNewDueDate] = useState('');
  const [clearDueDate, setClearDueDate] = useState(false);
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (task) {
      setNewStatus(task.status || 'in_progress');
      setNewDueDate(task.execution_date ? task.execution_date.split('T')[0] : '');
      setClearDueDate(false);
      setNewAssignedTo(task.assigned_to || '');
      setUpdateText('');
      setErrorMessage('');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const currentStatusObj = ADMIN_TASK_STATUSES[task.status] || ADMIN_TASK_STATUSES.pending;
  const currentAssignedMember = team.find(m => m.id === task.assigned_to);
  const relatedCase = task.case_id ? cases.find(c => c.id === task.case_id) : null;

  const currentDateFormatted = task.execution_date
    ? new Date(task.execution_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'غير محدد';

  const handleStatusSelect = (statusKey) => {
    setNewStatus(statusKey);
    setErrorMessage('');
    if (statusKey === 'postponed' && clearDueDate) {
      setClearDueDate(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation 1: Postponement requires mandatory next follow-up date
    if (newStatus === 'postponed') {
      if (!newDueDate || clearDueDate) {
        setErrorMessage('عند اختيار "تأجيل"، يلزم تحديد موعد المتابعة القادم بدقة.');
        return;
      }
      if (!updateText.trim()) {
        setErrorMessage('يرجى كتابة سبب التأجيل في خانة الملاحظات / التفاصيل.');
        return;
      }
    }

    // Validation 2: Completion requires a completion note/detail
    if (newStatus === 'completed') {
      if (!updateText.trim()) {
        setErrorMessage('يرجى توثيق تفاصيل إتمام المهمة (ما تم تنفيذه واستلامه).');
        return;
      }
    }

    // Validation 3: Cancellation requires reason
    if (newStatus === 'cancelled') {
      if (!updateText.trim()) {
        setErrorMessage('يرجى ذكر سبب إلغاء العمل الإداري.');
        return;
      }
    }

    // Validation 4: Waiting status requires note
    if (newStatus === 'waiting' && !updateText.trim()) {
      setErrorMessage('يرجى تحديد ما الذي تنتظره المهمة (مثل: بانتظار ورود تقرير الخبراء).');
      return;
    }

    // Validation 5: Check if any actual change occurred
    const statusChanged = (task.status || 'pending') !== newStatus;
    const currentTaskDate = task.execution_date ? task.execution_date.split('T')[0] : '';
    const dateChanged = clearDueDate ? !!currentTaskDate : (newDueDate !== currentTaskDate);
    const assigneeChanged = (task.assigned_to || '') !== (newAssignedTo || '');
    const hasNote = !!updateText.trim();

    if (!statusChanged && !dateChanged && !assigneeChanged && !hasNote) {
      setErrorMessage('لم يتم إجراء أي تغيير أو إدخال ملاحظات جديدة لتسجيلها في السجل.');
      return;
    }

    setIsSaving(true);
    try {
      await updateAdminTaskWorkflow({
        taskId: task.id,
        newStatus,
        updateText: updateText.trim(),
        newDueDate: clearDueDate ? null : (newDueDate || null),
        isDueDateCleared: clearDueDate,
        newAssignedTo: newAssignedTo || null
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء حفظ التحديث: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-dialog"
        style={{
          maxWidth: '640px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                border: '1px solid var(--accent-gold)'
              }}
            >
              <Clock size={19} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                تحديث مسار وسجل العمل الإداري
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                تسجيل حركة جديدة في السجل الزمني وحفظ التعديلات الحالية
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            style={{ borderRadius: '8px', width: '34px', height: '34px', padding: 0 }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            overflowY: 'auto',
            padding: '1.2rem 1.4rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem'
          }}
        >
          {/* 1. Context Summary Card (المهمة الحالية ومحدداتها لمنع الالتباس) */}
          <div
            style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary-700)', textTransform: 'uppercase' }}>
                  موضوع العمل الإداري
                </span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0.15rem 0 0', color: 'var(--text-main)' }}>
                  {task.title}
                </h4>
              </div>

              {/* Current Status Pill */}
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.7rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  background: currentStatusObj.bg,
                  color: currentStatusObj.color,
                  border: `1px solid ${currentStatusObj.border}`
                }}
              >
                <span>الحالة الحالية: {currentStatusObj.label}</span>
              </span>
            </div>

            {/* Context Grid: Case, Client, Assignee, Current Due Date */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.65rem',
                fontSize: '0.82rem',
                borderTop: '1px dashed var(--border-subtle)',
                paddingTop: '0.55rem',
                color: 'var(--text-main)'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>القضية المرتبطة:</span>
                <strong>{relatedCase ? `دعوى ${relatedCase.case_number}/${relatedCase.case_year}` : 'عمل إداري عام'}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>الموكل:</span>
                <strong>{task.client_name || 'غير محدد'}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>المسؤول الحالي:</span>
                <strong>{currentAssignedMember ? `أ/ ${currentAssignedMember.name}` : 'غير مسند'}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>الموعد الحالي:</span>
                <strong style={{ color: task.execution_date ? 'var(--primary-800)' : 'var(--text-muted)' }}>
                  {currentDateFormatted}
                </strong>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.86rem',
                color: '#dc2626',
                fontWeight: '700'
              }}
            >
              <AlertTriangle size={17} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 2. Status Selector (ما تحديث المهمة؟) */}
            <div>
              <label style={{ display: 'block', fontWeight: '800', fontSize: '0.92rem', marginBottom: '0.55rem', color: 'var(--text-main)' }}>
                ما هو تحديث حالة المهمة الآن؟
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: '0.5rem'
                }}
              >
                {Object.values(ADMIN_TASK_STATUSES).map((st) => {
                  const isSelected = newStatus === st.key;
                  const Icon = st.icon;

                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => handleStatusSelect(st.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '10px',
                        fontSize: '0.86rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${st.color}` : '1px solid var(--border-color)',
                        background: isSelected ? st.bg : 'var(--bg-card)',
                        color: isSelected ? st.color : 'var(--text-main)',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} color={st.color} style={{ flexShrink: 0 }} />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Notice for Postponement */}
            {newStatus === 'postponed' && (
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #ffedd5',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  color: '#c2410c'
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>
                  تنبيه: عند اختيار <strong>تأجيل</strong>، يلزم إدخال موعد المتابعة القادم وسيتم حفظ الموعد القديم في السجل التاريخي تلقائياً.
                </span>
              </div>
            )}

            {/* 3. Follow-up Date Row */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                background: 'var(--bg-card-subtle)',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={16} color="var(--primary-700)" />
                  <span>موعد المتابعة القادم:</span>
                  {newStatus === 'postponed' && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>(مطلوب إلزامي)</span>
                  )}
                </label>

                {newStatus !== 'postponed' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={clearDueDate}
                      onChange={(e) => setClearDueDate(e.target.checked)}
                    />
                    <span>بدون موعد متابعة</span>
                  </label>
                )}
              </div>

              {!clearDueDate && (
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => {
                    setNewDueDate(e.target.value);
                    setClearDueDate(false);
                  }}
                  className="form-control"
                  style={{
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: newStatus === 'postponed' && !newDueDate ? '1.5px solid #dc2626' : '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                  }}
                />
              )}
            </div>

            {/* 4. Reassignment Row (إسناد إلى / تغيير المسؤول) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}
            >
              <label style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserCheck size={16} color="var(--primary-700)" />
                <span>المسؤول المكلف بالمتابعة:</span>
              </label>

              <select
                value={newAssignedTo}
                onChange={(e) => setNewAssignedTo(e.target.value)}
                className="form-control"
                style={{
                  padding: '0.6rem 0.8rem',
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              >
                <option value="">بدون تكليف محدد</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    الأستاذ / {member.name} {member.role ? `(${member.role})` : ''}
                  </option>
                ))}
              </select>

              {newAssignedTo && task.assigned_to && newAssignedTo !== task.assigned_to && (
                <div style={{ fontSize: '0.78rem', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                  <ArrowRight size={13} />
                  <span>سيتم تسجيل إعادة الإسناد في السجل التاريخي للمهمة.</span>
                </div>
              )}
            </div>

            {/* 5. Update Notes / Details (تفاصيل التحديث / سبب التأجيل / تقرير الإتمام) */}
            <div>
              <label style={{ display: 'block', fontWeight: '800', fontSize: '0.88rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                {newStatus === 'postponed'
                  ? 'سبب التأجيل وتفاصيل المتابعة (إلزامي):'
                  : newStatus === 'completed'
                  ? 'تفاصيل وملاحظات إتمام العمل (إلزامي):'
                  : newStatus === 'cancelled'
                  ? 'سبب إلغاء المهمة (إلزامي):'
                  : newStatus === 'waiting'
                  ? 'تفاصيل ما تنتظره المهمة (إلزامي):'
                  : 'ملاحظات وتفاصيل التحديث:'}
              </label>

              <textarea
                rows={3}
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder={
                  newStatus === 'postponed'
                    ? 'مثال: تم التواصل مع الخبير وطلب التأجيل لعدم ورود ملف القضية...'
                    : newStatus === 'completed'
                    ? 'مثال: تم استلام أصل تقرير الخبير وتسليمه للمحامي المسؤول بالملف...'
                    : newStatus === 'cancelled'
                    ? 'مثال: تم إلغاء الإجراء لانتفاء الحاجة بناءً على توجيه المحامي...'
                    : newStatus === 'waiting'
                    ? 'مثال: تم سداد أمانة الخبير وبانتظار تحديد موعد المعاينة من مكتب الخبراء...'
                    : 'اكتب أي ملاحظات أو إجراءات تمت لتسجيلها في السجل التاريخي...'
                }
                className="form-control"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Modal Actions Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.65rem',
                marginTop: '0.5rem',
                paddingTop: '0.9rem',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSaving}
                style={{ borderRadius: '8px', padding: '0.55rem 1.2rem', fontWeight: '700' }}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
                style={{
                  background: 'var(--primary-800)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '0.55rem 1.4rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  border: '1px solid var(--accent-gold)'
                }}
              >
                {isSaving ? (
                  <span>جاري الحفظ...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>حفظ التحديث وتوثيق السجل</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
