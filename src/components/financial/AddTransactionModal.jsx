import React, { useState, useMemo } from 'react';
import { X, PlusCircle, ArrowDownCircle, ArrowUpCircle, Info, CheckCircle2 } from 'lucide-react';
import {
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  isDebitTransaction,
  formatMoney
} from '../../lib/financialCalculations';
import { formatCurrencyToArabic } from '../../lib/numberToArabicWords';

/**
 * AddTransactionModal
 * 
 * Dynamic, intelligent modal for recording client transactions.
 * Adapts fields based on selected transaction type.
 * Features live Arabic Tafqeet currency preview and clear debit/credit impact indicators.
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

  // Filter cases belonging to this client
  const clientCases = useMemo(() => {
    if (!client) return [];
    return cases.filter(c => c.client_id === client.id);
  }, [cases, client]);

  // Is this a debit (increases debt) or credit (reduces debt)
  const isDebit = useMemo(() => isDebitTransaction(txType), [txType]);

  // Live Tafqeet preview
  const numAmount = parseFloat(amount) || 0;
  const tafqeetPreview = useMemo(() => {
    if (numAmount <= 0) return '';
    try {
      return formatCurrencyToArabic(numAmount, 'جنيه مصري');
    } catch (e) {
      return '';
    }
  }, [numAmount]);

  // Dynamic placeholder for description
  const defaultPlaceholder = useMemo(() => {
    switch (txType) {
      case 'fee':
        return 'أتعاب مباشرة عن الدعوى / استشارة قانونية...';
      case 'client_expense':
        return 'رسوم قيد الدعوى وخزينة المحكمة / أمانة خبير...';
      case 'payment':
        return 'دفعة نقدية بالخزينة / تحويل لحساب المكتب...';
      case 'advance':
        return 'دفعة مقدمة تحت حساب الأتعاب والمصروفات...';
      case 'settlement':
        return 'تسوية حسابية معتمدة وفق الاتفاق...';
      case 'refund':
        return 'رد أمانة متبقية / استرداد مبالغ للموكل...';
      case 'adjustment':
        return 'تسوية فروق حسابية معتمدة...';
      default:
        return 'بيان وتفاصيل المعاملة...';
    }
  }, [txType]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    try {
      // Build smart default description if left blank
      let finalDesc = description.trim();
      if (!finalDesc) {
        if (txType === 'payment') finalDesc = 'دفعة من الموكل';
        else if (txType === 'fee') finalDesc = 'أتعاب مهنية';
        else if (txType === 'client_expense') finalDesc = 'مصروفات قضائية على حساب الموكل';
        else if (txType === 'advance') finalDesc = 'دفعة مقدمة تحت الحساب';
        else if (txType === 'settlement') finalDesc = 'تسوية حسابية';
        else if (txType === 'refund') finalDesc = 'رد مبالغ للموكل';
        else finalDesc = 'تعديل مالي';
      }

      await onSave({
        client_id: client.id,
        case_id: caseId || null,
        type: txType,
        amount: numAmount,
        description: finalDesc,
        date: date || new Date().toISOString().split('T')[0],
        payment_method: (!isDebit) ? paymentMethod : null,
        expense_category: (txType === 'client_expense' || txType === 'expense') ? expenseCategory : null,
      });

      // Reset and close
      setAmount('');
      setDescription('');
      setCaseId('');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ المعاملة');
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          direction: 'rtl',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={20} color="#37040a" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#37040a' }}>
                قيد حركة مالية جديدة
              </h3>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
              الموكل: <strong style={{ color: '#0f172a' }}>{client.name}</strong>
              {client.power_of_attorney_number && ` | توكيل: ${client.power_of_attorney_number}`}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              {errorMsg}
            </div>
          )}

          {/* 1. Transaction Type Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
              نوع المعاملة المالية *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.5rem'
            }}>
              {Object.values(TRANSACTION_TYPES).map(t => {
                const isSelected = txType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTxType(t.id)}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${t.badgeColor}` : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? t.badgeBg : '#ffffff',
                      color: isSelected ? t.badgeColor : '#475569',
                      fontWeight: isSelected ? '800' : '600',
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Debit/Credit Dynamic Indicator Banner */}
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            backgroundColor: isDebit ? 'rgba(220, 38, 38, 0.06)' : 'rgba(22, 163, 74, 0.06)',
            border: `1px solid ${isDebit ? 'rgba(220, 38, 38, 0.2)' : 'rgba(22, 163, 74, 0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.82rem'
          }}>
            {isDebit ? (
              <ArrowDownCircle size={17} color="#dc2626" style={{ flexShrink: 0 }} />
            ) : (
              <ArrowUpCircle size={17} color="#16a34a" style={{ flexShrink: 0 }} />
            )}
            <span style={{ color: isDebit ? '#991b1b' : '#166534', fontWeight: '700' }}>
              {isDebit
                ? 'مستحق على الموكل — تزيد الرصيد المطلوب سداده لصالح المكتب'
                : 'مسدد من الموكل — تخفض الرصيد المستحق وتعتبر إبراء ذمة بالمبلغ'}
            </span>
          </div>

          {/* 2. Amount & Date Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
                المبلغ (بالجنيه المصري) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="3000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: '800',
                    direction: 'ltr',
                    textAlign: 'left',
                    outline: 'none',
                    color: '#0f172a'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#64748b'
                }}>
                  ج.م
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
                تاريخ الحركة *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Live Tafqeet Display */}
          {tafqeetPreview && (
            <div style={{
              marginTop: '-0.5rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: '#f1f5f9',
              border: '1px dashed #cbd5e1',
              fontSize: '0.82rem',
              color: '#334155',
              fontWeight: '700'
            }}>
              <span>فقط وقدره: </span>
              <span style={{ color: '#0f172a', fontWeight: '800' }}>{tafqeetPreview}</span>
            </div>
          )}

          {/* 3. Related Case Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
              القضية المرتبطة
            </label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.88rem',
                fontWeight: '600',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">عام (بدون ربط بقضية معينة - حساب استشارات عام)</option>
              {clientCases.map(c => (
                <option key={c.id} value={c.id}>
                  دعوى {c.case_number}/{c.case_year} — {c.case_title || c.court_name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Dynamic Fields: Payment Method for Payments/Advances */}
          {(!isDebit) && (
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
                طريقة السداد / التحصيل
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Dynamic Fields: Expense Category for Client Expenses */}
          {(txType === 'client_expense' || txType === 'expense') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
                تصنيف المصروف المحتسب على الموكل
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.78rem', color: '#b45309' }}>
                <Info size={14} />
                <span>هذا المصروف سيتم احتسابه كمديونية على الموكل ويظهر في كشف حسابه الرسمي.</span>
              </div>
            </div>
          )}

          {/* 6. Description & Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>
              البيان والوصف *
            </label>
            <input
              type="text"
              required
              placeholder={defaultPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                fontWeight: '600',
                outline: 'none',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
            marginTop: '0.5rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '0.65rem 1.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#37040a',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 4px rgba(55, 4, 10, 0.25)',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isSaving ? 'جاري الحفظ...' : 'قيد الحركة المالية'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
