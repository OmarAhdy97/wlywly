import { calculateClientFinancialSummary, isDebitTransaction, getTransactionMeta, getPaymentMethodLabel, formatMoney } from './financialCalculations.js';
import { formatCurrencyToArabic } from './numberToArabicWords.js';
import { notify } from './dialog';
import { formatEgyptPhone } from './phone';

const monthKey = (dateStr) => (dateStr || '').slice(0, 7);

/**
 * One pass over the ledger for the whole office.
 * Every figure comes from calculateClientFinancialSummary, so the finance page,
 * the client cards and the statements always agree.
 */
export function buildFinanceOverview(transactions = [], clients = [], cases = []) {
  const thisMonth = new Date().toISOString().slice(0, 7);

  const rows = clients.map((client) => {
    const clientCases = cases.filter(c => c.client_id === client.id);
    const summary = calculateClientFinancialSummary(transactions, client, clientCases);
    const own = (transactions || []).filter(t => t.client_id === client.id);
    const payments = own.filter(t => !isDebitTransaction(t.type)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return {
      client,
      casesCount: clientCases.length,
      charges: summary.totalCharges,
      paid: summary.totalPayments,
      balance: summary.closingBalance, // > 0: the client owes the office
      lastPaymentDate: payments[0] ? payments[0].date.split('T')[0] : null,
      txCount: summary.totalTransactionsCount,
    };
  });

  let outstanding = 0;
  let credit = 0;
  let debtors = 0;
  rows.forEach(r => {
    if (r.balance > 0.01) { outstanding += r.balance; debtors += 1; }
    else if (r.balance < -0.01) { credit += -r.balance; }
  });

  let collectedMonth = 0;
  let billedMonth = 0;
  (transactions || []).forEach(t => {
    if (monthKey(t.date) !== thisMonth) return;
    const amt = parseFloat(t.amount) || 0;
    if (isDebitTransaction(t.type)) billedMonth += amt; else collectedMonth += amt;
  });

  return { rows, outstanding, credit, debtors, collectedMonth, billedMonth };
}

/** Recent ledger entries across all clients, newest first, with client names attached. */
export function recentTransactions(transactions = [], clients = [], limit = 8) {
  return [...(transactions || [])]
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, limit)
    .map(tx => ({
      ...tx,
      client: clients.find(c => c.id === tx.client_id) || null,
      meta: getTransactionMeta(tx.type),
      isDebit: isDebitTransaction(tx.type),
    }));
}

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/**
 * Opens a printable receipt («إيصال استلام نقدية» / «إشعار قيد») in its own window,
 * so it never depends on the app's print styles.
 */
export function printReceipt({ tx, client, caseItem, officeProfile, balanceAfter }) {
  const amount = parseFloat(tx.amount) || 0;
  const isPayment = !isDebitTransaction(tx.type);
  const title = isPayment ? 'إيصال استلام نقدية' : 'إشعار قيد مستحقات';
  const words = (() => { try { return formatCurrencyToArabic(amount, 'جنيه مصري'); } catch (e) { return ''; } })();
  const date = (tx.date || '').split('T')[0];
  const office = officeProfile || {};
  const balanceLine = balanceAfter === undefined ? '' : (
    balanceAfter > 0.01 ? `الرصيد المتبقي على الموكل بعد هذه الحركة: ${formatMoney(balanceAfter)}`
      : balanceAfter < -0.01 ? `رصيد دائن لصالح الموكل بعد هذه الحركة: ${formatMoney(-balanceAfter)}`
        : 'الحساب خالص بعد هذه الحركة'
  );

  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)} — ${esc(client?.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap">
<style>
  @page { size: A5 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans Arabic','Segoe UI',Tahoma,sans-serif; color: #0f172a; margin: 0; padding: 0; }
  .sheet { border: 1.5px solid #111827; padding: 14px 18px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
  .office b { font-size: 16px; color: #111827; display: block; }
  .office span { font-size: 11px; color: #475569; display: block; }
  h1 { font-size: 18px; margin: 0; color: #111827; text-align: left; }
  .no { font-size: 11px; color: #475569; text-align: left; margin-top: 2px; }
  .row { display: flex; gap: 8px; margin: 7px 0; font-size: 13px; }
  .row .k { color: #475569; min-width: 110px; }
  .row .v { font-weight: 700; flex: 1; border-bottom: 1px dotted #cbd5e1; padding-bottom: 2px; }
  .amount { margin: 12px 0; padding: 8px 12px; background: #f1f5f9; border-radius: 6px; font-size: 13px; }
  .amount strong { font-size: 20px; color: #111827; }
  .foot { display: flex; justify-content: space-between; margin-top: 18px; font-size: 12px; }
  .sig { width: 40%; text-align: center; border-top: 1px solid #0f172a; padding-top: 4px; }
  .note { font-size: 11px; color: #475569; margin-top: 8px; }
</style></head><body><div class="sheet">
  <div class="head">
    <div class="office"><b>${esc(office.office_name || 'مكتب المحاماة')}</b>${office.lawyer_name ? `<span>${esc(office.lawyer_name)}</span>` : ''}${office.address ? `<span>${esc(office.address)}</span>` : ''}${office.phone ? `<span>هاتف: <bdi dir="ltr">${esc(formatEgyptPhone(office.phone, { isolate: false }))}</bdi></span>` : ''}</div>
    <div><h1>${esc(title)}</h1><div class="no">التاريخ: ${esc(date)}</div></div>
  </div>
  <div class="row"><span class="k">${isPayment ? 'استلمنا من السيد/' : 'السيد/'}</span><span class="v">${esc(client?.name)}</span></div>
  <div class="amount">${isPayment ? 'مبلغ وقدره' : 'مستحق بمبلغ'}: <strong>${esc(formatMoney(amount))}</strong><br><span>${esc(words)}</span></div>
  <div class="row"><span class="k">وذلك عن</span><span class="v">${esc(tx.description || getTransactionMeta(tx.type).label)}</span></div>
  ${caseItem ? `<div class="row"><span class="k">القضية</span><span class="v">دعوى ${esc(caseItem.case_number)}/${esc(caseItem.case_year)} — ${esc(caseItem.court_name)}</span></div>` : ''}
  ${isPayment && tx.payment_method ? `<div class="row"><span class="k">طريقة السداد</span><span class="v">${esc(getPaymentMethodLabel(tx.payment_method))}</span></div>` : ''}
  ${balanceLine ? `<div class="note">${esc(balanceLine)}</div>` : ''}
  <div class="foot"><div class="sig">توقيع المستلم</div><div class="sig">ختم المكتب</div></div>
</div><script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };<\/script></body></html>`;

  const w = window.open('', '_blank', 'width=900,height=650');
  if (!w) {
    notify('المتصفح منع فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.', 'warn');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
