import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, AlertTriangle, RotateCcw, Ban } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Select from './Select';
import DateInput from './DateInput';

export const ADMIN_TASK_STATUSES = {
  pending: {
    key: 'pending',
    label: 'قيد الانتظار',
    color: 'var(--status-settled)',
    bg: 'var(--status-settled-bg)',
    border: 'transparent',
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
    color: 'var(--status-adjourned)',
    bg: 'var(--status-adjourned-bg)',
    border: 'transparent',
    icon: AlertTriangle
  },
  waiting: {
    key: 'waiting',
    label: 'بانتظار إجراء',
    color: 'var(--status-reserved)',
    bg: 'var(--status-reserved-bg)',
    border: 'transparent',
    icon: RotateCcw
  },
  completed: {
    key: 'completed',
    label: 'تم التنفيذ',
    color: 'var(--success)',
    bg: 'var(--success-bg)',
    border: 'transparent',
    icon: CheckCircle2
  },
  cancelled: {
    key: 'cancelled',
    label: 'إلغاء',
    color: 'var(--status-dismissed)',
    bg: 'var(--status-dismissed-bg)',
    border: 'transparent',
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

  const noteLabel = {
    postponed: 'سبب التأجيل (إلزامي)',
    completed: 'ما تم تنفيذه (إلزامي)',
    cancelled: 'سبب الإلغاء (إلزامي)',
    waiting: 'ما الذي تنتظره المهمة (إلزامي)',
  }[newStatus] || 'ملاحظات التحديث';

  const notePlaceholder = {
    postponed: 'تم التواصل مع الخبير وطلب التأجيل لعدم ورود ملف القضية',
    completed: 'تم استلام أصل تقرير الخبير وتسليمه للمحامي المسؤول',
    cancelled: 'ألغي الإجراء لانتفاء الحاجة بتوجيه من المحامي',
    waiting: 'سُددت أمانة الخبير وبانتظار تحديد موعد المعاينة',
  }[newStatus] || 'اكتب ما تم من إجراءات ليُسجل في السجل';

  return (
    <div className="modal-backdrop update-backdrop" onClick={onClose}>
      <div className="modal-dialog task-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>تحديث العمل الإداري</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body task-form-body">
          <div className="update-summary">
            <div className="update-summary-top">
              <strong>{task.title}</strong>
              <span className="status-chip" style={{ '--dot': currentStatusObj.color }}>
                {currentStatusObj.label}
              </span>
            </div>
            <dl className="facts facts-flat update-facts">
              <div><dt>القضية</dt><dd>{relatedCase ? `دعوى ${relatedCase.case_number}/${relatedCase.case_year}` : 'عمل عام'}</dd></div>
              <div><dt>الموكل</dt><dd>{task.client_name || 'غير محدد'}</dd></div>
              <div><dt>المسؤول</dt><dd>{currentAssignedMember ? `أ/ ${currentAssignedMember.name}` : 'غير مسند'}</dd></div>
              <div><dt>الموعد الحالي</dt><dd>{currentDateFormatted}</dd></div>
            </dl>
          </div>

          {errorMessage && (
            <div className="auth-alert is-error" role="alert">{errorMessage}</div>
          )}

          <form onSubmit={handleSubmit} className="task-form-fields">
            <div className="form-group">
              <label className="form-label">حالة المهمة بعد التحديث</label>
              <div className="status-choices" role="radiogroup">
                {Object.values(ADMIN_TASK_STATUSES).map((st) => {
                  const isSelected = newStatus === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`status-choice ${isSelected ? 'is-selected' : ''}`}
                      style={isSelected ? { '--choice': st.color, '--choice-bg': st.bg } : undefined}
                      onClick={() => handleStatusSelect(st.key)}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {newStatus === 'postponed' && (
              <p className="update-hint">عند التأجيل يلزم تحديد موعد المتابعة القادم، ويُحفظ الموعد القديم في السجل تلقائياً.</p>
            )}

            <div className="form-row">
            <div className="form-group">
              <div className="update-date-head">
                <label className="form-label">
                  موعد المتابعة القادم
                  {newStatus === 'postponed' && <span className="update-required"> (إلزامي)</span>}
                </label>
                {newStatus !== 'postponed' && (
                  <label className="update-inline-check">
                    <input type="checkbox" checked={clearDueDate} onChange={(e) => setClearDueDate(e.target.checked)} />
                    <span>بدون موعد</span>
                  </label>
                )}
              </div>
              {!clearDueDate && (
                <DateInput
                  value={newDueDate}
                  onChange={(e) => {
                    setNewDueDate(e.target.value);
                    setClearDueDate(false);
                  }}
                  className={`form-input ${newStatus === 'postponed' && !newDueDate ? 'is-invalid' : ''}`} />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">المسؤول عن المتابعة</label>
              <Select value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)} className="form-select">
                <option value="">بدون تكليف محدد</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    الأستاذ / {member.name} {member.role ? `(${member.role})` : ''}
                  </option>
                ))}
              </Select>
              {newAssignedTo && task.assigned_to && newAssignedTo !== task.assigned_to && (
                <span className="hint">ستُسجَّل إعادة الإسناد في سجل المهمة.</span>
              )}
            </div>
            </div>

            <div className="form-group">
              <label className="form-label">{noteLabel}</label>
              <textarea
                rows={3}
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder={notePlaceholder}
                className="form-textarea"
              />
            </div>

            <div className="update-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>إلغاء</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'جارٍ الحفظ…' : 'حفظ التحديث'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
