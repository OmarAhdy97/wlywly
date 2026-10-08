import React, { useState, useMemo } from 'react';
import { Printer, Send, Trash2, Search, Plus, X } from 'lucide-react';
import {
  formatMoney,
  calculateClientFinancialSummary,
  getPaymentMethodLabel,
  getExpenseCategoryLabel
} from '../../lib/financialCalculations';
import { printWithTitle } from '../../lib/printUtils';
import { printReceipt } from '../../lib/financeOverview';
import { useData } from '../../context/DataContext';
import AddTransactionModal from './AddTransactionModal';
import ClientAccountStatement from './ClientAccountStatement';
import { confirmDialog, notify } from '../../lib/dialog';
import Select from '../common/Select';

const TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'transactions', label: 'سجل الحركات' },
];

const KINDS = [
  { id: 'all', label: 'الكل' },
  { id: 'fees', label: 'الأتعاب' },
  { id: 'expenses', label: 'المصروفات' },
  { id: 'payments', label: 'المسدد' },
];

const isExpenseType = (t) => t === 'client_expense' || t === 'expense';

const balanceTone = (n) => (n > 0 ? 'is-debt' : n < 0 ? 'is-credit' : '');

/**
 * ClientFinancialManager
 *
 * The big «الإدارة المالية وحساب الموكل» dialog. The four headline tiles and the per-case
 * breakdown always describe the WHOLE account (the same figures as the client card).
 * The case filter and the search box only narrow the ledger underneath them.
 */
