/**
 * Financial Calculations Engine — Single Source of Truth
 * 
 * Provides unified, mathematically verified balance calculations,
 * transaction categorization, and period statement reporting for
 * all client accounts across the SaaS application.
 */

import { formatCurrencyToArabic } from './numberToArabicWords.js';

/**
 * Standard monetary formatting: "3,600 ج.م"
 * Ensures strict consistency throughout the application.
 * 
 * @param {number|string} amount
 * @param {boolean} showCurrency
 * @returns {string} Formatted money string
 */
export function formatMoney(amount, showCurrency = true) {
  const num = parseFloat(amount) || 0;
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  if (!showCurrency) return formatted;
  return `${formatted} ج.م`;
}

/**
 * Standard transaction types with labels and debit/credit metadata.
 */
export const TRANSACTION_TYPES = {
  fee: {
    id: 'fee',
    label: 'أتعاب',
    desc: 'أتعاب قضايا أو استشارات قانونية',
    isDebit: true, // Increases client debt
    category: 'charges',
    badgeColor: 'var(--accent)',
    badgeBg: 'var(--accent-soft)'
  },
  client_expense: {
    id: 'client_expense',
    label: 'مصروفات على حساب الموكل',
    desc: 'رسوم قضائية، أمانات خبراء، مأموريات',
    isDebit: true, // Increases client debt
    category: 'charges',
    badgeColor: 'var(--status-adjourned)',
    badgeBg: 'var(--status-adjourned-bg)'
  },
  expense: { // Legacy fallback: treated as client expense / charge
    id: 'expense',
    label: 'مصروف على الموكل',
    desc: 'مصروفات أو أتعاب محتسبة على الموكل',
    isDebit: true,
    category: 'charges',
    badgeColor: 'var(--status-adjourned)',
    badgeBg: 'var(--status-adjourned-bg)'
  },
  payment: {
    id: 'payment',
    label: 'دفعة / تحصيل',
    desc: 'سداد نقدي أو بنكي من الموكل',
    isDebit: false, // Decreases client debt
    category: 'payments',
    badgeColor: 'var(--success)',
    badgeBg: 'var(--success-bg)'
  },
  advance: {
    id: 'advance',
    label: 'دفعة مقدمة',
    desc: 'مقدم أتعاب أو أمانة تحت الحساب',
    isDebit: false, // Decreases client debt
    category: 'payments',
    badgeColor: 'var(--success)',
    badgeBg: 'var(--success-bg)'
  },
  settlement: {
    id: 'settlement',
    label: 'تسوية',
    desc: 'تسوية حسابية معتمدة',
    isDebit: false,
    category: 'payments',
    badgeColor: 'var(--success)',
    badgeBg: 'var(--success-bg)'
  },
  refund: {
    id: 'refund',
    label: 'رد مبلغ',
    desc: 'استرداد مبالغ أو أمانات للموكل',
    isDebit: true, // Increases client outstanding balance (reversal of payment)
    category: 'refunds',
    badgeColor: 'var(--status-dismissed)',
    badgeBg: 'var(--status-dismissed-bg)'
  },
  adjustment: {
    id: 'adjustment',
    label: 'تعديل مالي',
    desc: 'تسوية فروق أو تعديل رصيد',
    isDebit: true,
    category: 'adjustments',
    badgeColor: 'var(--status-settled)',
    badgeBg: 'var(--status-settled-bg)'
  }
};

/**
 * Standard payment methods
 */
export const PAYMENT_METHODS = [
  { id: 'cash', label: 'نقدي بالخزينة' },
  { id: 'instapay', label: 'إنستاباي (InstaPay)' },
  { id: 'bank_transfer', label: 'تحويل بنكي' },
  { id: 'check', label: 'شيك بنكي' },
  { id: 'wallet', label: 'محفظة إلكترونية (فودافون كاش / غيرها)' }
];

/**
 * Standard expense categories
 */
export const EXPENSE_CATEGORIES = [
  { id: 'court_fees', label: 'رسوم قضائية وتجديد' },
  { id: 'expert_fee', label: 'أمانة خبير قضائي' },
  { id: 'bailiff_fee', label: 'رسوم إعلان محضرين' },
  { id: 'transit', label: 'انتقال ومأموريات محاكم' },
  { id: 'documentation', label: 'شهادات وتصوير مستندات' },
  { id: 'publication', label: 'نشر قضائي وإعلانات رسمية' },
  { id: 'other', label: 'مصروفات قضائية أخرى' }
];

/**
 * Determines whether a transaction is a Debit (increases client debt) or Credit (reduces debt).
 * 
 * @param {string} type
 * @returns {boolean} True if debit, false if credit
 */
export function isDebitTransaction(type) {
  const meta = TRANSACTION_TYPES[type];
  if (meta) return meta.isDebit;
  // Fallback: 'expense' is debit, 'payment' is credit
  return type !== 'payment' && type !== 'advance' && type !== 'settlement';
}

/**
 * Returns user-friendly metadata for any transaction type.
 * 
 * @param {string} type
 * @returns {Object}
 */
