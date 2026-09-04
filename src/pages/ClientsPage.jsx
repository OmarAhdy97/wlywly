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
  ShieldAlert,
  Receipt,
  Plus,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  generateClientInviteLink, 
  sendTestMessage, 
  verifyAndFetchClientChatId,
  sendClientStatementTelegram,
  TELEGRAM_BOT_USERNAME 
} from '../lib/telegram';

export default function ClientsPage({ setActiveTab }) {
  const { 
    clients, 
    cases, 
    updateClient, 
    deleteClient, 
    transactions, 
    addTransaction, 
    deleteTransaction 
  } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  // Telegram link modal state
  const [telegramModalClient, setTelegramModalClient] = useState(null);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState(null);
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [schemaError, setSchemaError] = useState(false);

  // Statement of Account & Billing state
  const [statementClient, setStatementClient] = useState(null);
  const [txType, setTxType] = useState('expense'); // 'expense' (مصروف) or 'payment' (سداد)
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txCaseId, setTxCaseId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingTx, setIsSavingTx] = useState(false);

  // Telegram bill confirmation state
  const [confirmTelegramBill, setConfirmTelegramBill] = useState(false);
  const [isSendingBill, setIsSendingBill] = useState(false);
  const [billFeedback, setBillFeedback] = useState(null);

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
      if (statementClient?.id === id) setStatementClient(null);
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

          const updatedClient = { ...client, telegram_chat_id: match.chatId };
          setTelegramModalClient(updatedClient);
          if (statementClient?.id === client.id) {
            setStatementClient(updatedClient);
          }

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
      if (statementClient?.id === client.id) {
        setStatementClient(updatedClient);
      }
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
      if (statementClient?.id === client.id) {
        setStatementClient(updatedClient);
      }
      setManualChatId('');
      setTelegramStatusMsg({
        type: 'info',
        text: 'تم إلغاء ربط التليجرام بنجاح.',
      });
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  };

  // Add a new transaction from the statement modal
  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!statementClient) return;
    const amountNum = parseFloat(txAmount);
    if (!amountNum || amountNum <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!txDesc.trim()) {
      alert('يرجى إدخال بيان الحركة (مثال: أمانة خبير، رسم إيداع، دفعة نقدية)');
      return;
    }

    setIsSavingTx(true);
    try {
      await addTransaction({
        client_id: statementClient.id,
        case_id: txCaseId || null,
        type: txType,
        amount: amountNum,
        description: txDesc.trim(),
        date: txDate || new Date().toISOString().split('T')[0],
      });

      // Update local statementClient balance
      const currentBal = parseFloat(statementClient.financial_balance) || 0;
      const delta = txType === 'expense' ? -amountNum : amountNum;
      setStatementClient(prev => ({ ...prev, financial_balance: currentBal + delta }));

      setTxAmount('');
      setTxDesc('');
      setTxCaseId('');
    } catch (err) {
      alert('خطأ أثناء حفظ المعاملة: ' + err.message);
    } finally {
      setIsSavingTx(false);
    }
  };

  // Handle sending bill via Telegram (called after lawyer confirmation)
  const handleConfirmSendBillTelegram = async () => {
    if (!statementClient || !statementClient.telegram_chat_id) return;
    setIsSendingBill(true);
    setBillFeedback(null);

    const clientTx = (transactions || []).filter(t => t.client_id === statementClient.id);
    const clientCases = cases.filter(c => c.client_id === statementClient.id);

    try {
      await sendClientStatementTelegram({
        client: statementClient,
        lawyerUser: user,
        transactions: clientTx,
        currentBalance: statementClient.financial_balance,
        clientCases,
      });

      setBillFeedback({
        type: 'success',
        text: '✅ تم إرسال كشف الحساب والمطالبة المالية بنجاح إلى تليجرام الموكل!',
      });
      setConfirmTelegramBill(false);
    } catch (err) {
      setBillFeedback({
        type: 'error',
        text: 'فشل إرسال كشف الحساب للتليجرام: ' + (err.message || 'حدث خطأ غير متوقع'),
      });
      setConfirmTelegramBill(false);
    } finally {
      setIsSendingBill(false);
    }
  };

  // Helper to render financial balance on a single line without minus sign
  const renderBalanceBadge = (balance, isDetailed = false) => {
    const num = parseFloat(balance) || 0;
    if (num < 0) {
      const formatted = Math.abs(num).toLocaleString('en-US');
      return (
        <span style={{ 
          color: 'var(--status-dismissed)', 
          fontWeight: '700', 
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          fontSize: '0.8rem',
          lineHeight: '1.2'
        }}>
          <span>{isDetailed ? 'مستحق على الموكل: ' : 'مستحق: '}</span>
          <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block', fontWeight: '800' }}>
            {formatted}
          </span>
          <span style={{ display: 'inline-block' }}>ج.م</span>
        </span>
      );
    }
    if (num > 0) {
      const formatted = num.toLocaleString('en-US');
      return (
        <span style={{ 
          color: 'var(--status-active)', 
          fontWeight: '700', 
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          fontSize: '0.8rem',
          lineHeight: '1.2'
        }}>
          <span>{isDetailed ? 'رصيد دائن للموكل: ' : 'مسدد: '}</span>
          <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block', fontWeight: '800' }}>
            {formatted}
          </span>
          <span style={{ display: 'inline-block' }}>ج.م</span>
        </span>
      );
    }
    return (
      <span style={{ color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
        {isDetailed ? 'الحساب خالص (0 ج.م)' : 'خالص (0 ج.م)'}
      </span>
    );
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div className="no-print" style={{
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
            سجل الموكلين والتوكيلات والحسابات
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
            {filteredClients.length} موكل مسجل
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card no-print" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.15rem', borderRadius: '14px' }}>
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
        <div className="card no-print" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لا يوجد موكلين مطابقين للبحث</h3>
          <p style={{ fontSize: '0.9rem' }}>يمكنك إضافة موكل جديد باستخدام زر الإضافة أعلاه.</p>
        </div>
      ) : (
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredClients.map((client) => {
            const clientCases = cases.filter(c => c.client_id === client.id);
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

                  {/* Financial Balance & Cases count (Unified Modern Tiles) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem', fontSize: '0.82rem' }}>
                    <div style={{ 
                      padding: '0.65rem 0.5rem', 
                      background: 'var(--bg-card-subtle)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}>
                      {renderBalanceBadge(client.financial_balance)}
                    </div>

                    <div style={{ 
                      padding: '0.65rem 0.5rem', 
                      background: 'var(--bg-card-subtle)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', 
                      color: 'var(--text-main)', 
                      fontWeight: '700', 
                      textAlign: 'center', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}>
                      <span>{clientCases.length} قضايا متداولة</span>
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

                {/* Footer Action Buttons with Exactly the Same Style and No Icons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ 
                      fontSize: '0.85rem', 
                      padding: '0.6rem 0.5rem', 
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      fontWeight: '700',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => setSelectedClient(client)}
                  >
                    ملف الموكل
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ 
                      fontSize: '0.85rem', 
                      padding: '0.6rem 0.5rem', 
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      fontWeight: '700',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                      setStatementClient(client);
                      setBillFeedback(null);
                    }}
                  >
                    كشف الحساب
                  </button>
                </div>
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
                  <div style={{ marginTop: '0.2rem' }}>
                    {renderBalanceBadge(selectedClient.financial_balance, true)}
                  </div>
                  <button 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => {
                      const c = selectedClient;
                      setSelectedClient(null);
                      setStatementClient(c);
                      setBillFeedback(null);
                    }}
                  >
                    <Receipt size={13} />
                    <span>عرض كشف الحساب وفاتورة الأتعاب</span>
                  </button>
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
                      const c = selectedClient;
                      setSelectedClient(null);
                      openTelegramModal(c);
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

      {/* ========================================================================= */}
      {/* Client Statement of Account & Bill Modal (كشف الحساب والفاتورة) */}
      {/* ========================================================================= */}
      {statementClient && (
        <div className="modal-backdrop" onClick={() => setStatementClient(null)}>
          <div className="modal-dialog statement-modal" style={{ width: '96%', maxWidth: '1120px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-100)', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                    كشف حساب ومطالبة أتعاب: {statementClient.name}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    التوكيل رقم: {statementClient.power_of_attorney_number || 'غير مسجل'} | الهاتف: {statementClient.phone || 'غير مسجل'}
                  </span>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon no-print" onClick={() => setStatementClient(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Feedback Alert */}
              {billFeedback && (
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  background: billFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${billFeedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
                  color: billFeedback.type === 'success' ? '#15803d' : '#b91c1c',
                }}>
                  {billFeedback.text}
                </div>
              )}

              {/* Printable Official Letterhead */}
              <div className="print-only" style={{ display: 'none', borderBottom: '2px solid #0f172a', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>
                      مكتب الأستاذ / {user?.user_metadata?.full_name || 'المحامي بالنقض والدستورية العليا'}
                    </h2>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
                      محامون ومستشارون قانونيون | هاتف: {user?.user_metadata?.phone || user?.email || ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'left', direction: 'ltr' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>STATEMENT OF ACCOUNT</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {new Date().toLocaleDateString('ar-EG')}</div>
                  </div>
                </div>
              </div>

              {/* Balance Summary Widgets (Unified Sleek Tiles) */}
              {(() => {
                const clientTx = (transactions || []).filter(t => t.client_id === statementClient.id);
                const totalExp = clientTx.filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                const totalPay = clientTx.filter(t => t.type === 'payment').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                const netBal = parseFloat(statementClient.financial_balance) || 0;
                const isDebtor = netBal < 0;

                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                      {/* Tile 1: Expenses */}
                      <div style={{ 
                        padding: '1.1rem 1.25rem', 
                        background: 'var(--bg-card-subtle)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.4rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
                          <span>إجمالي المصروفات والأتعاب</span>
                        </div>
                        <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>{totalExp.toLocaleString('en-US')}</span> ج.م
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>رسوم قضايا، أتعاب، أمانات، مصروفات</span>
                      </div>

                      {/* Tile 2: Payments */}
                      <div style={{ 
                        padding: '1.1rem 1.25rem', 
                        background: 'var(--bg-card-subtle)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.4rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                          <span>إجمالي المبالغ المسددة</span>
                        </div>
                        <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>{totalPay.toLocaleString('en-US')}</span> ج.م
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>دفعات نقدية، تحويلات بنكية ومحافظ</span>
                      </div>

                      {/* Tile 3: Net Balance (Unified Style, No Minus Sign) */}
                      <div style={{ 
                        padding: '1.1rem 1.25rem', 
                        background: 'var(--bg-card-subtle)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.4rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDebtor ? '#dc2626' : '#16a34a', display: 'inline-block' }}></span>
                          <span>{isDebtor ? 'المبلغ المستحق على الموكل' : 'الرصيد الصافي المتبقي'}</span>
                        </div>
                        <div style={{ fontSize: '1.45rem', fontWeight: '800', color: isDebtor ? '#dc2626' : '#16a34a', whiteSpace: 'nowrap' }}>
                          <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                            {Math.abs(netBal).toLocaleString('en-US')}
                          </span> ج.م
                        </div>
                        <span style={{ fontSize: '0.75rem', color: isDebtor ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                          {isDebtor ? 'مطلوب سداده للمكتب' : 'رصيد دائن لصالح الموكل'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Add New Transaction Section (Wider & Fully Responsive) */}
              <div className="no-print" style={{ 
                padding: '1.25rem 1.5rem', 
                background: 'var(--bg-card-subtle)', 
                borderRadius: '14px', 
                border: '1px solid var(--border-color)',
                width: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', fontSize: '0.92rem' }}>
                    <Plus size={16} color="var(--primary-700)" />
                    <span>قيد حركة مالية جديدة على حساب الموكل</span>
                  </div>

                  {/* Type Selector Toggle (No ➖ / ➕ icons as requested) */}
                  <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <button 
                      type="button"
                      style={{ 
                        padding: '0.35rem 0.9rem', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px', 
                        border: 'none', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        background: txType === 'expense' ? 'var(--primary-100)' : 'transparent',
                        color: txType === 'expense' ? 'var(--primary-800)' : 'var(--text-muted)',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setTxType('expense')}
                    >
                      مصروف على الموكل
                    </button>
                    <button 
                      type="button"
                      style={{ 
                        padding: '0.35rem 0.9rem', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px', 
                        border: 'none', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        background: txType === 'payment' ? 'var(--primary-100)' : 'transparent',
                        color: txType === 'payment' ? 'var(--primary-800)' : 'var(--text-muted)',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setTxType('payment')}
                    >
                      سداد من الموكل
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddTransactionSubmit}>
                  <div className="statement-form-grid">
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        المبلغ (ج.م) *
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        placeholder="مثال: 500" 
                        className="form-input" 
                        style={{ fontSize: '0.88rem', direction: 'ltr', textAlign: 'left', padding: '0.6rem 0.85rem', width: '100%' }}
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                      />
                    </div>

                    <div className="full-span-tablet">
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        البيان والوصف *
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder={txType === 'expense' ? 'مثال: أمانة خبير، رسم إيداع، أتعاب جلسة...' : 'مثال: دفعة نقدية بالخزينة، تحويل إنستاباي...'} 
                        className="form-input" 
                        style={{ fontSize: '0.88rem', padding: '0.6rem 0.85rem', width: '100%' }}
                        value={txDesc}
                        onChange={(e) => setTxDesc(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        القضية المرتبطة
                      </label>
                      <select 
                        className="form-select" 
                        style={{ fontSize: '0.85rem', padding: '0.6rem 0.85rem', width: '100%' }}
                        value={txCaseId}
                        onChange={(e) => setTxCaseId(e.target.value)}
                      >
                        <option value="">عام (بدون قضية)</option>
                        {cases.filter(c => c.client_id === statementClient.id).map(c => (
                          <option key={c.id} value={c.id}>
                            دعوى {c.case_number}/{c.case_year}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        التاريخ
                      </label>
                      <input 
                        type="date" 
                        className="form-input" 
                        style={{ fontSize: '0.85rem', padding: '0.6rem 0.85rem', width: '100%' }}
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={isSavingTx}
                        style={{ fontSize: '0.88rem', padding: '0.62rem 1.1rem', width: '100%', whiteSpace: 'nowrap', fontWeight: '700' }}
                      >
                        {isSavingTx ? 'جارٍ القيد...' : 'قيد بالحساب'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Detailed Transactions Ledger Table (No ➖ / ➕ signs in column headers or numbers) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    سجل المعاملات المالية والحركات التفصيلية
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {(transactions || []).filter(t => t.client_id === statementClient.id).length} حركة مسجلة
                  </span>
                </div>

                <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>التاريخ</th>
                        <th>البيان والوصف</th>
                        <th style={{ width: '120px' }}>القضية</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>مدين (مصروف)</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>دائن (سداد)</th>
                        <th className="no-print" style={{ width: '50px', textAlign: 'center' }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const clientTx = (transactions || []).filter(t => t.client_id === statementClient.id);
                        if (clientTx.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                                لا توجد حركات تفصيلية مسجلة بعد. استخدم نموذج الإضافة أعلاه لتسجيل المصروفات والدفعات.
                              </td>
                            </tr>
                          );
                        }
                        return clientTx.map((tx) => {
                          const isExpense = tx.type === 'expense';
                          const linkedCase = tx.case_id ? cases.find(c => c.id === tx.case_id) : null;

                          return (
                            <tr key={tx.id}>
                              <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '0.78rem' }}>{tx.date}</td>
                              <td>
                                <div style={{ fontWeight: '600' }}>{tx.description}</div>
                              </td>
                              <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {linkedCase ? `دعوى ${linkedCase.case_number}/${linkedCase.case_year}` : 'عام'}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: '700', color: isExpense ? '#dc2626' : 'var(--text-subtle)' }}>
                                {isExpense ? (
                                  <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                                    {parseFloat(tx.amount).toLocaleString('en-US')}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: '700', color: !isExpense ? '#16a34a' : 'var(--text-subtle)' }}>
                                {!isExpense ? (
                                  <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>
                                    {parseFloat(tx.amount).toLocaleString('en-US')}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="no-print" style={{ textAlign: 'center' }}>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ width: '26px', height: '26px', padding: 0, color: 'var(--status-dismissed)' }}
                                  title="حذف الحركة وتعديل الرصيد"
                                  onClick={() => {
                                    if (window.confirm('هل أنت متأكد من حذف هذه الحركة؟ سيتم تعديل رصيد الموكل تلقائياً.')) {
                                      deleteTransaction(tx.id);
                                    }
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Printable Footer with Stamp & Signature Area */}
              <div className="print-only" style={{ display: 'none', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>المحامي المسؤول</div>
                    <div style={{ height: '50px' }}></div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>.....................................</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>خاتم وتوقيع المكتب</div>
                    <div style={{ height: '50px' }}></div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>.....................................</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions (No Print) */}
            <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Print Bill Button */}
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: '600' }}
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>طباعة كشف الحساب / الفاتورة</span>
                </button>

                {/* Send via Telegram with Confirmation Prompt */}
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.45rem', 
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    background: statementClient.telegram_chat_id ? '#0284c7' : 'var(--border-color)',
                    borderColor: statementClient.telegram_chat_id ? '#0284c7' : 'var(--border-color)',
                    color: '#fff'
                  }}
                  onClick={() => {
                    if (!statementClient.telegram_chat_id) {
                      alert('الموكل غير مربوط بالتليجرام بعد. يرجى الضغط على زر "ربط تليجرام" للموكل أولاً.');
                      return;
                    }
                    setConfirmTelegramBill(true);
                  }}
                >
                  <Send size={15} />
                  <span>إرسال الفاتورة عبر تليجرام</span>
                </button>
              </div>

              <button type="button" className="btn btn-secondary" onClick={() => setStatementClient(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Confirmation Modal Before Sending Bill via Telegram (Prompt Asked as Requested) */}
      {/* ========================================================================= */}
      {confirmTelegramBill && statementClient && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setConfirmTelegramBill(false)}>
          <div className="modal-dialog" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7' }}>
                <MessageSquare size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>
                  تأكيد إرسال كشف الحساب للموكل
                </h3>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setConfirmTelegramBill(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 1rem 0' }}>
                هل تود إرسال كشف الحساب الرسمي والمطالبة المالية الآن إلى تليجرام الموكل:
                <br />
                <strong style={{ color: 'var(--primary-700)', fontSize: '1rem' }}>{statementClient.name}</strong>؟
              </p>

              <div style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <div>• الموقف المالي: {renderBalanceBadge(statementClient.financial_balance, true)}</div>
                <div style={{ marginTop: '0.3rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  • سيتم إرسال ملخص الحساب مع تفاصيل آخر المعاملات المالية وطرق السداد المتاحة.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setConfirmTelegramBill(false)}
                disabled={isSendingBill}
              >
                تراجع
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ background: '#0284c7', borderColor: '#0284c7' }}
                onClick={handleConfirmSendBillTelegram}
                disabled={isSendingBill}
              >
                {isSendingBill ? 'جارٍ الإرسال...' : 'نعم، إرسال المطالبة الآن 🚀'}
              </button>
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
                    ستصل الموكل إشعارات تلقائية فورية عند تأجيل الجلسات، أو صدور قرارات وأحكام، أو تحديث حالة قضاياه المسجلة، بالإضافة لفواتير الأتعاب.
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
                      step="any"
                      className="form-input" 
                      style={{ direction: 'ltr', textAlign: 'left' }}
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
