import RowAction, { RowActions } from '../components/common/RowAction';
import React, { useState } from 'react';
import { Plus, Search, Edit3, Trash2, X, RotateCcw, Check, Clock, ArrowRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES } from '../lib/supabase';
import AdministrativeTaskUpdateModal, { ADMIN_TASK_STATUSES } from '../components/common/AdministrativeTaskUpdateModal';
import { confirmDialog, notify } from '../lib/dialog';
import Select from '../components/common/Select';
import DateInput from '../components/common/DateInput';
import { formatEgyptPhone } from '../lib/phone';

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
  const [detailTaskId, setDetailTaskId] = useState(null);

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
      notify('يرجى إدخال عنوان العمل الإداري', 'warn');
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
      notify('خطأ أثناء حفظ العمل الإداري: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (await confirmDialog('هل أنت متأكد من حذف هذا العمل الإداري وسجله نهائياً؟', { danger: true, confirmLabel: 'حذف' })) {
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
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>الأعمال الإدارية</h1>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={handleOpenNew}>
            <Plus size={16} />
            <span>إضافة عمل إداري</span>
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="fin-search page-search">
          <Search size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="عمل إداري، موكل، مكان التنفيذ"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="seg-tabs">
          {[
            { id: 'active', label: 'قيد المتابعة', count: activeCount },
            { id: 'postponed', label: 'المؤجلة', count: postponedCount },
            { id: 'waiting', label: 'بانتظار إجراء', count: waitingCount },
            { id: 'completed', label: 'تم التنفيذ', count: completedCount },
            { id: 'cancelled', label: 'ملغاة', count: cancelledCount },
            { id: 'all', label: 'الكل', count: totalCount },
          ].map(t => (
            <button key={t.id} type="button" className={`seg-tab ${filterStatus === t.id ? 'is-active' : ''}`} onClick={() => setFilterStatus(t.id)}>
              <span>{t.label}</span>
              <span className="seg-count">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="card empty-block">
          <h3>لا توجد أعمال إدارية مطابقة</h3>
          <p>غيّر الفلتر أو البحث، أو أضف عملاً إدارياً جديداً.</p>
          <button type="button" className="btn btn-primary empty-block-action" onClick={handleOpenNew}>
            <Plus size={16} /> إضافة عمل إداري
          </button>
        </div>
      ) : (
        <div className="card row-list">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const isCancelled = task.status === 'cancelled';
            const assignedMember = team.find((m) => m.id === task.assigned_to);
            const statusConfig = ADMIN_TASK_STATUSES[task.status] || ADMIN_TASK_STATUSES.pending;
            const relatedCase = task.case_id ? cases.find((c) => c.id === task.case_id) : null;

            const taskHistory = (adminTaskUpdates || [])
              .filter((u) => u.admin_task_id === task.id)
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const isDetailOpen = detailTaskId === task.id;
            const postponementCount = taskHistory.filter((u) => u.action_type === 'postponed' || u.new_status === 'postponed').length;

            const historyItems = taskHistory.length > 0 ? taskHistory : [{
              id: `init_${task.id}`,
              action_type: 'created',
              new_status: task.status || 'pending',
              update_text: task.requirements || 'تم إنشاء العمل الإداري',
              created_at: task.created_at || new Date().toISOString(),
              created_by: null,
            }];

            return (
              <article key={task.id} className={`list-row ${isDone ? 'is-done' : ''} ${isCancelled ? 'is-cancelled' : ''}`}>
                <div className="list-row-main">
                  <div className="list-row-body is-clickable" onClick={() => setDetailTaskId(task.id)}>
                    <div className="list-row-top">
                      <h3 className="row-title"><span className="row-title-text" title={task.title}>{task.title}</span></h3>
                      <span className="status-chip" style={{ '--dot': statusConfig.color }}>{statusConfig.label}</span>
                    </div>
                    <p className="list-row-sub">
                      {[
                        task.client_name || 'بدون موكل',
                        relatedCase ? `دعوى ${relatedCase.case_number}/${relatedCase.case_year}` : null,
                        task.location,
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {(task.requirements || task.notes) && (
                      <p className="list-row-text">
                        {task.requirements}
                        {task.requirements && task.notes ? ' — ' : ''}
                        {task.notes && <span className="list-row-note">{task.notes}</span>}
                      </p>
                    )}
                  </div>

                  <dl className="list-row-facts">
                    <div>
                      <dt>المتابعة</dt>
                      <dd>
                        {task.execution_date
                          ? new Date(task.execution_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
                          : 'بدون موعد'}
                        {postponementCount > 0 && <span className="task-postponed">تأجلت {postponementCount}×</span>}
                      </dd>
                    </div>
                    <div>
                      <dt>المسؤول</dt>
                      <dd className="row-owner">
                        {assignedMember ? (
                          <>
                            
                            {assignedMember.name}
                          </>
                        ) : <span className="cell-sub">غير مسند</span>}
                      </dd>
                    </div>
                  </dl>

                  <div className="list-row-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTaskToUpdate(task)}>
                      <Clock size={14} /> تحديث
                    </button>
                    <RowActions>
                      <RowAction
                        icon={isDone ? RotateCcw : Check}
                        label={isDone ? 'إعادة المهمة للتنفيذ' : 'إتمام العمل'}
                        tone={isDone ? undefined : 'primary'}
                        onClick={async () => { try { await toggleAdminTaskStatus(task.id); } catch (err) { notify(err.message); } }}
                      />
                      <RowAction icon={Edit3} label="تعديل" onClick={() => handleOpenEdit(task)} />
                      <RowAction icon={Trash2} label="حذف" tone="danger" onClick={() => handleDelete(task.id)} />
                    </RowActions>
                  </div>
                </div>

                {isDetailOpen && (
                  <div className="modal-backdrop" onClick={() => setDetailTaskId(null)}>
                    <div className="modal-dialog task-detail-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <div className="case-dialog-title">
                          <h3>{task.title}</h3>
                          <span className="status-chip" style={{ '--dot': statusConfig.color }}>{statusConfig.label}</span>
                        </div>
                        <button type="button" className="icon-btn" onClick={() => setDetailTaskId(null)} aria-label="إغلاق">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="modal-body">
                        <dl className="facts">
                          {[
                            ['الموكل', task.client_name],
                            ['القضية', relatedCase ? `دعوى ${relatedCase.case_number}/${relatedCase.case_year}` : 'عمل عام'],
                            ['المكان', task.location],
                            ['المتابعة القادمة', task.execution_date ? new Date(task.execution_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'بدون موعد'],
                            ['المسؤول', assignedMember ? `الأستاذ / ${assignedMember.name}` : 'غير مسند'],
                            ['مرات التأجيل', postponementCount ? String(postponementCount) : ''],
                          ].filter(([, v]) => v).map(([k, v]) => (
                            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                          ))}
                        </dl>
                        {task.requirements && <p className="task-detail-text"><b>المطلوب:</b> {task.requirements}</p>}
                        {task.notes && <p className="task-detail-text is-muted"><b>ملاحظات:</b> {task.notes}</p>}

                        <div className="case-dialog-actions">
                          <button type="button" className="btn btn-primary" onClick={() => { setDetailTaskId(null); setTaskToUpdate(task); }}>
                            <Clock size={16} /> تحديث
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => { setDetailTaskId(null); handleOpenEdit(task); }}>
                            <Edit3 size={16} /> تعديل
                          </button>
                        </div>

                        <h4 className="task-detail-heading">السجل ({historyItems.length})</h4>
                  <ol className="tl task-history">
                    {historyItems.map((item, idx) => {
                      const itemStatus = ADMIN_TASK_STATUSES[item.new_status] || ADMIN_TASK_STATUSES.pending;
                      const dateObj = new Date(item.created_at);
                      const when = `${dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })} — ${dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;

                      let title = 'تحديث مسار العمل';
                      let tone = 'settled';
                      if (item.action_type === 'created') { title = 'إنشاء العمل الإداري'; tone = 'prelim'; }
                      else if (item.action_type === 'postponed' || item.new_status === 'postponed') { title = 'تأجيل المتابعة'; tone = 'adjourned'; }
                      else if (item.action_type === 'completed' || item.new_status === 'completed') { title = 'إتمام العمل'; tone = 'active'; }
                      else if (item.action_type === 'reopened') { title = 'إعادة فتح المهمة'; tone = 'reserved'; }
                      else if (item.action_type === 'cancelled' || item.new_status === 'cancelled') { title = 'إلغاء العمل'; tone = 'dismissed'; }
                      else if (item.action_type === 'reassigned') { title = 'إعادة إسناد المهمة'; tone = 'settled'; }

                      return (
                        <li key={item.id || idx} className="tl-item" style={{ '--tone': `var(--status-${tone})`, '--tone-bg': `var(--status-${tone}-bg)` }}>
                          <div className="tl-head">
                            <strong>{title}</strong>
                            <span className="cell-sub">{when}</span>
                          </div>
                          <p className="tl-line">
                            <span>الحالة:</span>{' '}
                            {item.previous_status && item.previous_status !== item.new_status ? (
                              <>
                                <s>{ADMIN_TASK_STATUSES[item.previous_status]?.label || item.previous_status}</s>
                                {' '}<ArrowRight size={11} />{' '}
                              </>
                            ) : null}
                            <b>{itemStatus.label}</b>
                          </p>
                          {item.previous_assigned_to !== item.new_assigned_to && item.new_assigned_to && (
                            <p className="tl-line">
                              <span>المسؤول:</span>{' '}
                              {item.previous_assigned_to && <><s>{resolveAssigneeName(item.previous_assigned_to)}</s> <ArrowRight size={11} />{' '}</>}
                              <b>{resolveAssigneeName(item.new_assigned_to)}</b>
                            </p>
                          )}
                          {item.previous_due_date !== item.new_due_date && item.new_due_date && (
                            <p className="tl-line tl-extra">
                              المتابعة: {item.previous_due_date ? `كانت ${item.previous_due_date.split('T')[0]}` : 'لم تكن محددة'} ← الجديد {item.new_due_date.split('T')[0]}
                            </p>
                          )}
                          {item.update_text && <p className="tl-line tl-notes">{item.update_text}</p>}
                          <p className="tl-line tl-by">بواسطة {resolveActorName(item.created_by)}</p>
                        </li>
                      );
                    })}
                  </ol>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <AdministrativeTaskUpdateModal
        isOpen={!!taskToUpdate}
        task={taskToUpdate}
        onClose={() => setTaskToUpdate(null)}
      />

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog task-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? 'تعديل العمل الإداري' : 'إضافة عمل إداري'}</h3>
              <div className="modal-header-actions">
                <button type="button" className="icon-btn" title="إعادة تعيين الحقول" aria-label="إعادة تعيين الحقول" onClick={handleResetForm}>
                  <RotateCcw size={16} />
                </button>
                <button type="button" className="icon-btn" title="إغلاق" aria-label="إغلاق" onClick={() => setIsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="task-form">
              <div className="modal-body task-form-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">الموكل (اختياري)</label>
                    <Select className="form-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      <option value="">بدون موكل محدد</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${formatEgyptPhone(c.phone)})` : ''}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">القضية المرتبطة (اختياري)</label>
                    <Select className="form-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                      <option value="">عمل عام غير مرتبط بدعوى</option>
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>دعوى {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name || 'بدون مسمى'}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">عنوان العمل *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="متابعة الخبير، استخراج شهادة، قيد صحيفة استئناف…"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">موعد المتابعة *</label>
                    <DateInput required className="form-input" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">مكان التنفيذ</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="مكتب الخبراء، محكمة الأسرة، الشهر العقاري…"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">المطلوب (الإجراءات أو المستندات) *</label>
                  <textarea required className="form-textarea" rows={3} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات (اختياري)</label>
                  <textarea className="form-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">إسناد المهمة لعضو بالفريق</label>
                  <Select className="form-select" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">بدون تكليف محدد</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>الأستاذ / {m.name} ({USER_ROLES[m.role] || m.role || 'محامي'})</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" disabled={isSaving} className="btn btn-primary">
                  {isSaving ? 'جارٍ الحفظ…' : (editingTask ? 'حفظ التعديلات' : 'حفظ العمل')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
