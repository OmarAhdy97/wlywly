import RowAction, { RowActions } from '../components/common/RowAction';
import React, { useState } from 'react';
import { Search, Plus, Edit3, Trash2, X, RotateCcw, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES } from '../lib/supabase';
import { confirmDialog, notify } from '../lib/dialog';
import Select from '../components/common/Select';
import CourtInput from '../components/common/CourtInput';
import DateInput from '../components/common/DateInput';
import { formatEgyptPhone } from '../lib/phone';

export default function BailiffsPage() {
  const { bailiffTasks, clients, team, addBailiffTask, updateBailiffTask, deleteBailiffTask, toggleBailiffStatus } = useData();

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' (غير مستلم) | 'delivered' (مستلم) | 'all' (الكل)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form Fields
  const [clientId, setClientId] = useState('');
  const [noticeNature, setNoticeNature] = useState('');
  const [bailiffNumber, setBailiffNumber] = useState('');
  const [courtName, setCourtName] = useState('محكمة دمياط الابتدائية');
  const [bailiffOffice, setBailiffOffice] = useState('قلم محضرين بندر دمياط');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptDate, setReceiptDate] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Open modal for new bailiff record
  const handleOpenNew = () => {
    setEditingTask(null);
    setClientId('');
    setNoticeNature('');
    setBailiffNumber('');
    setCourtName('محكمة دمياط الابتدائية');
    setBailiffOffice('قلم محضرين بندر دمياط');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setReceiptDate('');
    setSessionDate('');
    setAssignedTo('');
    setNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setClientId(task.client_id || '');
    setNoticeNature(task.notice_nature || '');
    setBailiffNumber(task.bailiff_number || '');
    setCourtName(task.court_name || '');
    setBailiffOffice(task.bailiff_office || '');
    setDeliveryDate(task.delivery_date ? task.delivery_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setReceiptDate(task.receipt_date ? task.receipt_date.split('T')[0] : '');
    setSessionDate(task.session_date ? task.session_date.split('T')[0] : '');
    setAssignedTo(task.assigned_to || '');
    setNotes(task.notes || '');
    setIsModalOpen(true);
  };

  const handleResetForm = () => {
    setClientId('');
    setNoticeNature('');
    setBailiffNumber('');
    setCourtName('');
    setBailiffOffice('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setReceiptDate('');
    setSessionDate('');
    setAssignedTo('');
    setNotes('');
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!noticeNature.trim()) {
      notify('يرجى كتابة طبيعة الإعلان أو الصحيفة', 'warn');
      return;
    }

    setIsSaving(true);
    try {
      const clientObj = clients.find(c => c.id === clientId);
      const taskData = {
        notice_nature: noticeNature.trim(),
        bailiff_number: bailiffNumber.trim() || null,
        court_name: courtName.trim() || null,
        bailiff_office: bailiffOffice.trim() || null,
        delivery_date: deliveryDate,
        receipt_date: receiptDate || null,
        session_date: sessionDate || null,
        client_id: clientId || null,
        client_name: clientObj ? clientObj.name : null,
        assigned_to: assignedTo || null,
        notes: notes.trim() || null,
        status: receiptDate ? 'delivered' : (editingTask ? editingTask.status : 'pending')
      };

      if (editingTask) {
        await updateBailiffTask(editingTask.id, taskData);
      } else {
        await addBailiffTask(taskData);
      }

      setIsModalOpen(false);
      handleResetForm();
    } catch (err) {
      notify('خطأ أثناء حفظ بيانات المحضر: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (await confirmDialog('هل أنت متأكد من حذف ورقة المحضرين هذه نهائياً؟', { danger: true, confirmLabel: 'حذف' })) {
      await deleteBailiffTask(id);
    }
  };

  // Filter Records
  const query = searchTerm.toLowerCase().trim();
  const filteredRecords = bailiffTasks.filter(task => {
    // Status filter
    if (filterStatus === 'pending' && task.status === 'delivered') return false;
    if (filterStatus === 'delivered' && task.status !== 'delivered') return false;

    // Search query
    if (!query) return true;
    return (
      (task.notice_nature && task.notice_nature.toLowerCase().includes(query)) ||
      (task.bailiff_number && task.bailiff_number.toLowerCase().includes(query)) ||
      (task.client_name && task.client_name.toLowerCase().includes(query)) ||
      (task.court_name && task.court_name.toLowerCase().includes(query)) ||
      (task.bailiff_office && task.bailiff_office.toLowerCase().includes(query)) ||
      (task.notes && task.notes.toLowerCase().includes(query))
    );
  });

  // Counts
  const pendingCount = bailiffTasks.filter(t => t.status !== 'delivered').length;
  const deliveredCount = bailiffTasks.filter(t => t.status === 'delivered').length;
  const totalCount = bailiffTasks.length;

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>المحضرون</h1>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={handleOpenNew}>
            <Plus size={16} />
            <span>إضافة ورقة محضرين</span>
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="fin-search page-search">
          <Search size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="طبيعة الإعلان، الموكل، المحكمة، رقم المحضر"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="seg-tabs">
          {[
            { id: 'pending', label: 'غير مستلم', count: pendingCount },
            { id: 'delivered', label: 'تم التسليم', count: deliveredCount },
            { id: 'all', label: 'الكل', count: totalCount },
          ].map(t => (
            <button key={t.id} type="button" className={`seg-tab ${filterStatus === t.id ? 'is-active' : ''}`} onClick={() => setFilterStatus(t.id)}>
              <span>{t.label}</span>
              <span className="seg-count">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Records List or Empty State */}
      {filteredRecords.length === 0 ? (
        <div className="card empty-block">
          <h3>{filterStatus === 'pending' ? 'لا توجد أوراق غير مستلمة' : 'لا توجد أوراق مطابقة'}</h3>
          <p>إجمالي أوراق المحضرين: {totalCount}</p>
          <button type="button" className="btn btn-primary empty-block-action" onClick={handleOpenNew}>
            <Plus size={16} /> إضافة ورقة محضرين
          </button>
        </div>
      ) : (
        <div className="card row-list">
          {filteredRecords.map((record) => {
            const isDone = record.status === 'delivered';
            const member = record.assigned_to ? team.find((m) => m.id === record.assigned_to) : null;
            const day = (d) => new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

            return (
              <article key={record.id} className={`list-row ${isDone ? 'is-done' : ''}`}>
                <div className="list-row-main">
                  <div className="list-row-body">
                    <div className="list-row-top">
                      <h3 className="row-title">
                        {record.bailiff_number && <span className="row-key">#{record.bailiff_number}</span>}
                        {record.notice_nature}
                      </h3>
                      <span className="status-chip" style={{ '--dot': isDone ? 'var(--success)' : 'var(--status-adjourned)' }}>
                        {isDone ? 'مستلم' : 'غير مستلم'}
                      </span>
                    </div>
                    <p className="list-row-sub">
                      {[record.client_name || 'بدون موكل', record.court_name, record.bailiff_office].filter(Boolean).join(' · ')}
                    </p>
                    {record.notes && <p className="list-row-text">{record.notes}</p>}
                  </div>

                  <dl className="list-row-facts is-three">
                    <div><dt>التسليم</dt><dd>{record.delivery_date ? day(record.delivery_date) : '—'}</dd></div>
                    <div><dt>الاستلام</dt><dd>{record.receipt_date ? day(record.receipt_date) : <span className="cell-sub">قيد الإعلان</span>}</dd></div>
                    <div>
                      <dt>المتابعة</dt>
                      <dd className="row-owner">
                        {member ? (<>{member.name}</>) : <span className="cell-sub">غير مسند</span>}
                      </dd>
                    </div>
                  </dl>

                  <div className="list-row-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={async () => { try { await toggleBailiffStatus(record.id); } catch (err) { notify(err.message); } }}
                    >
                      {isDone ? <RotateCcw size={14} /> : <Check size={14} />}
                      <span>{isDone ? 'إعادة لغير مستلم' : 'تم الاستلام'}</span>
                    </button>
                    <RowActions>
                      <RowAction icon={Edit3} label="تعديل" onClick={() => handleOpenEdit(record)} />
                      <RowAction icon={Trash2} label="حذف" tone="danger" onClick={() => handleDelete(record.id)} />
                    </RowActions>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog task-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? 'تعديل ورقة المحضرين' : 'إضافة ورقة محضرين'}</h3>
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
                <div className="form-group">
                  <label className="form-label">الموكل (اختياري)</label>
                  <Select className="form-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">اختر الموكل من السجل</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${formatEgyptPhone(c.phone)})` : ''}</option>
                    ))}
                  </Select>
                </div>

                <div className="form-group">
                  <label className="form-label">طبيعة الإعلان *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="إعادة إعلان، صحيفة دعوى، إنذار على يد محضر، عرض مال…"
                    value={noticeNature}
                    onChange={(e) => setNoticeNature(e.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">رقم المحضر</label>
                    <input type="text" className="form-input" placeholder="كما في الجهة" value={bailiffNumber} onChange={(e) => setBailiffNumber(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المحكمة</label>
                    <CourtInput value={courtName} onChange={setCourtName} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">قلم المحضرين</label>
                  <input type="text" className="form-input" value={bailiffOffice} onChange={(e) => setBailiffOffice(e.target.value)} />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">تاريخ التسليم *</label>
                    <DateInput required className="form-input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ الاستلام</label>
                    <DateInput className="form-input" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ الجلسة</label>
                    <DateInput className="form-input" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">تكليف عضو من الفريق بالمتابعة</label>
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
                  {isSaving ? 'جارٍ الحفظ…' : (editingTask ? 'حفظ التعديلات' : 'حفظ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
