import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Coins,
  Scale,
  Info,
  User,
  Mail
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LawFirmPrintHeader from '../components/common/LawFirmPrintHeader';
import {
  generateClientInviteLink,
  sendTestMessage,
  verifyAndFetchClientChatId,
  sendClientStatementTelegram,
  TELEGRAM_BOT_USERNAME
} from '../lib/telegram';
import { printWithTitle, DEFAULT_APP_TITLE } from '../lib/printUtils';
import ClientFinancialManager from '../components/financial/ClientFinancialManager';
import QuickActionModal from '../components/layout/QuickActionModal';
import RowAction, { RowActions } from '../components/common/RowAction';
import { calculateClientFinancialSummary, formatMoney } from '../lib/financialCalculations';

const CLIENT_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'debt', label: 'عليهم مستحقات' },
  { id: 'notg', label: 'بلا تليجرام' },
];

export default function ClientsPage({ setActiveTab }) {
  const {
    clients,
    cases,
    updateClient,
    deleteClient,
    transactions,
    addTransaction,
    deleteTransaction,
    officeProfile
  } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
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

  // Telegram bill confirmation state
  const [confirmTelegramBill, setConfirmTelegramBill] = useState(false);
  const [isSendingBill, setIsSendingBill] = useState(false);
  const [billFeedback, setBillFeedback] = useState(null);

  const getUniqueStatementTitle = (client) => {
    const target = client || statementClient;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const clientName = target?.name || 'موكل';
    return `كشف حساب ومطالبة أتعاب — ${clientName} — ${dateStr} (${timeStr})`;
  };

  // Ensure Ctrl+P while statement modal is open also generates unique document title
  useEffect(() => {
    if (!statementClient) return;
    const onBeforePrint = () => {
      document.title = getUniqueStatementTitle(statementClient).replace(/[/\\:*?"<>|]/g, '-');
    };
    const onAfterPrint = () => {
      document.title = DEFAULT_APP_TITLE;
    };

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [statementClient]);

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
          await sendTestMessage(match.chatId, client.name, user).catch(() => { });

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

  // ONE source of truth for money: the transactions ledger (the same engine the statement uses).
  // Positive = the client owes the office, negative = the client has credit.
  const ledgerBalance = (clientId) =>
    calculateClientFinancialSummary(transactions || [], { id: clientId }, []).closingBalance;

  const renderBalanceBadge = (balance, isDetailed = false) => {
    const num = parseFloat(balance) || 0;
    if (Math.abs(num) < 0.01) {
      return <span className="bal-badge is-settled">{isDetailed ? 'الحساب خالص (0 ج.م)' : 'خالص (0 ج.م)'}</span>;
    }
    const owes = num > 0;
    const label = owes ? (isDetailed ? 'مستحق على الموكل: ' : 'مستحق: ') : (isDetailed ? 'رصيد دائن للموكل: ' : 'رصيد دائن: ');
    return (
      <span className={`bal-badge ${owes ? 'is-debt' : 'is-credit'}`}>
        <span>{label}</span>
        <b dir="ltr">{formatMoney(Math.abs(num), false)}</b>
        <span>ج.م</span>
      </span>
    );
  };

  // Balance comes from the ledger, so the filter and the card always agree
  const visibleClients = filteredClients.filter(c => {
    if (clientFilter === 'debt') return ledgerBalance(c.id) > 0.01;
    if (clientFilter === 'notg') return !c.telegram_chat_id;
    return true;
  });

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      <div className="page-head no-print">
        <div>
          <div className="page-eyebrow"><span className="page-dot" />قاعدة بيانات الموكلين والتوكيلات</div>
          <h1>الموكلون</h1>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setIsAddClientOpen(true)}>
            <Plus size={16} />
            <span>موكل جديد</span>
          </button>
        </div>
      </div>

      <div className="clients-toolbar no-print">
        <div className="fin-search clients-search">
          <Search size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="ابحث باسم الموكل أو هاتفه أو رقمه القومي أو التوكيل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="seg-tabs">
          {CLIENT_FILTERS.map(f => (
            <button key={f.id} type="button" className={`seg-tab ${clientFilter === f.id ? 'is-active' : ''}`} onClick={() => setClientFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="clients-count">{visibleClients.length} موكل</span>
      </div>

      {visibleClients.length === 0 ? (
        <div className="card no-print dash-empty">
          <Users size={32} />
          <b>لا يوجد موكلون مطابقون</b>
        </div>
      ) : (
        <div className="no-print clients-cards-grid">
          {visibleClients.map((client) => {
            const clientCases = cases.filter(c => c.client_id === client.id);
            const isTelegramLinked = !!client.telegram_chat_id;
            return (
              <article key={client.id} className="card client-card">
                <header className="client-card-head">
                  <div className="avatar client-avatar">{client.name ? client.name.charAt(0) : 'م'}</div>
                  <div className="client-card-id">
                    <h3>{client.name}</h3>
                    {client.phone && <span className="cell-sub" dir="ltr">+20 {client.phone.startsWith('0') ? client.phone.substring(1) : client.phone}</span>}
                  </div>
                  <RowActions>
                    <RowAction icon={Edit3} label="تعديل" onClick={() => setEditingClient({ ...client })} />
                    <RowAction icon={Trash2} label="حذف" tone="danger" onClick={() => handleDeleteClient(client.id)} />
                  </RowActions>
                </header>

                <div className="client-poa">
                  <span className="cell-sub">التوكيل</span>
                  <b>{client.power_of_attorney_number || 'غير مسجل'}</b>
                  <span className="cell-sub">{client.power_of_attorney_type || 'توكيل رسمي عام في القضايا'}</span>
                </div>

                <div className="client-stats">
                  <div className="client-stat is-wide">
                    <span className="cell-sub">الرصيد</span>
                    {renderBalanceBadge(ledgerBalance(client.id))}
                  </div>
                  <div className="client-stat">
                    <span className="cell-sub">القضايا</span>
                    <b>{clientCases.length}</b>
                  </div>
                  <button type="button" className={`client-stat client-stat-tg ${isTelegramLinked ? 'is-linked' : ''}`} onClick={() => openTelegramModal(client)}>
                    <span className="cell-sub">تليجرام</span>
                    <b><MessageSquare size={13} /> {isTelegramLinked ? 'مربوط' : 'ربط'}</b>
                  </button>
                </div>

                <footer className="client-card-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedClient(client)}>
                    <Briefcase size={15} />
                    <span>ملف الموكل</span>
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setStatementClient(client); setBillFeedback(null); }}>
                    <Receipt size={15} />
                    <span>كشف الحساب</span>
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Client file (read-only) */}
      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="fin-header-main">
                <div className="avatar client-avatar">{selectedClient.name ? selectedClient.name.charAt(0) : 'م'}</div>
                <div className="fin-header-text">
                  <h3>{selectedClient.name}</h3>
                  <div className="fin-header-sub">الملف التعريفي والبيانات القضائية</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedClient(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <dl className="client-facts">
                <div><dt>الهاتف</dt><dd dir="ltr">{selectedClient.phone ? (selectedClient.phone.startsWith('+') ? selectedClient.phone : `+20 ${selectedClient.phone}`) : 'غير مسجل'}</dd></div>
                <div><dt>الرقم القومي</dt><dd>{selectedClient.national_id || 'غير مسجل'}</dd></div>
                <div><dt>رقم التوكيل</dt><dd>{selectedClient.power_of_attorney_number || 'غير مسجل'}</dd></div>
                <div><dt>نوع التوكيل</dt><dd>{selectedClient.power_of_attorney_type || 'غير مسجل'}</dd></div>
                <div><dt>الموقف المالي</dt><dd>{renderBalanceBadge(ledgerBalance(selectedClient.id), true)}</dd></div>
                <div>
                  <dt>تليجرام</dt>
                  <dd>{selectedClient.telegram_chat_id ? `مربوط (${selectedClient.telegram_chat_id})` : 'غير مربوط'}</dd>
                </div>
              </dl>

              <div className="client-file-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => { const c = selectedClient; setSelectedClient(null); setStatementClient(c); setBillFeedback(null); }}
                >
                  <Receipt size={15} />
                  <span>كشف الحساب</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { const c = selectedClient; setSelectedClient(null); openTelegramModal(c); }}
                >
                  <MessageSquare size={15} />
                  <span>{selectedClient.telegram_chat_id ? 'إدارة ربط التليجرام' : 'ربط بالتليجرام'}</span>
                </button>
              </div>

              <h4 className="client-section-title">الدعاوى المرتبطة بهذا الموكل</h4>
              {cases.filter(c => c.client_id === selectedClient.id).length === 0 ? (
                <p className="cell-sub">لا توجد دعاوى مسجلة باسم هذا الموكل حاليًا.</p>
              ) : (
                <ul className="dash-list">
                  {cases.filter(c => c.client_id === selectedClient.id).map(c => (
                    <li key={c.id} className="dash-row">
                      <div className="dash-row-main">
                        <b>دعوى {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name}</b>
                        <span className="cell-sub">
                          {c.court_name} · الجلسة القادمة: {c.next_session_date ? new Date(c.next_session_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedClient(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Client Financial Management & Statement Modal (Redesigned System) */}
      {/* ========================================================================= */}
      {statementClient && (
        <ClientFinancialManager
          client={statementClient}
          cases={cases}
          transactions={transactions}
          onAddTransaction={async (txData) => {
            const newTx = await addTransaction(txData);
            return newTx;
          }}
          onDeleteTransaction={async (txId) => {
            await deleteTransaction(txId);
          }}
          onClose={() => setStatementClient(null)}
          onSendTelegram={() => {
            if (!statementClient.telegram_chat_id) {
              alert('الموكل غير مربوط بالتليجرام بعد. يرجى الضغط على زر "ربط تليجرام" للموكل أولاً.');
              return;
            }
            setConfirmTelegramBill(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* Confirmation Modal Before Sending Bill via Telegram (Prompt Asked as Requested) */}
      {/* ========================================================================= */}
      {
        confirmTelegramBill && statementClient && (
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
                  <div>• الموقف المالي: {renderBalanceBadge(ledgerBalance(statementClient.id), true)}</div>
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
        )
      }

      {/* Telegram Connection Modal */}
      {
        telegramModalClient && (
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
                    background: telegramStatusMsg.type === 'success' ? 'var(--status-active-bg)' : telegramStatusMsg.type === 'error' ? 'var(--status-dismissed-bg)' : 'var(--status-prelim-bg)',
                    border: '1px solid transparent',
                    color: telegramStatusMsg.type === 'success' ? 'var(--status-active)' : telegramStatusMsg.type === 'error' ? 'var(--status-dismissed)' : 'var(--status-prelim)',
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
                    background: 'var(--status-adjourned-bg)',
                    border: '1px solid transparent',
                    color: 'var(--status-adjourned)',
                    lineHeight: '1.5'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                      <ShieldAlert size={16} />
                      <span>تنبيه: يلزم إضافة العمود في Supabase</span>
                    </div>
                    يرجى فتح لوحة Supabase وكتابة هذا الأمر في SQL Editor:
                    <pre style={{ background: 'var(--bg-card)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '6px', direction: 'ltr', fontSize: '0.75rem', margin: '0.4rem 0' }}>
                      ALTER TABLE clients ADD COLUMN telegram_chat_id BIGINT DEFAULT NULL;
                    </pre>
                  </div>
                )}

                {/* If Linked */}
                {telegramModalClient.telegram_chat_id ? (
                  <div style={{
                    background: 'var(--status-active-bg)',
                    border: '1px solid transparent',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-active)' }}>
                        <CheckCircle size={22} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--status-active)', fontWeight: '800' }}>
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

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
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
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>1</span>
                        <strong style={{ fontSize: '0.9rem' }}>شارك رابط الدعوة مع الموكل:</strong>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.6rem 0' }}>
                        أرسل الرابط التالي للموكل عبر واتساب أو رسالة، ليفتحه على هاتفه:
                      </p>

                      <div className="telegram-link-row">
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
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>2</span>
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
                      <div className="telegram-manual-row">
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
        )
      }

      {/* Edit Client Modal */}
      {
        editingClient && (
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

                  <div className="client-form-grid-2col">
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

                  <div className="client-form-grid-2col">
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

                  <div className="client-form-grid-2col">
                    <div className="form-group">
                      <label className="form-label">الرصيد المالي الحالي</label>
                      <div className="bal-readonly">{renderBalanceBadge(ledgerBalance(editingClient.id), true)}</div>
                      <div className="sd-help">محسوب من الحركات المسجلة. لتعديله أضف حركة من «كشف الحساب».</div>
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
        )
      }
      <QuickActionModal isOpen={isAddClientOpen} initialMode="client" onClose={() => setIsAddClientOpen(false)} />
    </div >
  );
}