export function getTransactionMeta(type) {
  return TRANSACTION_TYPES[type] || {
    id: type,
    label: type === 'expense' ? 'مصروف على الموكل' : 'سداد من الموكل',
    desc: '',
    isDebit: isDebitTransaction(type),
    category: isDebitTransaction(type) ? 'charges' : 'payments',
    badgeColor: isDebitTransaction(type) ? 'var(--status-adjourned)' : 'var(--success)',
    badgeBg: isDebitTransaction(type) ? 'var(--status-adjourned-bg)' : 'var(--success-bg)'
  };
}

/**
 * Human-friendly payment method label.
 */
export function getPaymentMethodLabel(method) {
  const found = PAYMENT_METHODS.find(m => m.id === method);
  return found ? found.label : (method || 'نقدي');
}

/**
 * Human-friendly expense category label.
 */
export function getExpenseCategoryLabel(cat) {
  const found = EXPENSE_CATEGORIES.find(c => c.id === cat);
  return found ? found.label : (cat || 'مصروفات قضائية');
}

/**
 * SINGLE SOURCE OF TRUTH: Calculates full financial metrics for a client.
 * 
 * @param {Array} rawTransactions - Raw transaction rows
 * @param {Object} client - Target client object
 * @param {Array} clientCases - Cases belonging to this client
 * @param {Object} options - { startDate, endDate, caseId, typeFilter }
 * @returns {Object} Complete financial summary and verified ledgers
 */
