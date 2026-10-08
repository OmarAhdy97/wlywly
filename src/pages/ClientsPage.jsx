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
import PhoneField from '../components/common/PhoneField';
import { takeFocusTarget, onFocusTarget } from '../lib/focusTarget';
import { calculateClientFinancialSummary, formatMoney } from '../lib/financialCalculations';
import { confirmDialog, notify } from '../lib/dialog';
import PersonFileDialog from '../components/history/PersonFileDialog';
import { formatEgyptPhone } from '../lib/phone';

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

  // opened from the global search: show just that client
  useEffect(() => {
    const open = (t) => { setClientFilter('all'); setSearchTerm(t.name || ''); };
    const pending = takeFocusTarget('client');
    if (pending) open(pending);
    return onFocusTarget('client', open);
  }, []);
  const [clientFilter, setClientFilter] = useState('all');
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  // A window opened from a client's file returns to that file when it closes.
  const [returnClientId, setReturnClientId] = useState(null);
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
    if (await confirmDialog('هل أنت متأكد من حذف هذا الموكل؟', { danger: true, confirmLabel: 'حذف' })) {
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
        notify('تنبيه: يجب إضافة حقل telegram_chat_id في جدول clients في Supabase أولاً.\nالأمر:\nALTER TABLE clients ADD COLUMN telegram_chat_id BIGINT DEFAULT NULL;', 'warn');
      } else {
        notify('خطأ أثناء تعديل بيانات الموكل: ' + err.message);
      }
    }
  };

  // Open Telegram connection modal
  useEffect(() => {
    if (!returnClientId || statementClient || editingClient || telegramModalClient) return;
    const back = clients.find((c) => c.id === returnClientId);
    setReturnClientId(null);
    if (back) setSelectedClient(back);
  }, [returnClientId, statementClient, editingClient, telegramModalClient, clients]);

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
      notify('يرجى كتابة رقم الـ Chat ID', 'warn');
      return;
    }
    const parsedId = parseInt(manualChatId.trim());
    if (isNaN(parsedId)) {
      notify('الـ Chat ID يجب أن يتكون من أرقام فقط', 'warn');
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
        notify('خطأ أثناء حفظ المعرف: ' + dbErr.message);
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
    if (!await confirmDialog('هل أنت متأكد من إلغاء ربط تليجرام هذا الموكل؟ لن تصله إشعارات الجلسات التلقائية.')) {
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
      notify('خطأ: ' + err.message);
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
    <div className="page-wrapper">
      <div className="page-head no-print">
        <div>
          <h1>الموكلون</h1>
          <p className="page-sub">{visibleClients.length === clients.length ? `${clients.length} موكل` : `${visibleClients.length} من ${clients.length} موكل`}</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setIsAddClientOpen(true)}>
            <Plus size={16} />
            <span>موكل جديد</span>
          </button>
        </div>
      </div>

      <div className="page-toolbar no-print">
        <div className="page-search">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="اسم الموكل، الهاتف، الرقم القومي، التوكيل"
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
      </div>

      {visibleClients.length === 0 ? (
        <div className="card no-print empty-block">
          <h3>لا يوجد موكلون مطابقون</h3>
          <p>غيّر البحث أو الفلتر، أو أضف موكلاً جديداً.</p>
        </div>
      ) : (
        <div className="no-print card row-list">
          {visibleClients.map((client) => {
            const clientCases = cases.filter(c => c.client_id === client.id);
            const isTelegramLinked = !!client.telegram_chat_id;
            return (
              <article key={client.id} className="list-row">
                <div className="list-row-main">
                  <div className="list-row-body list-row-person is-clickable" onClick={() => setSelectedClient(client)}>
                    <div className="list-row-person-text">
                      <div className="list-row-top">
                        <button type="button" className="row-title row-title-link"><span className="row-title-text">{client.name}</span></button>
                        {isTelegramLinked && <span className="status-chip" style={{ '--dot': 'var(--accent)' }}>تليجرام</span>}
                      </div>
                      <p className="list-row-sub">
                        {[client.phone && formatEgyptPhone(client.phone),
                          client.power_of_attorney_number ? `توكيل ${client.power_of_attorney_number}` : 'بدون توكيل مسجل',
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>

                  <dl className="list-row-facts">
                    <div><dt>القضايا</dt><dd>{clientCases.length}</dd></div>
                    <div><dt>الرصيد</dt><dd>{renderBalanceBadge(ledgerBalance(client.id))}</dd></div>
                  </dl>

                  <div className="list-row-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setStatementClient(client); setBillFeedback(null); }}>
                      <Receipt size={14} /> كشف الحساب
                    </button>
                    <RowActions>
                      <RowAction icon={MessageSquare} label={isTelegramLinked ? 'إعدادات تليجرام' : 'ربط تليجرام'} onClick={() => openTelegramModal(client)} />
                      <RowAction icon={Edit3} label="تعديل" onClick={() => setEditingClient({ ...client })} />
                      <RowAction icon={Trash2} label="حذف" tone="danger" onClick={() => handleDeleteClient(client.id)} />
                    </RowActions>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Client file: details, linked work and the history of each */}
      {selectedClient && (
        <PersonFileDialog
          kind="client"
          person={selectedClient}
          onClose={() => setSelectedClient(null)}
          facts={[
            ['الهاتف', selectedClient.phone ? formatEgyptPhone(selectedClient.phone) : 'غير مسجل'],
            ['الرقم القومي', selectedClient.national_id || 'غير مسجل'],
            ['رقم التوكيل', selectedClient.power_of_attorney_number || 'غير مسجل'],
            ['نوع التوكيل', selectedClient.power_of_attorney_type || 'غير مسجل'],
            ['الموقف المالي', renderBalanceBadge(ledgerBalance(selectedClient.id), true)],
            ['تليجرام', selectedClient.telegram_chat_id ? 'مربوط' : 'غير مربوط'],
          ]}
          actions={(
            <>
              <button type="button" className="btn btn-primary" onClick={() => { const c = selectedClient; setReturnClientId(c.id); setSelectedClient(null); setStatementClient(c); setBillFeedback(null); }}>
                <Receipt size={15} /> كشف الحساب
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { const c = selectedClient; setReturnClientId(c.id); setSelectedClient(null); setEditingClient({ ...c }); }}>
                <Edit3 size={15} /> تعديل
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { const c = selectedClient; setReturnClientId(c.id); setSelectedClient(null); openTelegramModal(c); }}>
                <MessageSquare size={15} /> {selectedClient.telegram_chat_id ? 'تليجرام' : 'ربط تليجرام'}
              </button>
            </>
          )}
        />
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
              notify('الموكل غير مربوط بالتليجرام بعد. يرجى الضغط على زر "ربط تليجرام" للموكل أولاً.', 'warn');
              return;
            }
            setConfirmTelegramBill(true);
          }}
        />
      )}

      {confirmTelegramBill && statementClient && (
        <div className="modal-backdrop confirm-backdrop" onClick={() => setConfirmTelegramBill(false)}>
          <div className="modal-dialog confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إرسال كشف الحساب للموكل</h3>
              <button type="button" className="icon-btn" onClick={() => setConfirmTelegramBill(false)} aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                سيُرسل كشف الحساب والمطالبة المالية الآن إلى تليجرام الموكل <strong>{statementClient.name}</strong>.
              </p>
              <div className="update-summary">
                <div>الموقف المالي: {renderBalanceBadge(ledgerBalance(statementClient.id), true)}</div>
                <span className="cell-sub">يتضمن الملخص آخر المعاملات المالية وطرق السداد المتاحة.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmTelegramBill(false)} disabled={isSendingBill}>
                تراجع
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmSendBillTelegram} disabled={isSendingBill}>
                {isSendingBill ? 'جارٍ الإرسال…' : 'إرسال الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {telegramModalClient && (
        <div className="modal-backdrop" onClick={() => setTelegramModalClient(null)}>
          <div className="modal-dialog tg-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>ربط تليجرام: {telegramModalClient.name}</h3>
                <span className="cell-sub">بوت المكتب @{TELEGRAM_BOT_USERNAME}</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setTelegramModalClient(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body tg-body">
              {telegramStatusMsg && (
                <div className={`auth-alert ${telegramStatusMsg.type === 'success' ? 'is-ok' : telegramStatusMsg.type === 'error' ? 'is-error' : 'is-info'}`} role="status">
                  {telegramStatusMsg.text}
                </div>
              )}

              {schemaError && (
                <div className="auth-alert is-warn" role="alert">
                  <strong>يلزم إضافة العمود في Supabase.</strong> شغّل هذا الأمر في SQL Editor:
                  <pre className="tg-code">ALTER TABLE clients ADD COLUMN telegram_chat_id BIGINT DEFAULT NULL;</pre>
                </div>
              )}

              {telegramModalClient.telegram_chat_id ? (
                <div className="tg-linked">
                  <strong>الحساب مربوط</strong>
                  <span className="cell-sub">
                    معرّف المحادثة: <code>{telegramModalClient.telegram_chat_id}</code>
                  </span>
                  <p>تصل الموكل إشعارات عند تأجيل الجلسات وصدور الأحكام وتحديث حالة قضاياه، إضافة إلى مطالبات الأتعاب.</p>
                  <div className="tg-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSendTest(telegramModalClient)} disabled={isSendingTest}>
                      {isSendingTest ? 'جارٍ الإرسال…' : 'إرسال رسالة تجريبية'}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleUnlinkTelegram(telegramModalClient)}>
                      إلغاء الربط
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <section className="tg-step">
                    <h4><span className="tg-num">1</span> أرسل رابط الدعوة للموكل</h4>
                    <p>أرسل الرابط عبر واتساب ليفتحه على هاتفه.</p>
                    <div className="telegram-link-row">
                      <input type="text" readOnly className="form-input tg-link" value={generateClientInviteLink(telegramModalClient.id)} />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCopyLink(telegramModalClient.id)}>
                        {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                        <span>{copiedLink ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                      <a
                        href={generateClientInviteLink(telegramModalClient.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-btn"
                        title="فتح في تليجرام"
                        aria-label="فتح في تليجرام"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </section>

                  <section className="tg-step">
                    <h4><span className="tg-num">2</span> تأكيد الربط</h4>
                    <p>بعد أن يضغط الموكل زر <b>Start</b> في تليجرام، اضغط للتحقق.</p>
                    <button type="button" className="btn btn-primary tg-check" onClick={() => handleCheckTelegramLink(telegramModalClient)} disabled={isCheckingTelegram}>
                      <RefreshCw size={16} className={isCheckingTelegram ? 'spin' : ''} />
                      <span>{isCheckingTelegram ? 'جارٍ الفحص…' : 'فحص الربط'}</span>
                    </button>
                  </section>

                  <section className="tg-manual">
                    <span className="cell-sub">أو أدخل معرّف المحادثة (Chat ID) يدوياً إن كان معروفاً:</span>
                    <div className="telegram-manual-row">
                      <input
                        type="text"
                        className="form-input tg-link"
                        placeholder="123456789"
                        value={manualChatId}
                        onChange={(e) => setManualChatId(e.target.value)}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleManualSaveChatId(telegramModalClient)}>
                        حفظ
                      </button>
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setTelegramModalClient(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

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
                      <PhoneField value={editingClient.phone || ''} onChange={(v) => setEditingClient({ ...editingClient, phone: v })} />
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
