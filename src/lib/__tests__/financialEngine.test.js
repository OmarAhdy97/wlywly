/**
 * Comprehensive Financial Engine Verification Suite
 * Tests all 10 scenarios requested by the prompt.
 */

import {
  calculateClientFinancialSummary,
  formatMoney,
  isDebitTransaction,
  TRANSACTION_TYPES
} from '../financialCalculations.js';

console.log('=== RUNNING FINANCIAL ENGINE TESTS ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// TEST 1: New client with no transactions. Expected: رصيد = 0
// -------------------------------------------------------------
const client1 = { id: 'c1', name: 'أحمد الجديد' };
const res1 = calculateClientFinancialSummary([], client1, []);
assert(res1.closingBalance === 0, 'Test 1 - closingBalance is 0');
assert(res1.outstandingBalance === 0, 'Test 1 - outstandingBalance is 0');
assert(res1.isSettled === true, 'Test 1 - isSettled is true');

// -------------------------------------------------------------
// TEST 2: Fee = 5,000, Payment = 2,000. Expected: Outstanding = 3,000
// -------------------------------------------------------------
const client2 = { id: 'c2', name: 'محمود الولي' };
const txs2 = [
  { id: 't1', client_id: 'c2', type: 'fee', amount: 5000, date: '2026-09-01' },
  { id: 't2', client_id: 'c2', type: 'payment', amount: 2000, date: '2026-09-05' }
];
const res2 = calculateClientFinancialSummary(txs2, client2, []);
assert(res2.periodFees === 5000, 'Test 2 - periodFees is 5000');
assert(res2.periodPayments === 2000, 'Test 2 - periodPayments is 2000');
assert(res2.closingBalance === 3000, 'Test 2 - closingBalance is 3000');
assert(res2.outstandingBalance === 3000, 'Test 2 - outstandingBalance is 3000');
assert(res2.isDebtor === true, 'Test 2 - client is debtor (owes money)');

// -------------------------------------------------------------
// TEST 2B: Lawyer Screenshot Scenario (محمد عبد الحميد حنفى الجوهرى)
// Expenses = 2000 + 1500 = 3500, Payments = 0.
// Expected: Client owes 3,500 EGP (NOT credit to client!)
// -------------------------------------------------------------
const clientLawyer = { id: 'c_lawyer', name: 'محمد عبد الحميد حنفى الجوهرى' };
const txsLawyer = [
  { id: 't_l1', client_id: 'c_lawyer', type: 'expense', amount: 2000, description: 'عقود المحل واقرارات الفسخ', date: '2026-09-30' },
  { id: 't_l2', client_id: 'c_lawyer', type: 'expense', amount: 1500, description: 'عقود العمل و محاضر الجرد', date: '2026-09-30' }
];
const resLawyer = calculateClientFinancialSummary(txsLawyer, clientLawyer, []);
assert(resLawyer.periodCharges === 3500, 'Test Lawyer - Total charges is 3500');
assert(resLawyer.periodPayments === 0, 'Test Lawyer - Total payments is 0');
assert(resLawyer.closingBalance === 3500, 'Test Lawyer - Net closing balance is 3500');
assert(resLawyer.outstandingBalance === 3500, 'Test Lawyer - Outstanding is 3500');
assert(resLawyer.isDebtor === true, 'Test Lawyer - isDebtor is true (client OWES money)');
assert(resLawyer.isCreditor === false, 'Test Lawyer - isCreditor is FALSE (NOT credit for client)');
assert(resLawyer.statusLabel === 'رصيد مستحق على الموكل', 'Test Lawyer - statusLabel is "رصيد مستحق على الموكل"');

// -------------------------------------------------------------
// TEST 3: Fee = 5,000, Expense charged to client = 500, Payment = 2,000.
// Expected: Outstanding = 3,500
// -------------------------------------------------------------
const txs3 = [
  { id: 't1', client_id: 'c2', type: 'fee', amount: 5000, date: '2026-09-01' },
  { id: 't2', client_id: 'c2', type: 'client_expense', amount: 500, date: '2026-09-02' },
  { id: 't3', client_id: 'c2', type: 'payment', amount: 2000, date: '2026-09-10' }
];
const res3 = calculateClientFinancialSummary(txs3, client2, []);
assert(res3.periodFees === 5000, 'Test 3 - periodFees is 5000');
assert(res3.periodClientExpenses === 500, 'Test 3 - periodClientExpenses is 500');
assert(res3.periodPayments === 2000, 'Test 3 - periodPayments is 2000');
assert(res3.periodCharges === 5500, 'Test 3 - periodCharges is 5500');
assert(res3.closingBalance === 3500, 'Test 3 - Outstanding is 3500');

// -------------------------------------------------------------
// TEST 4: Opening balance = 3,000, Current period charge = 2,000, Payment = 1,500.
// Expected: Current balance = 3,500
// -------------------------------------------------------------
// Previous transaction before 2026-09-01:
const txs4 = [
  { id: 't0', client_id: 'c2', type: 'fee', amount: 3000, date: '2026-08-15' }, // Prior to period
  { id: 't1', client_id: 'c2', type: 'fee', amount: 2000, date: '2026-09-05' },
  { id: 't2', client_id: 'c2', type: 'payment', amount: 1500, date: '2026-09-12' }
];
const res4 = calculateClientFinancialSummary(txs4, client2, [], {
  startDate: '2026-09-01',
  endDate: '2026-09-30'
});
assert(res4.openingBalance === 3000, 'Test 4 - openingBalance is 3000');
assert(res4.hasOpeningBalance === true, 'Test 4 - hasOpeningBalance is true');
assert(res4.periodCharges === 2000, 'Test 4 - periodCharges is 2000');
assert(res4.periodPayments === 1500, 'Test 4 - periodPayments is 1500');
assert(res4.closingBalance === 3500, 'Test 4 - closingBalance is 3500 (3000 + 2000 - 1500)');

// -------------------------------------------------------------
// TEST 5: Multiple cases. Verify case-level and client-level totals.
// -------------------------------------------------------------
const cases5 = [
  { id: 'caseA', case_number: '1222', case_year: '2026', court_name: 'محكمة دمياط الابتدائية', case_title: 'دعوى صحة ونفاذ' },
  { id: 'caseB', case_number: '840', case_year: '2026', court_name: 'محكمة استئناف المنصورة', case_title: 'استئناف تعويض' }
];
const txs5 = [
  { id: 't1', client_id: 'c2', case_id: 'caseA', type: 'fee', amount: 5500, date: '2026-09-01' },
  { id: 't2', client_id: 'c2', case_id: 'caseA', type: 'client_expense', amount: 500, date: '2026-09-02' },
  { id: 't3', client_id: 'c2', case_id: 'caseA', type: 'payment', amount: 3000, date: '2026-09-03' },
  { id: 't4', client_id: 'c2', case_id: 'caseB', type: 'fee', amount: 4000, date: '2026-09-04' },
  { id: 't5', client_id: 'c2', case_id: 'caseB', type: 'payment', amount: 4000, date: '2026-09-05' }
];
const res5 = calculateClientFinancialSummary(txs5, client2, cases5);
const caseABreakdown = res5.caseBreakdown.find(b => b.caseId === 'caseA');
const caseBBreakdown = res5.caseBreakdown.find(b => b.caseId === 'caseB');
assert(caseABreakdown.fees === 5500, 'Test 5 - Case A fees = 5500');
assert(caseABreakdown.clientExpenses === 500, 'Test 5 - Case A expenses = 500');
assert(caseABreakdown.payments === 3000, 'Test 5 - Case A payments = 3000');
assert(caseABreakdown.balance === 3000, 'Test 5 - Case A balance = 3000 (5500 + 500 - 3000)');
assert(caseBBreakdown.fees === 4000, 'Test 5 - Case B fees = 4000');
assert(caseBBreakdown.payments === 4000, 'Test 5 - Case B payments = 4000');
assert(caseBBreakdown.balance === 0, 'Test 5 - Case B balance = 0 (settled)');
assert(res5.totalCharges === 10000, 'Test 5 - Total client charges = 10000');
assert(res5.totalPayments === 7000, 'Test 5 - Total client payments = 7000');
assert(res5.closingBalance === 3000, 'Test 5 - Overall client balance = 3000');

// -------------------------------------------------------------
// TEST 6: Multiple payments on different dates. Verify period filtering.
// -------------------------------------------------------------
const txs6 = [
  { id: 't1', client_id: 'c2', type: 'fee', amount: 10000, date: '2026-01-01' },
  { id: 't2', client_id: 'c2', type: 'payment', amount: 2000, date: '2026-01-15' },
  { id: 't3', client_id: 'c2', type: 'payment', amount: 3000, date: '2026-02-15' },
  { id: 't4', client_id: 'c2', type: 'payment', amount: 4000, date: '2026-03-15' }
];
const res6 = calculateClientFinancialSummary(txs6, client2, [], {
  startDate: '2026-02-01',
  endDate: '2026-02-28'
});
// Prior to Feb 1: 10000 fee - 2000 pay = opening 8000
assert(res6.openingBalance === 8000, 'Test 6 - opening balance prior to Feb is 8000');
assert(res6.periodPayments === 3000, 'Test 6 - Feb payments = 3000');
assert(res6.closingBalance === 5000, 'Test 6 - closing balance after Feb = 5000 (8000 - 3000)');

// -------------------------------------------------------------
// TEST 7: Refund / adjustment. Verify balance calculation.
// -------------------------------------------------------------
const txs7 = [
  { id: 't1', client_id: 'c2', type: 'fee', amount: 5000, date: '2026-09-01' },
  { id: 't2', client_id: 'c2', type: 'payment', amount: 5000, date: '2026-09-02' },
  // Refund to client: office returns 1000 to client -> client owes office 1000 again
  { id: 't3', client_id: 'c2', type: 'refund', amount: 1000, date: '2026-09-10' }
];
const res7 = calculateClientFinancialSummary(txs7, client2, []);
assert(res7.periodRefunds === 1000, 'Test 7 - refund recorded as 1000');
assert(res7.closingBalance === 1000, 'Test 7 - balance after refund is 1000 (owed by client)');

// -------------------------------------------------------------
// TEST 8: Large number of transactions. Verify performance and correct totals.
// -------------------------------------------------------------
const txs8 = [];
let expectedCharges = 0;
let expectedPayments = 0;
for (let i = 0; i < 200; i++) {
  const isFee = i % 2 === 0;
  const amt = (i + 1) * 10;
  if (isFee) {
    expectedCharges += amt;
    txs8.push({ id: `tx_${i}`, client_id: 'c2', type: 'fee', amount: amt, date: `2026-01-${String((i%28)+1).padStart(2, '0')}` });
  } else {
    expectedPayments += amt;
    txs8.push({ id: `tx_${i}`, client_id: 'c2', type: 'payment', amount: amt, date: `2026-01-${String((i%28)+1).padStart(2, '0')}` });
  }
}
const startT = Date.now();
const res8 = calculateClientFinancialSummary(txs8, client2, []);
const elapsedMs = Date.now() - startT;
assert(res8.periodCharges === expectedCharges, `Test 8 - Charges equal ${expectedCharges}`);
assert(res8.periodPayments === expectedPayments, `Test 8 - Payments equal ${expectedPayments}`);
assert(res8.closingBalance === (expectedCharges - expectedPayments), 'Test 8 - Net balance matches');
assert(elapsedMs < 100, `Test 8 - 200 transactions calculated in ${elapsedMs}ms (< 100ms)`);

// -------------------------------------------------------------
// TEST 9: Monetary formatting & Arabic Tafqeet.
// -------------------------------------------------------------
assert(formatMoney(3600) === '3,600 ج.م', 'Test 9a - formatMoney with currency');
assert(formatMoney(3600, false) === '3,600', 'Test 9b - formatMoney without currency');
assert(res3.tafqeetBalance.includes('ثلاثة آلاف وخمسمائة'), `Test 9c - Tafqeet: ${res3.tafqeetBalance}`);

// -------------------------------------------------------------
// TEST 10: Long Arabic client name and long transaction descriptions.
// -------------------------------------------------------------
const longClient = {
  id: 'c_long',
  name: 'السيد المستشار / عبد الرحمن محمد إبراهيم الدسوقي الشربيني الوكيل بالخصومة القانونية',
  power_of_attorney_number: '12498 لسنة 2026 توثيق الأهرام النموذجي الشامل'
};
const longTx = [
  {
    id: 'tx_l1',
    client_id: 'c_long',
    type: 'fee',
    amount: 15750.50,
    date: '2026-09-01',
    description: 'أتعاب مباشرة عن تقديم مذكرة الطعن بالنقض المدني وقيد الصحيفة بجدول محكمة النقض العليا الدائرة المدنية والتجارية'
  }
];
const res10 = calculateClientFinancialSummary(longTx, longClient, []);
assert(res10.closingBalance === 15750.50, 'Test 10 - handles decimal amount 15750.50');
assert(res10.tafqeetBalance.includes('خمسة عشر ألف'), `Test 10 - Long Arabic Tafqeet: ${res10.tafqeetBalance}`);

console.log(`\n========================================`);
console.log(`TOTAL PASSED: ${passCount} | TOTAL FAILED: ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}
