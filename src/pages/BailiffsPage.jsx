import React, { useState } from 'react';
import {
  Send,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  FileText,
  Building2,
  Calendar,
  MapPin,
  User,
  UserCheck,
  Edit3,
  Trash2,
  X,
  RotateCcw,
  Check,
  ChevronLeft,
  Hash,
  PenTool,
  Mic,
  ListFilter
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES } from '../lib/supabase';

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
      alert('يرجى كتابة طبيعة الإعلان أو الصحيفة');
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
      alert('خطأ أثناء حفظ بيانات المحضر: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف ورقة المحضرين هذه نهائياً؟')) {
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
              محاضر المحاكم والإعلانات القضائية
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            قائمة المحضرين
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
            <span>إضافة ورقة محضرين</span>
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
            placeholder="البحث في المحضرين..."
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
          <span>غير مستلم</span>
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
            border: filterStatus === 'delivered' ? '1.5px solid #16a34a' : '1px solid var(--border-color)',
            background: filterStatus === 'delivered' ? '#16a34a' : 'var(--bg-card)',
            color: filterStatus === 'delivered' ? '#ffffff' : 'var(--text-main)',
            boxShadow: filterStatus === 'delivered' ? '0 3px 10px rgba(22, 163, 74, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setFilterStatus('delivered')}
        >
          <CheckCircle2 size={16} />
          <span>مستلم</span>
          <span style={{
            background: filterStatus === 'delivered' ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-subtle)',
            padding: '0.1rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.78rem'
          }}>
            {deliveredCount}
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
          {filteredRecords.length}
        </span>
        <span>عدد المحاضر المعروضة</span>
      </div>

      {/* Records List or Empty State */}
      {filteredRecords.length === 0 ? (
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
            <Clock size={38} strokeWidth={1.5} />
          </div>

          <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            {filterStatus === 'pending' ? 'لا يوجد محضرين غير مستلمين' : 'لا توجد أوراق محضرين تطابق بحثك'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
            إجمالي المحضرين: {totalCount}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'var(--primary-800)', borderRadius: '10px', padding: '0.6rem 1.4rem', fontWeight: '700' }}
            onClick={handleOpenNew}
          >
            <Plus size={16} />
            <span>إضافة ورقة محضرين جديدة</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))', gap: '1rem' }}>
          {filteredRecords.map(record => {
            const isDone = record.status === 'delivered';

            return (
              <div
                key={record.id}
                style={{
                  background: 'var(--bg-card)',
                  border: isDone ? '1px solid #dcfce7' : '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.2rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  position: 'relative'
                }}
              >
                {/* Card Top: Client badge & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card-subtle)', padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    <User size={13} color="var(--primary-700)" />
                    <span>{record.client_name || 'بدون موكل محدد'}</span>
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
                    <span>{isDone ? 'مستلم' : 'غير مستلم'}</span>
                  </span>
                </div>

                {/* Nature of Notice */}
                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 0.35rem' }}>
                    {record.notice_nature}
                  </h3>
                  {record.bailiff_number && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Hash size={14} color="var(--primary-700)" />
                      <span>رقم المحضرين: <strong>{record.bailiff_number}</strong></span>
                    </div>
                  )}
                </div>

                {/* Court & Office details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem', background: 'var(--bg-card-subtle)', padding: '0.75rem 0.9rem', borderRadius: '10px' }}>
                  {record.court_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                      <Building2 size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                      <span><strong>المحكمة:</strong> {record.court_name}</span>
                    </div>
                  )}

                  {record.bailiff_office && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                      <PenTool size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                      <span><strong>قلم المحضرين:</strong> {record.bailiff_office}</span>
                    </div>
                  )}

                  {record.assigned_to && (() => {
                    const member = team.find(m => m.id === record.assigned_to);
                    return member ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                        <UserCheck size={15} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                        <span><strong>المكلف بالمتابعة:</strong> الأستاذ / {member.name}</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Dates Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', background: 'var(--bg-card-subtle)', padding: '0.65rem 0.8rem', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>تاريخ التسليم:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {record.delivery_date ? new Date(record.delivery_date).toLocaleDateString('ar-EG') : '—'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>تاريخ الاستلام:</span>
                    <strong style={{ color: isDone ? '#15803d' : 'var(--text-muted)' }}>
                      {record.receipt_date ? new Date(record.receipt_date).toLocaleDateString('ar-EG') : 'قيد الإعلان'}
                    </strong>
                  </div>

                  {record.session_date && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-900)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
                      <Calendar size={13} color="var(--primary-700)" />
                      <span>تاريخ الجلسة: <strong>{new Date(record.session_date).toLocaleDateString('ar-EG')}</strong></span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {record.notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontStyle: 'italic', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem' }}>
                    ملاحظات: {record.notes}
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
                    onClick={() => toggleBailiffStatus(record.id)}
                  >
                    {isDone ? <RotateCcw size={14} /> : <Check size={14} strokeWidth={3} />}
                    <span>{isDone ? 'إعادة لغير مستلم' : 'تم الاستلام'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      style={{ width: '32px', height: '32px', padding: 0 }}
                      title="تعديل ورقة المحضرين"
                      onClick={() => handleOpenEdit(record)}
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      style={{ width: '32px', height: '32px', padding: 0 }}
                      title="حذف"
                      onClick={() => handleDelete(record.id)}
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
      {/* ADD / EDIT BAILIFF RECORD MODAL (MATCHING SCREENSHOT 2 & 3)               */}
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
                  {editingTask ? 'تعديل بيانات المحضر' : 'إضافة محضرين'}
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
                {/* SECTION 1: اختيار الموكل */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    <User size={16} color="var(--primary-700)" />
                    <span>اختيار الموكل (اختياري)</span>
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

                {/* SECTION 2: بيانات المحضر */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    <FileText size={16} color="var(--primary-700)" />
                    <span>بيانات المحضر</span>
                  </div>

                  {/* طبيعة الإعلان */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>طبيعة الإعلان *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="مثال: إعادة إعلان، صحيفة دعوى، إنذار على يد محضر، عرض مال..."
                        value={noticeNature}
                        onChange={(e) => setNoticeNature(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <FileText size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* رقم المحضرين */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>رقم المحضرين</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="الرقم كما في الجهة"
                        value={bailiffNumber}
                        onChange={(e) => setBailiffNumber(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <Hash size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* المحكمة */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>المحكمة</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="مثال: محكمة دمياط الابتدائية، محكمة أسكندرية الجزئية..."
                        value={courtName}
                        onChange={(e) => setCourtName(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <Building2 size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* قلم المحضرين */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>قلم المحضرين</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="مثال: قلم محضرين بندر دمياط، قلم المحضرين بمحكمة الجيزة..."
                        value={bailiffOffice}
                        onChange={(e) => setBailiffOffice(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <PenTool size={17} style={{ position: 'absolute', left: '12px', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: التواريخ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    <Calendar size={16} color="var(--primary-700)" />
                    <span>التواريخ</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* تاريخ التسليم */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: '700' }}>تاريخ التسليم *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                      />
                    </div>

                    {/* تاريخ الاستلام */}
                    <div className="form-group">
                      <label className="form-label">تاريخ الاستلام</label>
                      <input
                        type="date"
                        className="form-input"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* تاريخ الجلسة */}
                  <div className="form-group">
                    <label className="form-label">تاريخ الجلسة</label>
                    <input
                      type="date"
                      className="form-input"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* SECTION 4: ملاحظات */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    <ListFilter size={16} color="var(--primary-700)" />
                    <span>ملاحظات</span>
                  </div>

                  <div className="form-group">
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="أضف أي ملاحظات إضافية..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* المكلف بالمتابعة والتنفيذ */}
                  <div className="form-group" style={{ marginTop: '0.6rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}>
                      <UserCheck size={15} color="var(--primary-700)" />
                      <span>تكليف عضو من فريق العمل بالمتابعة</span>
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
                  {isSaving ? 'جاري الحفظ...' : (editingTask ? 'تحديث المحضر' : 'حفظ المحضر')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