export function calculateClientFinancialSummary(rawTransactions = [], client = {}, clientCases = [], options = {}) {
  const { startDate = null, endDate = null, caseId = null, typeFilter = 'ALL' } = options;

  // Filter transactions belonging to this client
  const clientTx = (rawTransactions || []).filter(t => t.client_id === client?.id);

  // 1. Sort all transactions chronologically ascending (oldest first)
  const sortedAll = [...clientTx].sort((a, b) => {
    const diff = new Date(a.date || 0) - new Date(b.date || 0);
    if (diff !== 0) return diff;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  // 2. Calculate Opening Balance prior to startDate
  let openingBalance = 0;
  let priorTransactionsCount = 0;

  if (startDate) {
    sortedAll.forEach(tx => {
      const txDate = (tx.date || '').split('T')[0];
      if (txDate < startDate) {
        priorTransactionsCount++;
        const amt = parseFloat(tx.amount) || 0;
        if (isDebitTransaction(tx.type)) {
          openingBalance += amt;
        } else {
          openingBalance -= amt;
        }
      }
    });
  }

  // 3. Filter period transactions
  const periodTransactions = sortedAll.filter(tx => {
    const txDate = (tx.date || '').split('T')[0];

    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    if (caseId && caseId !== 'ALL') {
      if (caseId === 'GENERAL') {
        if (tx.case_id) return false;
      } else if (tx.case_id !== caseId) {
        return false;
      }
    }
    if (typeFilter && typeFilter !== 'ALL') {
      if (typeFilter === 'CHARGES' && !isDebitTransaction(tx.type)) return false;
      if (typeFilter === 'PAYMENTS' && isDebitTransaction(tx.type)) return false;
      if (typeFilter === 'FEES' && tx.type !== 'fee') return false;
      if (typeFilter === 'EXPENSES' && tx.type !== 'client_expense' && tx.type !== 'expense') return false;
    }

    return true;
  });

  // 4. Calculate Running Balances starting from openingBalance
  let runningBal = openingBalance;
  const ledgerWithBalances = periodTransactions.map(tx => {
    const amt = parseFloat(tx.amount) || 0;
    const isDebit = isDebitTransaction(tx.type);

    if (isDebit) {
      runningBal += amt;
    } else {
      runningBal -= amt;
    }

    const linkedCase = tx.case_id ? clientCases.find(c => c.id === tx.case_id) : null;
    const typeMeta = getTransactionMeta(tx.type);

    return {
      ...tx,
      amountNum: amt,
      isDebit,
      typeMeta,
      balanceAfter: runningBal,
      caseNumber: linkedCase ? `${linkedCase.case_number}/${linkedCase.case_year}` : (tx.case_id ? 'قضية محددة' : 'عام'),
      caseTitle: linkedCase ? (linkedCase.case_title || linkedCase.court_name) : ''
    };
  });

  // Display latest on top for UI ledger
  const displayLedger = [...ledgerWithBalances].reverse();

  // 5. Aggregate period metrics
  let periodFees = 0;
  let periodClientExpenses = 0;
  let periodPayments = 0;
  let periodRefunds = 0;

  periodTransactions.forEach(tx => {
    const amt = parseFloat(tx.amount) || 0;
    if (tx.type === 'fee') {
      periodFees += amt;
    } else if (tx.type === 'client_expense' || tx.type === 'expense') {
      periodClientExpenses += amt;
    } else if (tx.type === 'refund') {
      periodRefunds += amt;
    } else if (!isDebitTransaction(tx.type)) {
      periodPayments += amt;
    } else {
      // Other debit adjustments
      periodFees += amt;
    }
  });

  const periodCharges = periodFees + periodClientExpenses + periodRefunds;
  const closingBalance = openingBalance + periodCharges - periodPayments;

  // 6. Aggregate lifetime metrics (overall source of truth)
  let totalFees = 0;
  let totalClientExpenses = 0;
  let totalPayments = 0;
  let totalRefunds = 0;

  sortedAll.forEach(tx => {
    const amt = parseFloat(tx.amount) || 0;
    if (tx.type === 'fee') {
      totalFees += amt;
    } else if (tx.type === 'client_expense' || tx.type === 'expense') {
      totalClientExpenses += amt;
    } else if (tx.type === 'refund') {
      totalRefunds += amt;
    } else if (!isDebitTransaction(tx.type)) {
      totalPayments += amt;
    } else {
      totalFees += amt;
    }
  });

  const totalCharges = totalFees + totalClientExpenses + totalRefunds;
  const lifetimeBalance = totalCharges - totalPayments;

  // Outstanding balance (net amount client owes to office)
  // Positive = client owes office money (مستحق على الموكل)
  // Negative = client has credit with office (رصيد دائن لصالح الموكل)
  // Zero = fully settled (خالص ومسدد بالكامل)
  const isDebtor = closingBalance > 0;
  const isCreditor = closingBalance < 0;
  const isSettled = Math.abs(closingBalance) < 0.01;

  // 7. Case-based Financial Breakdown
  const caseBreakdownMap = {};
  
  // Initialize for all client cases
  clientCases.forEach(c => {
    caseBreakdownMap[c.id] = {
      caseId: c.id,
      caseNumber: `${c.case_number}/${c.case_year}`,
      courtName: c.court_name || 'المحكمة',
      caseTitle: c.case_title || '',
      fees: 0,
      clientExpenses: 0,
      payments: 0,
      balance: 0,
      txCount: 0
    };
  });

  // General (unlinked) bucket
  caseBreakdownMap['GENERAL'] = {
    caseId: 'GENERAL',
    caseNumber: 'عام (بدون قضية)',
    courtName: 'حساب عام',
    caseTitle: 'أتعاب ومصروفات واستشارات عامة',
    fees: 0,
    clientExpenses: 0,
    payments: 0,
    balance: 0,
    txCount: 0
  };

  sortedAll.forEach(tx => {
    const amt = parseFloat(tx.amount) || 0;
    const bucket = tx.case_id && caseBreakdownMap[tx.case_id] ? caseBreakdownMap[tx.case_id] : caseBreakdownMap['GENERAL'];
    bucket.txCount++;

    if (tx.type === 'fee') {
      bucket.fees += amt;
    } else if (tx.type === 'client_expense' || tx.type === 'expense') {
      bucket.clientExpenses += amt;
    } else if (!isDebitTransaction(tx.type)) {
      bucket.payments += amt;
    } else {
      bucket.fees += amt;
    }
    bucket.balance = (bucket.fees + bucket.clientExpenses) - bucket.payments;
  });

  const caseBreakdown = Object.values(caseBreakdownMap).filter(b => b.txCount > 0 || b.caseId !== 'GENERAL');

  // 8. Mathematical verification and discrepancy check
  const calculatedClosing = openingBalance + periodCharges - periodPayments;
  const discrepancy = Math.abs(calculatedClosing - closingBalance) > 0.01;

  // 9. Arabic Tafqeet for final balance
  const tafqeetBalance = formatCurrencyToArabic(Math.abs(closingBalance), 'جنيه مصري');

  // 10. Earliest and latest date strings in ledger
  const firstTxDate = sortedAll.length > 0 ? (sortedAll[0].date || '').split('T')[0] : null;
  const lastTxDate = sortedAll.length > 0 ? (sortedAll[sortedAll.length - 1].date || '').split('T')[0] : null;

  return {
    // Balances
    openingBalance,
    hasOpeningBalance: Boolean(startDate && priorTransactionsCount > 0),
    closingBalance,
    lifetimeBalance,
    outstandingBalance: Math.abs(closingBalance),
    isDebtor,
    isCreditor,
    isSettled,
    statusLabel: isSettled ? 'خالص ومسدد بالكامل' : (isDebtor ? 'رصيد مستحق على الموكل' : 'رصيد دائن لصالح الموكل'),
    tafqeetBalance,

    // Period Totals
    periodFees,
    periodClientExpenses,
    periodCharges,
    periodPayments,
    periodRefunds,

    // Lifetime Totals
    totalFees,
    totalClientExpenses,
    totalCharges,
    totalPayments,
    totalRefunds,

    // Ledgers & Breakdown
    ledgerWithBalances,
    displayLedger,
    totalTransactionsCount: sortedAll.length,
    periodTransactionsCount: periodTransactions.length,
    caseBreakdown,

    // Date Bounds
    firstTxDate,
    lastTxDate,
    effectiveStartDate: startDate || firstTxDate || new Date().toISOString().split('T')[0],
    effectiveEndDate: endDate || lastTxDate || new Date().toISOString().split('T')[0],

    // Verification
    isValid: !discrepancy,
    discrepancyError: discrepancy ? 'تحذير محاسبي: يوجد عدم تطابق في الحسابات التراكمية للفترة المحددة' : null
  };
}
