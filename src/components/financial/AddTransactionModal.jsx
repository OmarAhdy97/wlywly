import React, { useState, useMemo } from 'react';
import { X, PlusCircle, ArrowDownCircle, ArrowUpCircle, Info, CheckCircle2, TriangleAlert } from 'lucide-react';
import {
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  isDebitTransaction
} from '../../lib/financialCalculations';
import { formatCurrencyToArabic } from '../../lib/numberToArabicWords';

const DEFAULT_DESCRIPTIONS = {
  payment: 'دفعة من الموكل',
  fee: 'أتعاب مهنية',
  client_expense: 'مصروفات قضائية على حساب الموكل',
  advance: 'دفعة مقدمة تحت الحساب',
  settlement: 'تسوية حسابية',
  refund: 'رد مبالغ للموكل',
};

const PLACEHOLDERS = {
  fee: 'أتعاب مباشرة عن الدعوى / استشارة قانونية...',
  client_expense: 'رسوم قيد الدعوى وخزينة المحكمة / أمانة خبير...',
  payment: 'دفعة نقدية بالخزينة / تحويل لحساب المكتب...',
  advance: 'دفعة مقدمة تحت حساب الأتعاب والمصروفات...',
  settlement: 'تسوية حسابية معتمدة وفق الاتفاق...',
  refund: 'رد أمانة متبقية / استرداد مبالغ للموكل...',
  adjustment: 'تسوية فروق حسابية معتمدة...',
};

/**
 * AddTransactionModal — records one client transaction.
 * The fields adapt to the chosen type; the banner tells the lawyer which way it moves the balance.
 */
export default function AddTransactionModal({
  isOpen,
  onClose,
  client,
  cases = [],
  onSave,
  isSaving = false
}) {
  const [txType, setTxType] = useState('payment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [caseId, setCaseId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [expenseCategory, setExpenseCategory] = useState('court_fees');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const clientCases = useMemo(() => {
    if (!client) return [];
    return cases.filter(c => c.client_id === client.id);
  }, [cases, client]);

  const isDebit = useMemo(() => isDebitTransaction(txType), [txType]);
  const isExpense = txType === 'client_expense' || txType === 'expense';

  const numAmount = parseFloat(amount) || 0;
  const tafqeetPreview = useMemo(() => {
    if (numAmount <= 0) return '';
    try {
      return formatCurrencyToArabic(numAmount, 'جنيه مصري');
    } catch (e) {
      return '';
    }
  }, [numAmount]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    try {
      await onSave({
        client_id: client.id,
        case_id: caseId || null,
        type: txType,
        amount: numAmount,
        description: description.trim() || DEFAULT_DESCRIPTIONS[txType] || 'تعديل مالي',
        date: date || new Date().toISOString().split('T')[0],
        payment_method: !isDebit ? paymentMethod : null,
        expense_category: isExpense ? expenseCategory : null,
      });

      setAmount('');
      setDescription('');
      setCaseId('');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ المعاملة');
    }
  };

  return (
    <div className="modal-backdrop fin-add-backdrop" onClick={onClose}>
      <div className="modal-dialog fin-add-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="fin-header-main">
            <div className="fin-header-icon"><PlusCircle size={20} /></div>
            <div className="fin-header-text">
              <h3>قيد حركة مالية جديدة</h3>
              <div className="fin-header-sub">
                الموكل: <b>{client.name}</b>
                {client.power_of_attorney_number && ` | توكيل: ${client.power_of_attorney_number}`}
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-icon" onClick={onClose} title="إغلاق" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fin-add-form">
          <div className="modal-body">
            {errorMsg && (
              <div className="sd-alert sd-alert-danger">
                <TriangleAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label sd-label">نوع المعاملة المالية *</label>
              <div className="fin-type-grid" role="radiogroup" aria-label="نوع المعاملة">
                {Object.values(TRANSACTION_TYPES).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={txType === t.id}
                    className={`fin-type-btn ${txType === t.id ? 'is-selected' : ''}`}
                    style={{ '--tone': t.badgeColor, '--tone-bg': t.badgeBg }}
                    onClick={() => setTxType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`sd-alert ${isDebit ? 'sd-alert-danger' : 'fin-alert-credit'}`}>
              {isDebit ? <ArrowDownCircle size={17} /> : <ArrowUpCircle size={17} />}
              <span>
                {isDebit
                  ? 'مستحق على الموكل — يزيد الرصيد المطلوب سداده لصالح المكتب'
                  : 'مسدد من الموكل — يخفض الرصيد المستحق ويُعتبر إبراء ذمة بالمبلغ'}
              </span>
            </div>

            <div className="fin-add-grid">
              <div className="form-group">
                <label className="form-label sd-label">المبلغ (بالجنيه المصري) *</label>
                <div className="fin-amount">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    className="form-input"
                    placeholder="3000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span>ج.م</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label sd-label">تاريخ الحركة *</label>
                <input type="date" required className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {tafqeetPreview && (
              <div className="fin-tafqeet">
                <span>فقط وقدره: </span><b>{tafqeetPreview}</b>
              </div>
            )}

            <div className="form-group">
              <label className="form-label sd-label">القضية المرتبطة</label>
              <select className="form-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                <option value="">عام (بدون ربط بقضية معينة)</option>
                {clientCases.map(c => (
                  <option key={c.id} value={c.id}>دعوى {c.case_number}/{c.case_year} — {c.case_title || c.court_name}</option>
                ))}
              </select>
            </div>

            {!isDebit && (
              <div className="form-group">
                <label className="form-label sd-label">طريقة السداد / التحصيل</label>
                <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            )}

            {isExpense && (
              <div className="form-group">
                <label className="form-label sd-label">تصنيف المصروف المحتسب على الموكل</label>
                <select className="form-select" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <div className="sd-help fin-hint"><Info size={14} /> يُحتسب هذا المصروف مديونية على الموكل ويظهر في كشف حسابه الرسمي.</div>
              </div>
            )}

            <div className="form-group sd-flush">
              <label className="form-label sd-label">البيان والوصف *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder={PLACEHOLDERS[txType] || 'بيان وتفاصيل المعاملة...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer sd-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <CheckCircle2 size={16} />
              <span>{isSaving ? 'جاري الحفظ...' : 'قيد الحركة المالية'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
