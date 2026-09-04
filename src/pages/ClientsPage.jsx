import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  CreditCard, 
  FileText, 
  Briefcase, 
  Edit3, 
  Trash2, 
  X,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Send,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Unlink,
  ShieldAlert
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  generateClientInviteLink, 
  sendTestMessage, 
  verifyAndFetchClientChatId,
  TELEGRAM_BOT_USERNAME 
} from '../lib/telegram';

export default function ClientsPage({ setActiveTab }) {
  const { clients, cases, updateClient, deleteClient } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  // Telegram modal state
  const [telegramModalClient, setTelegramModalClient] = useState(null);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState(null);
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [schemaError, setSchemaError] = useState(false);

  const filteredClients = clients.filter(c => {
    return (
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.national_id && c.national_id.includes(searchTerm)) ||
      (c.power_of_attorney_number && c.power_of_attorney_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleDeleteClient = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموكل؟')) {
      await deleteClient(id);
      if (selectedClient?.id === id) setSelectedClient(null);
      if (telegramModalClient?.id === id) setTelegramModalClient(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      await updateClient(editingClient.id, {
        name: editingClient.name,
        phone: editingClient.phone || null,
        national_id: editingClient.national_id || null,
        power_of_attorney_number: editingClient.power_of_attorney_number || null,
        power_of_attorney_type: editingClient.power_of_attorney_type || null,
        financial_balance: parseFloat(editingClient.financial_balance) || 0,
        telegram_chat_id: editingClient.telegram_chat_id ? parseInt(editingClient.telegram_chat_id) : null,
      });
      setEditingClient(null);
    } catch (err) {
      if (err.message && err.message.includes('telegram_chat_id')) {
        alert('تنبيه: يجب إضافة حقل telegram_chat_id في جدول clients في Supabase أولاً.\nالأمر:\nALTER TABLE clients ADD COLUMN telegram_chat_id BIGINT DEFAULT NULL;');
      } else {
        alert('خطأ أثناء تعديل بيانات الموكل: ' + err.message);
      }
    }
  };

  // Open Telegram connection modal
  const openTelegramModal = (client) => {
    setTelegramModalClient(client);
    setTelegramStatusMsg(null);
    setManualChatId(client.telegram_chat_id ? String(client.telegram_chat_id) : '');
    setCopiedLink(false);
    setSchemaError(false);
  };

  const handleCopyLink = (clientId) => {
    const link = generateClientInviteLink(clientId);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCheckTelegramLink = async (client) => {
    setIsCheckingTelegram(true);
    setTelegramStatusMsg(null);
    setSchemaError(false);

    try {
      const match = await verifyAndFetchClientChatId(client.id);

      if (match && match.chatId) {
        try {
          await updateClient(client.id, {
            telegram_chat_id: match.chatId,
          });

          // Update local modal state
          const updatedClient = { ...client, telegram_chat_id: match.chatId };
          setTelegramModalClient(updatedClient);

          // Send welcome test message
          await sendTestMessage(match.chatId, client.name, user).catch(() => {});

          setTelegramStatusMsg({
            type: 'success',
            text: `تم ربط حساب التليجرام بنجاح! (@${match.username || match.firstName || match.chatId}) وتم إرسال رسالة ترحيبية للموكل.`,
          });
        } catch (dbErr) {
          if (dbErr.message && dbErr.message.includes('telegram_chat_id')) {
            setSchemaError(true);
          } else {
            throw dbErr;
          }
        }
      } else {
        setTelegramStatusMsg({
          type: 'info',
          text: 'لم يتم العثور على رسالة بدء من الموكل بعد. تأكد من أن الموكل ضغط على رابط الدعوة ثم ضغط زر "بدء / Start" في البوت، ثم أعد الفحص.',
        });
      }
    } catch (err) {
      setTelegramStatusMsg({
        type: 'error',
        text: 'حدث خطأ أثناء فحص البوت: ' + (err.message || 'يرجى المحاولة مرة أخرى'),
      });
    } finally {
      setIsCheckingTelegram(false);
    }
  };

  const handleManualSaveChatId = async (client) => {
    if (!manualChatId.trim()) {
      alert('يرجى كتابة رقم الـ Chat ID');
      return;
    }
    const parsedId = parseInt(manualChatId.trim());
    if (isNaN(parsedId)) {
      alert('الـ Chat ID يجب أن يتكون من أرقام فقط');
      return;
    }

    try {
      await updateClient(client.id, {
        telegram_chat_id: parsedId,
      });
      const updatedClient = { ...client, telegram_chat_id: parsedId };
      setTelegramModalClient(updatedClient);
      setTelegramStatusMsg({
        type: 'success',
        text: 'تم حفظ معرّف التليجرام بنجاح للموكل!',
      });
    } catch (dbErr) {
      if (dbErr.message && dbErr.message.includes('telegram_chat_id')) {
        setSchemaError(true);
      } else {
        alert('خطأ أثناء حفظ المعرف: ' + dbErr.message);
      }
    }
  };

  const handleSendTest = async (client) => {
    if (!client.telegram_chat_id) return;
    setIsSendingTest(true);
    setTelegramStatusMsg(null);
    try {
      await sendTestMessage(client.telegram_chat_id, client.name, user);
      setTelegramStatusMsg({
        type: 'success',
        text: '✅ تم إرسال الرسالة التجريبية بنجاح إلى تليجرام الموكل!',
      });
    } catch (err) {
      setTelegramStatusMsg({
        type: 'error',
        text: 'فشل إرسال الرسالة التجريبية: ' + (err.message || 'تحقق من صحة المعرّف'),
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleUnlinkTelegram = async (client) => {
    if (!window.confirm('هل أنت متأكد من إلغاء ربط تليجرام هذا الموكل؟ لن تصله إشعارات الجلسات التلقائية.')) {
      return;
    }
    try {
      await updateClient(client.id, {
        telegram_chat_id: null,
      });
      const updatedClient = { ...client, telegram_chat_id: null };
      setTelegramModalClient(updatedClient);
      setManualChatId('');
      setTelegramStatusMsg({
        type: 'info',
        text: 'تم إلغاء ربط التليجرام بنجاح.',
      });
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Header */}
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
              قاعدة بيانات الموكلين والتوكيلات
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            سجل الموكلين والتوكيلات
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
            {filteredClients.length} موكل مسجل
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.15rem', borderRadius: '14px' }}>
        <div className="header-search" style={{ width: '100%', minHeight: '40px', borderRadius: '10px' }}>
          <Search size={17} style={{ color: 'var(--text-subtle)' }} />
          <input 
            type="text" 
            placeholder="ابحث باسم الموكل، رقم الهاتف، الرقم القومي، أو التوكيل..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '0.88rem' }}
          />
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لا يوجد موكلين مطابقين للبحث</h3>
          <p style={{ fontSize: '0.9rem' }}>يمكنك إضافة موكل جديد باستخدام زر الإضافة أعلاه.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredClients.map((client) => {
            const clientCases = cases.filter(c => c.client_id === client.id);
            const isDebtor = client.financial_balance < 0;
            const isTelegramLinked = !!client.telegram_chat_id;

            return (
              <div key={client.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--primary-700), var(--primary-500))', width: '44px', height: '44px', fontSize: '1.1rem' }}>
                        {client.name ? client.name.charAt(0) : 'م'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{client.name}</h3>
                        {client.phone && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', direction: 'ltr' }}>
                            <span>🇪🇬 +20</span>
                            <span>{client.phone.startsWith('0') ? client.phone.substring(1) : client.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        onClick={() => setEditingClient({ ...client })}
                        title="تعديل"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger btn-icon" 
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        onClick={() => handleDeleteClient(client.id)}
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* PoA Info */}
                  <div style={{ padding: '0.75rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '0.8rem', fontSize: '0.82rem' }}>
                    <div><strong>رقم التوكيل:</strong> {client.power_of_attorney_number || 'غير مسجل'}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>{client.power_of_attorney_type || 'توكيل رسمي في القضايا'}</div>
                  </div>

                  {/* Financial Balance & Cases count */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem', fontSize: '0.82rem' }}>
                    <div style={{ padding: '0.6rem', background: isDebtor ? 'var(--status-dismissed-bg)' : 'var(--status-active-bg)', borderRadius: 'var(--radius-sm)', color: isDebtor ? 'var(--status-dismissed)' : 'var(--status-active)', fontWeight: '700' }}>
                      {isDebtor ? `مستحق: ${Math.abs(client.financial_balance)} ج.م` : `رصيد مسدد: ${client.financial_balance} ج.م`}
                    </div>

                    <div style={{ padding: '0.6rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', color: 'var(--primary-700)', fontWeight: '700', textAlign: 'center' }}>
                      {clientCases.length} قضايا متداولة
                    </div>
                  </div>

                  {/* Telegram Link Status Row */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: isTelegramLinked ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-card-subtle)',
                    border: `1px solid ${isTelegramLinked ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MessageSquare size={14} style={{ color: isTelegramLinked ? '#16a34a' : '#0284c7' }} />
                      <span style={{ fontWeight: '600', color: isTelegramLinked ? '#16a34a' : 'var(--text-muted)' }}>
                        {isTelegramLinked ? 'تليجرام مربوط ومفعل' : 'تليجرام غير مربوط'}
                      </span>
                    </div>
                    <button 
                      className="btn btn-secondary"
                      style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.6rem', 
                        height: 'auto',
                        background: isTelegramLinked ? '#fff' : 'var(--primary-700)',
                        color: isTelegramLinked ? '#16a34a' : '#fff',
                        borderColor: isTelegramLinked ? 'rgba(34, 197, 94, 0.4)' : 'var(--primary-700)',
                        fontWeight: '700'
                      }}
                      onClick={() => openTelegramModal(client)}
                    >
                      {isTelegramLinked ? 'إدارة' : 'ربط 📱'}
                    </button>
                  </div>
                </div>

                {/* Footer Action */}
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                  onClick={() => setSelectedClient(client)}
                >
                  عرض ملف الموكل والدعاوى
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Details Modal */}
      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ملف الموكل: {selectedClient.name}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedClient(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>الهاتف:</span>
                  <div style={{ fontWeight: '600' }}>{selectedClient.phone || 'غير مسجل'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>الرقم القومي:</span>
                  <div style={{ fontWeight: '600' }}>{selectedClient.national_id || 'غير مسجل'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>التوكيل:</span>
                  <div style={{ fontWeight: '600' }}>{selectedClient.power_of_attorney_number || 'غير مسجل'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>الموقف المالي:</span>
                  <div style={{ fontWeight: '700', color: selectedClient.financial_balance < 0 ? 'var(--status-dismissed)' : 'var(--status-active)' }}>
                    {selectedClient.financial_balance} ج.م
                  </div>
                </div>
              </div>

              {/* Telegram Integration Panel in Details */}
              <div style={{ 
                padding: '0.9rem 1.1rem', 
                background: selectedClient.telegram_chat_id ? 'rgba(34, 197, 94, 0.06)' : 'var(--bg-card-subtle)',
                borderRadius: '12px',
                border: `1px solid ${selectedClient.telegram_chat_id ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`,
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={18} style={{ color: selectedClient.telegram_chat_id ? '#16a34a' : '#0284c7' }} />
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>إشعارات التليجرام التلقائية</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {selectedClient.telegram_chat_id 
                          ? `مربوط بالمعرف: ${selectedClient.telegram_chat_id}` 
                          : 'غير مربوط بعد — اضغط لربط الموكل لإرسال التحديثات'}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => {
                      setSelectedClient(null);
                      openTelegramModal(selectedClient);
                    }}
                  >
                    {selectedClient.telegram_chat_id ? 'إدارة الربط والرسائل' : 'ربط بالتليجرام 📱'}
                  </button>
                </div>
              </div>

              <h4 style={{ marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                الدعاوى القضائية المربوطة بهذا الموكل
              </h4>
              {cases.filter(c => c.client_id === selectedClient.id).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>لا توجد دعاوى قضائية مسجلة باسم هذا الموكل حالياً.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {cases.filter(c => c.client_id === selectedClient.id).map(c => (
                    <div key={c.id} style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: '700', color: 'var(--primary-700)' }}>
                        دعوى {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        المحكمة: {c.court_name} | الجلسة القادمة: {c.next_session_date ? new Date(c.next_session_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedClient(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Connection Modal */}
      {telegramModalClient && (
        <div className="modal-backdrop" onClick={() => setTelegramModalClient(null)}>
          <div className="modal-dialog" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  background: 'rgba(2, 132, 199, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#0284c7' 
                }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                    ربط تليجرام للموكل: {telegramModalClient.name}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    بوت المنصة: @{TELEGRAM_BOT_USERNAME}
                  </span>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setTelegramModalClient(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Status Banner */}
              {telegramStatusMsg && (
                <div style={{ 
                  padding: '0.85rem 1rem', 
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  background: telegramStatusMsg.type === 'success' ? '#f0fdf4' : telegramStatusMsg.type === 'error' ? '#fef2f2' : '#f0f9ff',
                  border: `1px solid ${telegramStatusMsg.type === 'success' ? '#86efac' : telegramStatusMsg.type === 'error' ? '#fca5a5' : '#bae6fd'}`,
                  color: telegramStatusMsg.type === 'success' ? '#15803d' : telegramStatusMsg.type === 'error' ? '#b91c1c' : '#0369a1',
                }}>
                  {telegramStatusMsg.text}
                </div>
              )}

              {/* Schema Error Notice */}
              {schemaError && (
                <div style={{ 
                  padding: '0.85rem 1rem', 
                  borderRadius: '10px',
                  fontSize: '0.83rem',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  lineHeight: '1.5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                    <ShieldAlert size={16} />
                    <span>تنبيه: يلزم إضافة العمود في Supabase</span>
                  </div>
                  يرجى فتح لوحة Supabase وكتابة هذا الأمر في SQL Editor:
                  <pre style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', direction: 'ltr', fontSize: '0.75rem', margin: '0.4rem 0' }}>
                    ALTER TABLE clients ADD COLUMN telegram_chat_id BIGINT DEFAULT NULL;
                  </pre>
                </div>
              )}

              {/* If Linked */}
              {telegramModalClient.telegram_chat_id ? (
                <div style={{ 
                  background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)', 
                  border: '1px solid #bbf7d0', 
                  borderRadius: '14px', 
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#15803d', fontWeight: '800' }}>
                        الحساب مربوط ونشط ✅
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        معرّف التليجرام (Chat ID): <code style={{ direction: 'ltr', display: 'inline-block', fontWeight: '700' }}>{telegramModalClient.telegram_chat_id}</code>
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    ستصل الموكل إشعارات تلقائية فورية عند تأجيل الجلسات، أو صدور قرارات وأحكام، أو تحديث حالة قضاياه المسجلة.
                  </p>

                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <button 
                      className="btn btn-primary"
                      style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => handleSendTest(telegramModalClient)}
                      disabled={isSendingTest}
                    >
                      <Send size={15} />
                      <span>{isSendingTest ? 'جارٍ الإرسال...' : 'إرسال رسالة تجريبية 📨'}</span>
                    </button>

                    <button 
                      className="btn btn-danger"
                      style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => handleUnlinkTelegram(telegramModalClient)}
                    >
                      <Unlink size={15} />
                      <span>إلغاء الربط</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* If NOT linked */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Step 1: Send link */}
                  <div style={{ 
                    background: 'var(--bg-card-subtle)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '1rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-700)', color: '#fff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>1</span>
                      <strong style={{ fontSize: '0.9rem' }}>شارك رابط الدعوة مع الموكل:</strong>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.6rem 0' }}>
                      أرسل الرابط التالي للموكل عبر واتساب أو رسالة، ليفتحه على هاتفه:
                    </p>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={generateClientInviteLink(telegramModalClient.id)} 
                        style={{ 
                          fontSize: '0.8rem', 
                          direction: 'ltr', 
                          background: 'var(--bg-main)', 
                          border: '1px solid var(--border-color)', 
                          padding: '0.5rem 0.75rem', 
                          borderRadius: '8px', 
                          flex: 1,
                          color: 'var(--text-secondary)'
                        }}
                      />
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                        onClick={() => handleCopyLink(telegramModalClient.id)}
                      >
                        {copiedLink ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                        <span>{copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                      </button>
                      <a 
                        href={generateClientInviteLink(telegramModalClient.id)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-icon"
                        title="فتح في تليجرام"
                        style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>

                  {/* Step 2: Client presses start */}
                  <div style={{ 
                    background: 'var(--bg-card-subtle)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '1rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-700)', color: '#fff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>2</span>
                      <strong style={{ fontSize: '0.9rem' }}>التحقق والربط التلقائي:</strong>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.8rem 0' }}>
                      بعد أن يضغط الموكل على زر <b>بدء / Start</b> في تليجرام، اضغط الزر بالأسفل للتحقق فوراً:
                    </p>

                    <button 
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.88rem', padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      onClick={() => handleCheckTelegramLink(telegramModalClient)}
                      disabled={isCheckingTelegram}
                    >
                      <RefreshCw size={16} className={isCheckingTelegram ? 'spin' : ''} />
                      <span>{isCheckingTelegram ? 'جارٍ فحص رسائل البوت...' : 'فحص وتأكيد الربط التلقائي 🔄'}</span>
                    </button>
                  </div>

                  {/* Step 3: Or manual Chat ID */}
                  <div style={{ 
                    borderTop: '1px dashed var(--border-color)', 
                    paddingTop: '0.9rem' 
                  }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                      أو: إدخال معرّف التليجرام (Chat ID) يدوياً إذا كان معروفاً:
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input 
                        type="text"
                        placeholder="مثال: 123456789"
                        value={manualChatId}
                        onChange={(e) => setManualChatId(e.target.value)}
                        style={{ 
                          fontSize: '0.82rem', 
                          direction: 'ltr', 
                          padding: '0.45rem 0.75rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          flex: 1 
                        }}
                      />
                      <button 
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                        onClick={() => handleManualSaveChatId(telegramModalClient)}
                      >
                        حفظ المعرف
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTelegramModalClient(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="modal-backdrop" onClick={() => setEditingClient(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل بيانات الموكل: {editingClient.name}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setEditingClient(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={editingClient.name} 
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                        type="text" 
                        className="form-input" 
                        style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0', textAlign: 'left', direction: 'ltr' }}
                        value={editingClient.phone || ''} 
                        onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الرقم القومي</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingClient.national_id || ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, national_id: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">رقم التوكيل</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingClient.power_of_attorney_number || ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, power_of_attorney_number: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">نوع التوكيل</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingClient.power_of_attorney_type || ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, power_of_attorney_type: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">الرصيد المالي (الأتعاب)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={editingClient.financial_balance} 
                      onChange={(e) => setEditingClient({ ...editingClient, financial_balance: e.target.value })} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">معرّف تليجرام (Chat ID)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="اختياري (أرقام فقط)"
                      style={{ direction: 'ltr' }}
                      value={editingClient.telegram_chat_id || ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, telegram_chat_id: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingClient(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
