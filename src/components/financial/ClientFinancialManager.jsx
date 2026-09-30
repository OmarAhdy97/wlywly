import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  Printer,
  Send,
  Trash2,
  Calendar,
  Layers,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  X
} from 'lucide-react';
import {
  formatMoney,
  calculateClientFinancialSummary,
  getPaymentMethodLabel,
  getExpenseCategoryLabel
} from '../../lib/financialCalculations';
import { printWithTitle } from '../../lib/printUtils';
import AddTransactionModal from './AddTransactionModal';
import ClientAccountStatement from './ClientAccountStatement';

/**
 * ClientFinancialManager
 * 
 * Internal operational financial management interface for lawyer & office staff.
 * Features tabs: [Overview] [Transactions] [Fees] [Expenses]
 * Displays hero KPI for "الرصيد المستحق" and provides dynamic transaction ledger.
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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'transactions', 'fees', 'expenses'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // Client cases
  const clientCases = useMemo(() => {
    if (!client) return [];
    return cases.filter(c => c.client_id === client.id);
  }, [cases, client]);

  // Overall Financial Summary (Single Source of Truth)
  const summary = useMemo(() => {
    if (!client) return null;
    return calculateClientFinancialSummary(transactions, client, clientCases, {
      caseId: selectedCaseId,
      typeFilter: 'ALL'
    });
  }, [transactions, client, clientCases, selectedCaseId]);

  // Direct print trigger: Opens native browser print dialog without showing any preview page
  const handlePrintStatement = () => {
    document.body.classList.add('printing-statement-document');
    const title = `كشف_حساب_الموكل_${client?.name?.replace(/\s+/g, '_') || 'موكل'}_${summary?.effectiveEndDate || ''}`;
    printWithTitle(title);
    setTimeout(() => {
      document.body.classList.remove('printing-statement-document');
    }, 2000);
  };

  // Filtered transactions for display
  const displayLedger = useMemo(() => {
    if (!summary) return [];
    let list = summary.displayLedger;

    if (activeTab === 'fees') {
      list = list.filter(tx => tx.type === 'fee');
    } else if (activeTab === 'expenses') {
      list = list.filter(tx => tx.type === 'client_expense' || tx.type === 'expense');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(tx =>
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.caseNumber || '').toLowerCase().includes(q) ||
        (tx.typeMeta?.label || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [summary, activeTab, searchTerm]);

  if (!client || !summary) return null;

  const handleDelete = async (txId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحركة المالية نهائياً؟ سيتم إعادة احتساب الرصيد تلقائياً.')) {
      return;
    }
    try {
      setIsDeletingId(txId);
      await onDeleteTransaction(txId);
    } catch (err) {
      alert('خطأ أثناء حذف المعاملة: ' + err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div
      className="modal-backdrop statement-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 1150,
        overflowY: 'auto',
        padding: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content client-financial-dashboard"
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          direction: 'rtl',
          fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
          color: '#1e293b',
          border: '1px solid #e2e8f0',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Operational Header */}
        <div
          className="cfm-modal-header"
          style={{
            backgroundColor: '#37040a',
            color: '#ffffff',
            padding: '1rem 1.25rem',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            flexShrink: 0
          }}
        >
          {/* Top-Left Close Button (علامة X فوق ع الشمال خالص) */}
          <button
            type="button"
            className="cfm-close-btn"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.45rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.15s ease'
            }}
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>

          {/* Client Info Title */}
          <div style={{ flex: '1 1 auto', minWidth: '180px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Wallet size={20} color="#ffffff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', lineHeight: 1.3 }}>
                  الإدارة المالية وحساب الموكل: {client.name}
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#fbcfe8', marginTop: '0.15rem' }}>
                  {client.power_of_attorney_number ? `توكيل رسمي رقم: ${client.power_of_attorney_number}` : 'توكيل عام قضايا'}
                  {client.phone && ` | هاتف: ${client.phone}`}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Add Transaction */}
          <div className="cfm-header-actions">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                backgroundColor: '#ffffff',
                color: '#37040a',
                border: 'none',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>إضافة حركة مالية</span>
            </button>
          </div>
        </div>

        {/* Dashboard Content Container */}
        <div className="cfm-modal-body" style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
          
          {/* A. KPI Cards (Unified Sleek Style Across All 4 Tiles) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem'
          }}>
            {/* Tile 1: Outstanding Balance (الرصيد المستحق) */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              minHeight: '115px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#64748b' }}>
                  {summary.isDebtor ? 'المستحق على الموكل' : (summary.isCreditor ? 'المتبقي لصالح الموكل' : 'الرصيد المستحق')}
                </span>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  backgroundColor: summary.isDebtor ? '#fef2f2' : (summary.isCreditor ? '#f0fdf4' : '#f8fafc'),
                  color: summary.isDebtor ? '#991b1b' : (summary.isCreditor ? '#15803d' : '#64748b')
                }}>
                  {summary.statusLabel}
                </span>
              </div>
              <div style={{
                fontSize: '1.45rem',
                fontWeight: '900',
                color: summary.isDebtor ? '#991b1b' : (summary.isCreditor ? '#15803d' : '#37040a'),
                margin: '0.35rem 0'
              }}>
                {formatMoney(summary.outstandingBalance)}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#6d0f1b', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {summary.tafqeetBalance}
              </div>
            </div>

            {/* Tile 2: Total Fees (إجمالي الأتعاب) */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              minHeight: '115px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#64748b' }}>إجمالي الأتعاب</span>
                <Receipt size={16} color="#37040a" />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#1e293b', margin: '0.35rem 0' }}>
                {formatMoney(summary.totalFees)}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>أتعاب قضايا واستشارات</div>
            </div>

            {/* Tile 3: Total Client Expenses (المصروفات المحتسبة) */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              minHeight: '115px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#64748b' }}>المصروفات المحتسبة</span>
                <ArrowDownLeft size={16} color="#c2410c" />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#c2410c', margin: '0.35rem 0' }}>
                {formatMoney(summary.totalClientExpenses)}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>رسوم، خبراء ومأموريات</div>
            </div>

            {/* Tile 4: Total Payments Received (إجمالي المسدد) */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              minHeight: '115px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#64748b' }}>إجمالي المسدد</span>
                <ArrowUpRight size={16} color="#15803d" />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#15803d', margin: '0.35rem 0' }}>
                {formatMoney(summary.totalPayments)}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>دفعات نقدية وبنكية</div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div style={{
            borderBottom: '2px solid #f1f5f9',
            marginBottom: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              width: '100%'
            }}>
              {/* Scrollable Tabs on mobile */}
              <div
                className="cfm-tabs-container"
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  maxWidth: '100%',
                  paddingBottom: '0.2rem'
                }}
              >
                {[
                  { id: 'overview', label: 'نظرة عامة والتحليل', count: null },
                  { id: 'transactions', label: 'سجل الحركات (الدفتر)', count: summary.totalTransactionsCount },
                  { id: 'fees', label: 'الأتعاب والمستحقات', count: transactions.filter(t => t.client_id === client.id && t.type === 'fee').length },
                  { id: 'expenses', label: 'المصروفات المحتسبة', count: transactions.filter(t => t.client_id === client.id && (t.type === 'client_expense' || t.type === 'expense')).length }
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '0.55rem 0.95rem',
                        border: 'none',
                        borderBottom: isActive ? '3px solid #37040a' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        color: isActive ? '#37040a' : '#64748b',
                        fontWeight: isActive ? '800' : '600',
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span style={{
                          backgroundColor: isActive ? '#37040a' : '#e2e8f0',
                          color: isActive ? '#ffffff' : '#475569',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: '800'
                        }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Filter by Case dropdown & Search in ledger */}
              <div
                className="cfm-filters-container"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    color: '#334155',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="ALL">كل القضايا والحساب العام</option>
                  <option value="GENERAL">عام (بدون قضية)</option>
                  {clientCases.map(c => (
                    <option key={c.id} value={c.id}>
                      دعوى {c.case_number}/{c.case_year}
                    </option>
                  ))}
                </select>

                <div
                  className="cfm-search-input-wrapper"
                  style={{ position: 'relative', boxSizing: 'border-box' }}
                >
                  <input
                    type="text"
                    placeholder="بحث في الحركات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '0.45rem 2rem 0.45rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Case-by-Case Breakdown Table */}
              <div
                className="cfm-case-breakdown-card"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Layers size={18} color="#37040a" />
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#0f172a' }}>
                    توزيع الموقف المالي بحسب القضايا المسجلة
                  </h4>
                </div>

                {/* Desktop Table View */}
                <div className="cfm-table-desktop" style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.65rem 0.75rem' }}>القضية</th>
                        <th style={{ padding: '0.65rem 0.75rem' }}>المحكمة / الوصف</th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>الأتعاب المقررة</th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>المصروفات</th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>المسدد</th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>الرصيد المتبقي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.caseBreakdown.map(b => (
                        <tr key={b.caseId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: '800', color: '#0f172a' }}>
                            {b.caseNumber}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                            {b.courtName} {b.caseTitle ? `— ${b.caseTitle}` : ''}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }} dir="ltr">
                            {formatMoney(b.fees, false)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }} dir="ltr">
                            {formatMoney(b.clientExpenses, false)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#16a34a', fontWeight: '700' }} dir="ltr">
                            {formatMoney(b.payments, false)}
                          </td>
                          <td style={{
                            padding: '0.65rem 0.75rem',
                            textAlign: 'left',
                            fontWeight: '900',
                            color: b.balance > 0 ? '#991b1b' : (b.balance < 0 ? '#15803d' : '#475569')
                          }} dir="ltr">
                            {formatMoney(b.balance, false)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View for Case Breakdown */}
                <div className="cfm-cards-mobile" style={{ width: '100%', boxSizing: 'border-box' }}>
                  {summary.caseBreakdown.map(b => (
                    <div
                      key={b.caseId}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: '#37040a',
                          color: '#ffffff',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          flexShrink: 0
                        }}>
                          دعوى {b.caseNumber}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'left', wordBreak: 'break-word', flex: '1 1 120px' }}>
                          {b.courtName} {b.caseTitle ? `— ${b.caseTitle}` : ''}
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.45rem',
                        fontSize: '0.78rem',
                        backgroundColor: '#ffffff',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #edf2f7',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>الأتعاب المقررة</div>
                          <div style={{ fontWeight: '700', color: '#1e293b' }} dir="ltr">{formatMoney(b.fees)}</div>
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>المصروفات</div>
                          <div style={{ fontWeight: '700', color: '#1e293b' }} dir="ltr">{formatMoney(b.clientExpenses)}</div>
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>المسدد</div>
                          <div style={{ fontWeight: '700', color: '#16a34a' }} dir="ltr">{formatMoney(b.payments)}</div>
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>الرصيد المتبقي</div>
                          <div style={{
                            fontWeight: '800',
                            color: b.balance > 0 ? '#991b1b' : (b.balance < 0 ? '#15803d' : '#475569')
                          }} dir="ltr">
                            {formatMoney(b.balance)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions Summary Bar */}
              <div style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.82rem'
              }}>
                <div style={{ fontWeight: '800', color: '#37040a' }}>
                  إجمالي الحركات المسجلة: {summary.totalTransactionsCount} حركة مالية
                </div>
                <div style={{ color: '#64748b' }}>
                  تاريخ أول حركة: <strong style={{ color: '#0f172a' }}>{summary.firstTxDate || 'لا يوجد'}</strong> | آخر حركة: <strong style={{ color: '#0f172a' }}>{summary.lastTxDate || 'لا يوجد'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TABS 2, 3, 4: LEDGER / TRANSACTIONS TABLE */}
          {activeTab !== 'overview' && (
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              {/* Desktop Table View */}
              <div className="cfm-table-desktop" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 0.85rem', width: '90px' }}>التاريخ</th>
                      <th style={{ padding: '0.75rem 0.85rem', width: '120px' }}>النوع</th>
                      <th style={{ padding: '0.75rem 0.85rem' }}>البيان والوصف</th>
                      <th style={{ padding: '0.75rem 0.85rem', width: '120px' }}>القضية المرتبطة</th>
                      <th style={{ padding: '0.75rem 0.85rem', width: '100px', textAlign: 'left' }}>مستحق (مدين)</th>
                      <th style={{ padding: '0.75rem 0.85rem', width: '100px', textAlign: 'left' }}>مسدد (دائن)</th>
                      <th style={{ padding: '0.75rem 0.85rem', width: '110px', textAlign: 'left' }}>الرصيد التراكمي</th>
                      <th style={{ padding: '0.75rem 0.85rem', width: '60px', textAlign: 'center' }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          لا توجد معاملات مسجلة تطابق الفلاتر الحالية.
                        </td>
                      </tr>
                    ) : (
                      displayLedger.map((tx) => (
                        <tr
                          key={tx.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* Date */}
                          <td style={{ padding: '0.75rem 0.85rem', color: '#475569', whiteSpace: 'nowrap' }} dir="ltr">
                            {(tx.date || '').split('T')[0]}
                          </td>

                          {/* Type Badge */}
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              backgroundColor: tx.typeMeta.badgeBg,
                              color: tx.typeMeta.badgeColor,
                              border: `1px solid ${tx.typeMeta.badgeColor}33`
                            }}>
                              {tx.typeMeta.label}
                            </span>
                          </td>

                          {/* Description & Method/Category Tags */}
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>
                              {tx.description}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', fontSize: '0.72rem' }}>
                              {tx.payment_method && (
                                <span style={{ color: '#0284c7', backgroundColor: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  {getPaymentMethodLabel(tx.payment_method)}
                                </span>
                              )}
                              {tx.expense_category && (
                                <span style={{ color: '#ea580c', backgroundColor: '#ffedd5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  {getExpenseCategoryLabel(tx.expense_category)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Related Case */}
                          <td style={{ padding: '0.75rem 0.85rem', color: '#475569', fontSize: '0.8rem' }}>
                            {tx.caseNumber}
                          </td>

                          {/* Debit (المستحق) */}
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#dc2626', fontWeight: '800' }} dir="ltr">
                            {tx.isDebit ? formatMoney(tx.amountNum, false) : '—'}
                          </td>

                          {/* Credit (المسدد) */}
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#16a34a', fontWeight: '800' }} dir="ltr">
                            {!tx.isDebit ? formatMoney(tx.amountNum, false) : '—'}
                          </td>

                          {/* Running Balance */}
                          <td style={{
                            padding: '0.75rem 0.85rem',
                            textAlign: 'left',
                            fontWeight: '900',
                            color: tx.balanceAfter > 0 ? '#991b1b' : (tx.balanceAfter < 0 ? '#166534' : '#0f172a')
                          }} dir="ltr">
                            {formatMoney(tx.balanceAfter, false)}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDelete(tx.id)}
                              disabled={isDeletingId === tx.id}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.3rem',
                                borderRadius: '6px',
                                opacity: isDeletingId === tx.id ? 0.4 : 1
                              }}
                              title="حذف المعاملة"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View for Transactions */}
              <div className="cfm-cards-mobile" style={{ width: '100%', boxSizing: 'border-box', padding: '0.4rem 0' }}>
                {displayLedger.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    لا توجد معاملات مسجلة تطابق الفلاتر الحالية.
                  </div>
                ) : (
                  displayLedger.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Top: Badge + Date + Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: '800',
                            backgroundColor: tx.typeMeta.badgeBg,
                            color: tx.typeMeta.badgeColor,
                            border: `1px solid ${tx.typeMeta.badgeColor}33`
                          }}>
                            {tx.typeMeta.label}
                          </span>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }} dir="ltr">
                            {(tx.date || '').split('T')[0]}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(tx.id)}
                          disabled={isDeletingId === tx.id}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.35rem',
                            borderRadius: '6px',
                            opacity: isDeletingId === tx.id ? 0.4 : 1,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="حذف المعاملة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Description & Tags */}
                      <div>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.88rem' }}>
                          {tx.description}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.3rem', fontSize: '0.72rem' }}>
                          {tx.caseNumber && tx.caseNumber !== 'عام' && (
                            <span style={{ color: '#37040a', backgroundColor: '#fce7f3', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                              دعوى: {tx.caseNumber}
                            </span>
                          )}
                          {tx.payment_method && (
                            <span style={{ color: '#0284c7', backgroundColor: '#e0f2fe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {getPaymentMethodLabel(tx.payment_method)}
                            </span>
                          )}
                          {tx.expense_category && (
                            <span style={{ color: '#ea580c', backgroundColor: '#ffedd5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {getExpenseCategoryLabel(tx.expense_category)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount & Running Balance */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '0.5rem',
                        borderTop: '1px dashed #e2e8f0',
                        fontSize: '0.82rem'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.35rem' }}>
                            {tx.isDebit ? 'المستحق:' : 'المسدد:'}
                          </span>
                          <span style={{
                            fontWeight: '800',
                            color: tx.isDebit ? '#dc2626' : '#16a34a'
                          }} dir="ltr">
                            {formatMoney(tx.amountNum)}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.35rem' }}>الرصيد:</span>
                          <span style={{
                            fontWeight: '900',
                            color: tx.balanceAfter > 0 ? '#991b1b' : (tx.balanceAfter < 0 ? '#166534' : '#0f172a')
                          }} dir="ltr">
                            {formatMoney(tx.balanceAfter)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with Unified Button Styles */}
        <div
          className="cfm-modal-footer"
          style={{
            padding: '0.9rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            flexShrink: 0
          }}
        >
          {/* Action Buttons: Print & Telegram */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handlePrintStatement}
              style={{
                backgroundColor: '#37040a',
                color: '#ffffff',
                border: '1px solid #37040a',
                padding: '0.55rem 1.35rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 4px rgba(55, 4, 10, 0.15)',
                transition: 'all 0.15s ease'
              }}
            >
              <Printer size={16} />
              <span>طباعة كشف الحساب (A4)</span>
            </button>

            {onSendTelegram && (
              <button
                type="button"
                onClick={onSendTelegram}
                style={{
                  backgroundColor: client.telegram_chat_id ? '#0284c7' : '#f1f5f9',
                  color: client.telegram_chat_id ? '#ffffff' : '#475569',
                  border: client.telegram_chat_id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={15} />
                <span>إرسال عبر تليجرام</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Add Transaction Modal */}
      {isAddModalOpen && (
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          client={client}
          cases={cases}
          onSave={onAddTransaction}
        />
      )}

      {/* Official Printable Statement (Zero on-screen modal, invisibly attached to DOM for instant browser print) */}
      <ClientAccountStatement
        client={client}
        cases={cases}
        transactions={transactions}
      />
    </div>
  );
}
