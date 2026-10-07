import React, { useMemo, useState } from 'react';
import { Search, Wallet, HandCoins, FileText, Printer, TrendingUp, Users, ReceiptText, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatMoney, calculateClientFinancialSummary } from '../lib/financialCalculations';
import { buildFinanceOverview, recentTransactions, printReceipt } from '../lib/financeOverview';
import { formatArabicDate } from '../lib/dateRules';
import ClientFinancialManager from '../components/financial/ClientFinancialManager';
import AddTransactionModal from '../components/financial/AddTransactionModal';
import RowAction, { RowActions } from '../components/common/RowAction';

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'debt', label: 'عليهم مستحقات' },
  { id: 'credit', label: 'رصيد دائن' },
  { id: 'settled', label: 'خالص' },
];

const toneOf = (n) => (n > 0.01 ? 'is-debt' : n < -0.01 ? 'is-credit' : '');

export default function FinancePage() {
  const { clients = [], cases = [], transactions = [], addTransaction, deleteTransaction, officeProfile } = useData();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [statementClient, setStatementClient] = useState(null);
  const [paymentClient, setPaymentClient] = useState(null);

  const overview = useMemo(() => buildFinanceOverview(transactions, clients, cases), [transactions, clients, cases]);
  const recent = useMemo(() => recentTransactions(transactions, clients, 8), [transactions, clients]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return overview.rows
      .filter(r => {
        if (filter === 'debt' && !(r.balance > 0.01)) return false;
        if (filter === 'credit' && !(r.balance < -0.01)) return false;
        if (filter === 'settled' && Math.abs(r.balance) >= 0.01) return false;
        if (q && !((r.client.name || '').toLowerCase().includes(q) || (r.client.phone || '').includes(q))) return false;
        return true;
      })
      .sort((a, b) => b.balance - a.balance);
  }, [overview, filter, query]);

  const receiptFor = (tx) => {
    const client = clients.find(c => c.id === tx.client_id);
    const clientCases = cases.filter(c => c.client_id === tx.client_id);
    const summary = calculateClientFinancialSummary(transactions, client || {}, clientCases);
    const ledgerRow = summary.ledgerWithBalances.find(r => r.id === tx.id);
    printReceipt({
      tx,
      client,
      caseItem: tx.case_id ? cases.find(c => c.id === tx.case_id) : null,
      officeProfile,
      balanceAfter: ledgerRow ? ledgerRow.balanceAfter : undefined,
    });
  };

  const kpis = [
    { label: 'مستحق لدى الموكلين', value: formatMoney(overview.outstanding), foot: `${overview.debtors} موكل عليهم مستحقات`, tone: overview.outstanding > 0 ? 'is-debt' : '', icon: Wallet },
    { label: 'المحصّل هذا الشهر', value: formatMoney(overview.collectedMonth), foot: 'دفعات ومقدمات أتعاب', tone: 'is-credit', icon: HandCoins },
    { label: 'المقيّد هذا الشهر', value: formatMoney(overview.billedMonth), foot: 'أتعاب ومصروفات على الموكلين', tone: '', icon: TrendingUp },
    { label: 'أرصدة دائنة للموكلين', value: formatMoney(overview.credit), foot: 'مبالغ محصّلة تزيد عن المستحق', tone: '', icon: Users },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><span className="page-dot" />إدارة الحسابات والتحصيل</div>
          <h1>الشؤون المالية</h1>
        </div>
      </div>

      <div className="fin-kpis fin-kpis-page">
        {kpis.map(k => (
          <div key={k.label} className={`fin-kpi ${k.tone}`}>
            <div className="fin-kpi-top">
              <span className="fin-kpi-label">{k.label}</span>
              <k.icon size={16} />
            </div>
            <div className={`fin-kpi-value ${k.tone}`}>{k.value}</div>
            <div className="fin-kpi-foot">{k.foot}</div>
          </div>
        ))}
      </div>

      <div className="card fin-clients-card">
        <div className="fin-clients-head">
          <h3 className="fin-card-title"><Users size={18} /> حسابات الموكلين</h3>
          <div className="fin-clients-tools">
            <div className="seg-tabs">
              {FILTERS.map(f => (
                <button key={f.id} type="button" className={`seg-tab ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="cfm-search-input-wrapper fin-search">
              <Search size={15} />
              <input type="text" className="form-input" placeholder="بحث باسم الموكل أو هاتفه..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="fin-empty">لا توجد حسابات مطابقة.</div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table fin-clients-table">
              <thead>
                <tr>
                  <th>الموكل</th>
                  <th className="cell-center">القضايا</th>
                  <th className="cell-num">إجمالي المقيّد</th>
                  <th className="cell-num">المسدد</th>
                  <th className="cell-num">الرصيد</th>
                  <th className="cell-center">آخر دفعة</th>
                  <th className="cell-actions">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.client.id}>
                    <td>
                      <div className="cell-stack">
                        <b>{r.client.name}</b>
                        {r.client.phone && <span className="cell-sub" dir="ltr">{r.client.phone}</span>}
                      </div>
                    </td>
                    <td className="cell-center"><div className="cell-stack">{r.casesCount}</div></td>
                    <td className="cell-num"><div className="cell-stack">{formatMoney(r.charges)}</div></td>
                    <td className="cell-num"><div className="cell-stack">{formatMoney(r.paid)}</div></td>
                    <td className="cell-num">
                      <div className="cell-stack">
                        <span className={`fin-bal ${toneOf(r.balance)}`}>
                          {Math.abs(r.balance) < 0.01 ? 'خالص' : formatMoney(Math.abs(r.balance))}
                        </span>
                        {Math.abs(r.balance) >= 0.01 && <span className="cell-sub">{r.balance > 0 ? 'مستحق على الموكل' : 'رصيد دائن'}</span>}
                      </div>
                    </td>
                    <td className="cell-center">
                      <div className="cell-stack">
                        <span className={r.lastPaymentDate ? '' : 'cell-sub'}>{r.lastPaymentDate ? formatArabicDate(r.lastPaymentDate, false) : 'لا توجد'}</span>
                      </div>
                    </td>
                    <td className="cell-actions">
                      <RowActions>
                        <RowAction icon={HandCoins} label="تحصيل دفعة" tone="primary" onClick={() => setPaymentClient(r.client)} />
                        <RowAction icon={FileText} label="كشف الحساب" onClick={() => setStatementClient(r.client)} />
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card fin-clients-card">
        <div className="fin-clients-head">
          <h3 className="fin-card-title"><ReceiptText size={18} /> آخر الحركات المالية</h3>
        </div>
        {recent.length === 0 ? (
          <div className="fin-empty">لم تُسجَّل أي حركات مالية بعد.</div>
        ) : (
          <ul className="fin-feed">
            {recent.map(tx => (
              <li key={tx.id} className="fin-feed-item">
                <span className={`fin-feed-dot ${tx.isDebit ? 'is-debt' : 'is-credit'}`} />
                <div className="fin-feed-main">
                  <b>{tx.client?.name || 'موكل محذوف'}</b>
                  <span className="cell-sub">{tx.meta.label} — {tx.description}</span>
                </div>
                <div className="fin-feed-side">
                  <b className={tx.isDebit ? 'is-debt' : 'is-credit'}>{tx.isDebit ? '+' : '−'} {formatMoney(tx.amount)}</b>
                  <span className="cell-sub">{formatArabicDate((tx.date || '').split('T')[0], false)}</span>
                </div>
                <button type="button" className="icon-btn" title="طباعة إيصال" aria-label="طباعة إيصال" onClick={() => receiptFor(tx)}>
                  <Printer size={16} strokeWidth={1.9} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {statementClient && (
        <ClientFinancialManager
          client={statementClient}
          cases={cases}
          transactions={transactions}
          onAddTransaction={addTransaction}
          onDeleteTransaction={deleteTransaction}
          onClose={() => setStatementClient(null)}
        />
      )}

      {paymentClient && (
        <AddTransactionModal
          isOpen
          client={paymentClient}
          cases={cases}
          onSave={addTransaction}
          onClose={() => setPaymentClient(null)}
        />
      )}
    </div>
  );
}