export default function ClientFinancialManager({
  client,
  cases = [],
  transactions = [],
  onAddTransaction,
  onDeleteTransaction,
  onClose,
  onSendTelegram = null
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [kind, setKind] = useState('all');
  const [showIdle, setShowIdle] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const { officeProfile } = useData();

  const clientCases = useMemo(() => {
    if (!client) return [];
    return cases.filter(c => c.client_id === client.id);
  }, [cases, client]);

  // The whole account: headline tiles and case breakdown
  const overall = useMemo(() => {
    if (!client) return null;
    return calculateClientFinancialSummary(transactions, client, clientCases);
  }, [transactions, client, clientCases]);

  // The ledger, narrowed by the case filter
  const filtered = useMemo(() => {
    if (!client) return null;
    if (selectedCaseId === 'ALL') return overall;
    return calculateClientFinancialSummary(transactions, client, clientCases, { caseId: selectedCaseId });
  }, [transactions, client, clientCases, selectedCaseId, overall]);

  const counts = useMemo(() => {
    const own = (transactions || []).filter(t => t.client_id === client?.id);
    return { transactions: own.length };
  }, [transactions, client]);

  const displayLedger = useMemo(() => {
    if (!filtered) return [];
    let list = filtered.displayLedger;
    if (kind === 'fees') list = list.filter(tx => tx.type === 'fee');
    else if (kind === 'expenses') list = list.filter(tx => isExpenseType(tx.type));
    else if (kind === 'payments') list = list.filter(tx => !tx.isDebit);

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(tx =>
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.caseNumber || '').toLowerCase().includes(q) ||
        (tx.typeMeta?.label || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [filtered, kind, searchTerm]);

  if (!client || !overall) return null;

  const hasActivity = (b) => b.fees || b.clientExpenses || b.payments || b.balance;
  const activeBreakdown = overall.caseBreakdown.filter(hasActivity);
  const idleCount = overall.caseBreakdown.length - activeBreakdown.length;
  const breakdown = showIdle ? overall.caseBreakdown : activeBreakdown;

  const handlePrintStatement = () => {
    document.body.classList.add('printing-statement-document');
    const title = `كشف_حساب_الموكل_${client.name?.replace(/\s+/g, '_') || 'موكل'}_${overall.effectiveEndDate || ''}`;
    printWithTitle(title);
    setTimeout(() => {
      document.body.classList.remove('printing-statement-document');
    }, 2000);
  };

  const handleDelete = async (txId) => {
    if (!await confirmDialog('هل أنت متأكد من حذف هذه الحركة المالية نهائياً؟ سيتم إعادة احتساب الرصيد تلقائياً.', { danger: true, confirmLabel: 'حذف' })) return;
    try {
      setIsDeletingId(txId);
      await onDeleteTransaction(txId);
    } catch (err) {
      notify('خطأ أثناء حذف المعاملة: ' + err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const tabCount = { overview: null, transactions: counts.transactions };
  const heroLabel = overall.isDebtor ? 'المستحق على الموكل' : overall.isCreditor ? 'المتبقي لصالح الموكل' : 'الرصيد المستحق';
  const heroTone = overall.isDebtor ? 'is-debt' : overall.isCreditor ? 'is-credit' : '';

  const typeBadge = (tx) => (
    <span
      className="fin-type"
      style={{ backgroundColor: tx.typeMeta.badgeBg, color: tx.typeMeta.badgeColor, borderColor: 'transparent' }}
    >
      {tx.typeMeta.label}
    </span>
  );

  const tags = (tx) => (
    <>
      {tx.payment_method && <span className="fin-tag is-method">{getPaymentMethodLabel(tx.payment_method)}</span>}
      {tx.expense_category && <span className="fin-tag is-category">{getExpenseCategoryLabel(tx.expense_category)}</span>}
    </>
  );

  const receiptBtn = (tx) => (
    <button
      type="button"
      className="icon-btn"
      onClick={() => printReceipt({
        tx,
        client,
        caseItem: tx.case_id ? cases.find(c => c.id === tx.case_id) : null,
        officeProfile,
        balanceAfter: tx.balanceAfter,
      })}
      title="طباعة إيصال"
      aria-label="طباعة إيصال"
    >
      <Printer size={16} strokeWidth={1.9} />
    </button>
  );

  const deleteBtn = (tx) => (
    <button
      type="button"
      className="icon-btn is-danger"
      onClick={() => handleDelete(tx.id)}
      disabled={isDeletingId === tx.id}
      title="حذف الحركة"
      aria-label="حذف الحركة"
    >
      <Trash2 size={16} strokeWidth={1.9} />
    </button>
  );

  return (
    <div className="modal-backdrop statement-modal-backdrop fin-backdrop" onClick={onClose}>
      <div className="modal-dialog client-financial-dashboard fin-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header cfm-modal-header fin-header">
          <div className="fin-header-main">
            <div className="fin-header-text">
              <h3>حساب الموكل: {client.name}</h3>
              <div className="fin-header-sub">
                {[client.power_of_attorney_number && `توكيل رقم ${client.power_of_attorney_number}`, client.phone].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className="cfm-header-actions">
            <button type="button" className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>إضافة حركة</span>
            </button>
          </div>
          <button type="button" className="icon-btn cfm-close-btn" onClick={onClose} title="إغلاق" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body cfm-modal-body fin-body">
          {/* Headline tiles — always the whole account */}
          <div className="fin-kpis">
            <div className={`fin-kpi fin-kpi-hero ${heroTone}`}>
              <div className="fin-kpi-top">
                <span className="fin-kpi-label">{heroLabel}</span>
              </div>
              <div className="fin-kpi-value">{formatMoney(overall.outstandingBalance)}</div>
              <div className="fin-kpi-foot is-tafqeet">{overall.tafqeetBalance}</div>
            </div>

            <div className="fin-kpi">
              <div className="fin-kpi-top"><span className="fin-kpi-label">إجمالي الأتعاب</span></div>
              <div className="fin-kpi-value">{formatMoney(overall.totalFees)}</div>
            </div>

            <div className="fin-kpi">
              <div className="fin-kpi-top"><span className="fin-kpi-label">المصروفات</span></div>
              <div className="fin-kpi-value is-warn">{formatMoney(overall.totalClientExpenses)}</div>
            </div>

            <div className="fin-kpi">
              <div className="fin-kpi-top"><span className="fin-kpi-label">المسدد</span></div>
              <div className="fin-kpi-value is-credit">{formatMoney(overall.totalPayments)}</div>
            </div>
          </div>

          {/* Tabs and filters */}
          <div className="fin-toolbar">
            <div className="cfm-tabs-container fin-tabs" role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`fin-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tabCount[tab.id] !== null && <span className="fin-tab-count">{tabCount[tab.id]}</span>}
                </button>
              ))}
            </div>

            {activeTab !== 'overview' && (
              <div className="cfm-filters-container fin-filters">
                <div className="seg-tabs fin-kinds" role="tablist">
                  {KINDS.map(k => (
                    <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={`seg-tab ${kind === k.id ? 'is-active' : ''}`} onClick={() => setKind(k.id)}>
                      {k.label}
                    </button>
                  ))}
                </div>
                <Select className="form-select" value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)}>
                  <option value="ALL">كل القضايا والحساب العام</option>
                  <option value="GENERAL">عام (بدون قضية)</option>
                  {clientCases.map(c => (
                    <option key={c.id} value={c.id}>دعوى {c.case_number}/{c.case_year}</option>
                  ))}
                </Select>
                <div className="cfm-search-input-wrapper fin-search">
                  <Search size={15} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="بحث في الحركات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="fin-card">
                <div className="fin-card-head">
                  <h4 className="fin-card-title">الموقف المالي بحسب القضايا</h4>
                  <span className="fin-card-meta">
                    {overall.totalTransactionsCount} حركة
                    {overall.firstTxDate ? ` · من ${overall.firstTxDate} إلى ${overall.lastTxDate}` : ''}
                  </span>
                </div>

                {breakdown.length === 0 ? (
                  <p className="empty-line">لا توجد حركات مسجلة على أي قضية بعد.</p>
                ) : (
                  <>
                    <div className="cfm-table-desktop fin-scroll">
                      <table className="fin-table">
                        <thead>
                          <tr>
                            <th>القضية</th>
                            <th className="is-num">الأتعاب</th>
                            <th className="is-num">المصروفات</th>
                            <th className="is-num">المسدد</th>
                            <th className="is-num">المتبقي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.map(b => (
                            <tr key={b.caseId}>
                              <td>
                                <div className="is-strong">{b.caseNumber}</div>
                                {b.courtName && <div className="is-muted fin-sub">{b.courtName}</div>}
                              </td>
                              <td className="is-num" dir="ltr">{formatMoney(b.fees, false)}</td>
                              <td className="is-num" dir="ltr">{formatMoney(b.clientExpenses, false)}</td>
                              <td className="is-num is-credit" dir="ltr">{formatMoney(b.payments, false)}</td>
                              <td className={`is-num is-strong ${balanceTone(b.balance)}`} dir="ltr">{formatMoney(b.balance, false)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="cfm-cards-mobile">
                      {breakdown.map(b => (
                        <div key={b.caseId} className="fin-mini-card">
                          <div className="fin-mini-head">
                            <span className="fin-case-pill">{b.caseNumber}</span>
                            <span className="fin-mini-sub">{b.courtName}</span>
                          </div>
                          <div className="fin-mini-grid">
                            <div><span>الأتعاب</span><b dir="ltr">{formatMoney(b.fees)}</b></div>
                            <div><span>المصروفات</span><b dir="ltr">{formatMoney(b.clientExpenses)}</b></div>
                            <div><span>المسدد</span><b className="is-credit" dir="ltr">{formatMoney(b.payments)}</b></div>
                            <div><span>المتبقي</span><b className={balanceTone(b.balance)} dir="ltr">{formatMoney(b.balance)}</b></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {idleCount > 0 && (
                  <button type="button" className="fin-idle-toggle" onClick={() => setShowIdle(v => !v)}>
                    {showIdle ? 'إخفاء القضايا بلا حركات' : `إظهار ${idleCount} قضية بلا حركات مالية`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* LEDGER */}
          {activeTab !== 'overview' && (
            <div className="fin-card fin-card-flush">
              {selectedCaseId !== 'ALL' && (
                <div className="fin-filter-note">
                  عرض حركات القضية المختارة فقط — إجمالي الحساب بالأعلى يشمل كل القضايا.
                </div>
              )}

              <div className="cfm-table-desktop fin-scroll">
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>النوع</th>
                      <th>البيان والوصف</th>
                      <th>القضية</th>
                      <th className="is-num">مستحق (مدين)</th>
                      <th className="is-num">مسدد (دائن)</th>
                      <th className="is-num">الرصيد التراكمي</th>
                      <th className="is-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLedger.length === 0 ? (
                      <tr><td colSpan={8} className="fin-empty">لا توجد معاملات مسجلة تطابق الفلاتر الحالية.</td></tr>
                    ) : (
                      displayLedger.map((tx) => (
                        <tr key={tx.id}>
                          <td className="is-muted is-nowrap" dir="ltr">{(tx.date || '').split('T')[0]}</td>
                          <td>{typeBadge(tx)}</td>
                          <td>
                            <div className="is-strong">{tx.description}</div>
                            <div className="fin-tags">{tags(tx)}</div>
                          </td>
                          <td className="is-muted">{tx.caseNumber}</td>
                          <td className="is-num is-debt" dir="ltr">{tx.isDebit ? formatMoney(tx.amountNum, false) : '—'}</td>
                          <td className="is-num is-credit" dir="ltr">{!tx.isDebit ? formatMoney(tx.amountNum, false) : '—'}</td>
                          <td className={`is-num is-strong ${balanceTone(tx.balanceAfter)}`} dir="ltr">{formatMoney(tx.balanceAfter, false)}</td>
                          <td className="is-center"><div className="row-actions">{receiptBtn(tx)}{deleteBtn(tx)}</div></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="cfm-cards-mobile">
                {displayLedger.length === 0 ? (
                  <div className="fin-empty">لا توجد معاملات مسجلة تطابق الفلاتر الحالية.</div>
                ) : (
                  displayLedger.map((tx) => (
                    <div key={tx.id} className="fin-mini-card">
                      <div className="fin-mini-head">
                        <div className="fin-mini-meta">
                          {typeBadge(tx)}
                          <span className="fin-mini-sub" dir="ltr">{(tx.date || '').split('T')[0]}</span>
                        </div>
                        <div className="row-actions">{receiptBtn(tx)}{deleteBtn(tx)}</div>
                      </div>
                      <div>
                        <div className="is-strong">{tx.description}</div>
                        <div className="fin-tags">
                          {tx.caseNumber && tx.caseNumber !== 'عام' && <span className="fin-tag is-case">دعوى: {tx.caseNumber}</span>}
                          {tags(tx)}
                        </div>
                      </div>
                      <div className="fin-mini-foot">
                        <div>
                          <span>{tx.isDebit ? 'المستحق:' : 'المسدد:'}</span>
                          <b className={tx.isDebit ? 'is-debt' : 'is-credit'} dir="ltr">{formatMoney(tx.amountNum)}</b>
                        </div>
                        <div>
                          <span>الرصيد:</span>
                          <b className={balanceTone(tx.balanceAfter)} dir="ltr">{formatMoney(tx.balanceAfter)}</b>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer cfm-modal-footer fin-footer">
          <button type="button" className="btn btn-primary" onClick={handlePrintStatement}>
            <Printer size={16} />
            <span>طباعة كشف الحساب (A4)</span>
          </button>
          {onSendTelegram && (
            <button type="button" className={`btn ${client.telegram_chat_id ? 'btn-telegram' : 'btn-secondary'}`} onClick={onSendTelegram}>
              <Send size={15} />
              <span>إرسال عبر تليجرام</span>
            </button>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          client={client}
          cases={cases}
          onSave={onAddTransaction}
        />
      )}

      {/* Official printable statement (hidden on screen, attached for instant browser print) */}
      <ClientAccountStatement client={client} cases={cases} transactions={transactions} />
    </div>
  );
}
