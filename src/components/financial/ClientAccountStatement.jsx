import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  FileDown,
  Send,
  X,
  Calendar,
  Layers,
  CheckCircle,
  AlertCircle,
  Scale
} from 'lucide-react';
import LawFirmPrintHeader from '../common/LawFirmPrintHeader';
import {
  formatMoney,
  calculateClientFinancialSummary,
  getPaymentMethodLabel,
  getExpenseCategoryLabel
} from '../../lib/financialCalculations';
import { printWithTitle, DEFAULT_APP_TITLE } from '../../lib/printUtils';
import { exportDocumentModelToDocx } from '../../lib/docxGenerator';
import { useData } from '../../context/DataContext';
import { notify } from '../../lib/dialog';
import { formatEgyptPhone } from '../../lib/phone';

/**
 * ClientAccountStatement
 * 
 * Official, client-facing printable account statement.
 * Strictly separated from the internal SaaS operational dashboard.
 * 
 * Key Principles:
 * - A4 Portrait RTL design
 * - Human-readable Arabic terminology (no confusing accountant jargon)
 * - Complete breakdown of opening balance, period charges, payments, and running balance
 * - Arabic Tafqeet for amounts
 * - Reuses existing official law firm letterhead
 * - Supports browser printing and genuine DOCX generation
 */
export default function ClientAccountStatement({
  client,
  cases = [],
  transactions = [],
  autoPrint = false,
  onClose,
  onSendTelegram = null
}) {
  const { officeProfile } = useData();

  // Filters for the statement
  const [startDate] = useState('');
  const [endDate] = useState('');
  const [selectedCaseId] = useState('ALL');
  const [customNotes] = useState('');
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Client cases
  const clientCases = useMemo(() => {
    if (!client) return [];
    return cases.filter(c => c.client_id === client.id);
  }, [cases, client]);

  // Single Source of Truth calculation
  const summary = useMemo(() => {
    if (!client) return null;
    return calculateClientFinancialSummary(transactions, client, clientCases, {
      startDate: startDate || null,
      endDate: endDate || null,
      caseId: selectedCaseId,
      typeFilter: 'ALL'
    });
  }, [transactions, client, clientCases, startDate, endDate, selectedCaseId]);

  if (!client || !summary) return null;

  // Manage print isolation mode
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-statement-document');
      const title = `كشف_حساب_الموكل_${client?.name?.replace(/\s+/g, '_') || 'موكل'}_${summary?.effectiveEndDate || ''}`;
      document.title = title.replace(/[/\\:*?"<>|]/g, '-');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-statement-document');
      document.title = DEFAULT_APP_TITLE;
      if (autoPrint && onClose) {
        onClose();
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.body.classList.remove('printing-statement-document');
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [client, summary, autoPrint, onClose]);

  // Print statement with custom title and complete isolation
  const handlePrint = () => {
    document.body.classList.add('printing-statement-document');
    const title = `كشف_حساب_الموكل_${client.name.replace(/\s+/g, '_')}_${summary.effectiveEndDate}`;
    printWithTitle(title);
    setTimeout(() => {
      document.body.classList.remove('printing-statement-document');
    }, 2000);
  };

  // Automatically trigger print dialog when opened in auto-print mode
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Generate genuine DOCX
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);

      const tableHeaders = ['م', 'التاريخ', 'البيان والوصف', 'القضية', 'مستحق (ج.م)', 'مدفوع (ج.م)', 'الرصيد (ج.م)'];
      const tableRows = [];

      // Opening balance row if applicable
      if (summary.hasOpeningBalance) {
        tableRows.push([
          '—',
          summary.effectiveStartDate,
          `رصيد سابق منقول حتى تاريخ ${summary.effectiveStartDate}`,
          '—',
          summary.openingBalance > 0 ? formatMoney(summary.openingBalance, false) : '—',
          summary.openingBalance < 0 ? formatMoney(Math.abs(summary.openingBalance), false) : '—',
          formatMoney(summary.openingBalance, false)
        ]);
      }

      // Ledger items
      summary.ledgerWithBalances.forEach((tx, idx) => {
        let cleanDesc = tx.description || tx.typeMeta.label;
        if (tx.payment_method) cleanDesc += ` (${getPaymentMethodLabel(tx.payment_method)})`;
        if (tx.expense_category) cleanDesc += ` (${getExpenseCategoryLabel(tx.expense_category)})`;

        tableRows.push([
          String(idx + 1),
          (tx.date || '').split('T')[0],
          cleanDesc,
          tx.caseNumber,
          tx.isDebit ? formatMoney(tx.amountNum, false) : '—',
          !tx.isDebit ? formatMoney(tx.amountNum, false) : '—',
          formatMoney(tx.balanceAfter, false)
        ]);
      });

      // Total row
      tableRows.push([
        'الإجمالي',
        '—',
        'إجمالي الفترة المحددة',
        '—',
        formatMoney(summary.periodCharges, false),
        formatMoney(summary.periodPayments, false),
        formatMoney(summary.closingBalance, false)
      ]);

      const bodyElements = [
        { type: 'heading', level: 1, text: 'كشف حساب موكل ومطالبة أتعاب رسمية', align: 'center' },
        {
          type: 'paragraph',
          text: `اسم الموكل: ${client.name} | رقم التوكيل: ${client.power_of_attorney_number || 'عام'} | الفترة: من ${summary.effectiveStartDate} إلى ${summary.effectiveEndDate}`,
          align: 'center',
          bold: true
        },
        {
          type: 'paragraph',
          text: `تاريخ الإصدار: ${new Date().toISOString().split('T')[0]} | الرصيد المستحق: ${formatMoney(summary.outstandingBalance)} (${summary.statusLabel})`,
          align: 'center'
        },
        { type: 'spacer' },
        {
          type: 'heading',
          level: 2,
          text: 'الملخص المالي العام',
          align: 'right'
        },
        {
          type: 'paragraph',
          text: `• إجمالي المستحقات والأتعاب: ${formatMoney(summary.periodCharges)}\n• إجمالي المبالغ المسددة: ${formatMoney(summary.periodPayments)}\n• المصروفات المحتسبة على الموكل: ${formatMoney(summary.periodClientExpenses)}\n• صافي الرصيد المستحق: ${formatMoney(summary.outstandingBalance)}`,
          align: 'right'
        },
        { type: 'spacer' },
        {
          type: 'heading',
          level: 2,
          text: 'جدول المعاملات والحركات المالية التفصيلية',
          align: 'right'
        },
        {
          type: 'table',
          headers: tableHeaders,
          rows: tableRows
        },
        { type: 'spacer' },
        {
          type: 'paragraph',
          text: `الرصيد المستحق حتى تاريخ إصدار هذا الكشف: ${summary.tafqeetBalance}.`,
          bold: true,
          align: 'right'
        }
      ];

      if (customNotes.trim()) {
        bodyElements.push(
          { type: 'spacer' },
          { type: 'heading', level: 3, text: 'ملاحظات وتوجيهات السداد:', align: 'right' },
          { type: 'paragraph', text: customNotes.trim(), align: 'right' }
        );
      }

      bodyElements.push(
        { type: 'spacer' },
        { type: 'signature', label: 'توقيع وختم الإدارة المالية للمكتب: ............................................' }
      );

      const docModel = {
        metadata: {
          title: `كشف حساب - ${client.name}`,
          generatedAt: new Date().toISOString(),
          legal_area: 'حسابات ومطالبات موكلين'
        },
        settings: {
          pageSize: 'A4',
          orientation: 'portrait',
          direction: 'rtl',
          fontSize: 12
        },
        header: officeProfile ? {
          officeName: officeProfile.office_name,
          lawyerTitle: officeProfile.lawyer_title,
          phone: officeProfile.phone,
          address: officeProfile.address
        } : null,
        body: bodyElements,
        footer: {
          showPageNumbers: true,
          signatureLabel: 'توقيع الموكل بالعلم: ............................................'
        }
      };

      await exportDocumentModelToDocx(docModel, `كشف_حساب_${client.name}`);
    } catch (err) {
      notify('حدث خطأ أثناء إنشاء ملف Word: ' + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Case names string
  const relatedCasesText = useMemo(() => {
    if (clientCases.length === 0) return 'حساب استشارات عام';
    if (clientCases.length === 1) {
      return `دعوى ${clientCases[0].case_number}/${clientCases[0].case_year} (${clientCases[0].court_name || ''})`;
    }
    return `${clientCases.length} دعاوى قضائية مقيدة`;
  }, [clientCases]);

  const printSheet = (
    <div
      id="client-statement-portal-root"
      className="only-print client-statement-print-only"
    >
      {/* Official Printable Sheet (A4 Portrait Sheet) */}
      <div
        id="client-account-printable-sheet"
        className="client-statement-sheet printable-document-frame"
      >
        {/* Existing Office Letterhead (Strictly Reused) */}
        <LawFirmPrintHeader />

        {/* Document Title & Period Banner */}
        <div style={{
          textAlign: 'center',
          margin: '1.25rem 0 1.5rem',
          paddingBottom: '0.75rem',
          borderBottom: '1.5px solid #e2e8f0'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.55rem',
            fontWeight: '900',
            color: '#111827',
            letterSpacing: '-0.3px'
          }}>
            كشف حساب موكل ومطالبة مالية
          </h1>
          <div style={{
            fontSize: '0.86rem',
            fontWeight: '700',
            color: '#111827',
            marginTop: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <Calendar size={14} />
            <span>
              للفترة من <strong dir="ltr">{summary.effectiveStartDate}</strong> إلى <strong dir="ltr">{summary.effectiveEndDate}</strong>
            </span>
          </div>
        </div>

        {/* Client & Statement Metadata Box */}
        <div style={{
          border: '1.5px solid #cbd5e1',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          backgroundColor: '#f3f4f6'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
            fontSize: '0.86rem'
          }}>
            <div>
              <span style={{ color: '#64748b', fontWeight: '600' }}>اسم الموكل: </span>
              <strong style={{ color: '#111827', fontSize: '0.98rem' }}>{client.name}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontWeight: '600' }}>رقم التوكيل: </span>
              <strong style={{ color: '#0f172a' }}>{client.power_of_attorney_number || 'عام قضايا'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontWeight: '600' }}>القضايا المرتبطة: </span>
              <strong style={{ color: '#0f172a' }}>{relatedCasesText}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontWeight: '600' }}>تاريخ إصدار الكشف: </span>
              <strong dir="ltr" style={{ color: '#0f172a' }}>
                {new Date().toISOString().split('T')[0]}
              </strong>
            </div>

            {client.phone && (
              <div>
                <span style={{ color: '#64748b', fontWeight: '600' }}>رقم الهاتف: </span>
                <span dir="ltr" style={{ fontWeight: '700', color: '#0f172a' }}>
                  {formatEgyptPhone(client.phone, { isolate: false })}
                </span>
              </div>
            )}

            {client.national_id && (
              <div>
                <span style={{ color: '#64748b', fontWeight: '600' }}>الرقم القومي: </span>
                <span dir="ltr" style={{ fontWeight: '700', color: '#0f172a' }}>
                  {client.national_id}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary Cards (Client Understandable Metrics) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
          marginBottom: '1.75rem'
        }}>
          {/* 1. Total Charges */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.85rem 0.9rem',
            backgroundColor: '#ffffff',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', marginBottom: '0.35rem' }}>
              إجمالي المستحق
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b' }}>
              {formatMoney(summary.periodCharges)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>أتعاب ومصروفات الفترة</div>
          </div>

          {/* 2. Total Payments */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.85rem 0.9rem',
            backgroundColor: '#ffffff',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', marginBottom: '0.35rem' }}>
              إجمالي المسدد
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#111827' }}>
              {formatMoney(summary.periodPayments)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>دفعات وتحصيلات معتمدة</div>
          </div>

          {/* 3. Client Expenses */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.85rem 0.9rem',
            backgroundColor: '#ffffff',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', marginBottom: '0.35rem' }}>
              المصروفات المحتسبة
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#111827' }}>
              {formatMoney(summary.periodClientExpenses)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>رسوم قضائية وخزينة</div>
          </div>

          {/* 4. Hero Outstanding Balance */}
          <div style={{
            border: '2px solid #111827',
            borderRadius: '8px',
            padding: '0.85rem 0.9rem',
            backgroundColor: summary.isDebtor ? '#f3f4f6' : (summary.isCreditor ? '#f3f4f6' : '#f8fafc'),
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: summary.isDebtor ? '#111827' : (summary.isCreditor ? '#111827' : '#111827'),
              fontWeight: '800',
              marginBottom: '0.35rem'
            }}>
              {summary.isDebtor ? 'المبلغ المستحق على الموكل' : (summary.isCreditor ? 'الرصيد المتبقي لصالح الموكل' : 'الرصيد المستحق')}
            </div>
            <div style={{
              fontSize: '1.28rem',
              fontWeight: '900',
              color: summary.isDebtor ? '#111827' : (summary.isCreditor ? '#111827' : '#111827')
            }}>
              {formatMoney(summary.outstandingBalance)}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: summary.isDebtor ? '#111827' : (summary.isCreditor ? '#111827' : '#64748b'),
              fontWeight: '700',
              marginTop: '0.2rem'
            }}>
              {summary.isDebtor ? 'مطلوب سداده للمكتب (مديونية)' : (summary.isCreditor ? 'رصيد دائن لصالح الموكل' : 'خالص ومسدد بالكامل')}
            </div>
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            borderBottom: '1px solid #111827',
            paddingBottom: '0.35rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '900', color: '#111827' }}>
              حركات الحساب المالية التفصيلية
            </h3>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              {summary.ledgerWithBalances.length} حركة مسجلة بالفترة
            </span>
          </div>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            textAlign: 'right'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.6rem 0.5rem', width: '35px', textAlign: 'center' }}>م</th>
                <th style={{ padding: '0.6rem 0.5rem', width: '85px' }}>التاريخ</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>البيان والوصف</th>
                <th style={{ padding: '0.6rem 0.5rem', width: '120px' }}>القضية</th>
                <th style={{ padding: '0.6rem 0.5rem', width: '85px', textAlign: 'left' }}>مستحق</th>
                <th style={{ padding: '0.6rem 0.5rem', width: '85px', textAlign: 'left' }}>مدفوع</th>
                <th style={{ padding: '0.6rem 0.5rem', width: '90px', textAlign: 'left' }}>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance Row if applicable */}
              {summary.hasOpeningBalance && (
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: '700', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', color: '#64748b' }}>—</td>
                  <td style={{ padding: '0.55rem 0.5rem', color: '#475569' }} dir="ltr">{summary.effectiveStartDate}</td>
                  <td style={{ padding: '0.55rem 0.5rem', color: '#334155' }} colSpan={2}>
                    رصيد سابق منقول حتى بداية الفترة ({summary.effectiveStartDate})
                  </td>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'left' }} dir="ltr">
                    {summary.openingBalance > 0 ? formatMoney(summary.openingBalance, false) : '—'}
                  </td>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'left' }} dir="ltr">
                    {summary.openingBalance < 0 ? formatMoney(Math.abs(summary.openingBalance), false) : '—'}
                  </td>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'left', fontWeight: '800' }} dir="ltr">
                    {formatMoney(summary.openingBalance, false)}
                  </td>
                </tr>
              )}

              {/* Transactions Rows */}
              {summary.ledgerWithBalances.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                    لا توجد حركات مالية مسجلة خلال الفترة المحددة.
                  </td>
                </tr>
              ) : (
                summary.ledgerWithBalances.map((tx, idx) => {
                  let displayDesc = tx.description || tx.typeMeta.label;
                  if (tx.payment_method) {
                    displayDesc += ` [${getPaymentMethodLabel(tx.payment_method)}]`;
                  }
                  if (tx.expense_category) {
                    displayDesc += ` [${getExpenseCategoryLabel(tx.expense_category)}]`;
                  }

                  return (
                    <tr
                      key={tx.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f3f4f6'
                      }}
                    >
                      <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#334155', whiteSpace: 'nowrap' }} dir="ltr">
                        {(tx.date || '').split('T')[0]}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#0f172a', fontWeight: '600' }}>
                        {displayDesc}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#475569', fontSize: '0.78rem' }}>
                        {tx.caseNumber}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', textAlign: 'left', color: '#111827', fontWeight: '700' }} dir="ltr">
                        {tx.isDebit ? formatMoney(tx.amountNum, false) : '—'}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', textAlign: 'left', color: '#111827', fontWeight: '700' }} dir="ltr">
                        {!tx.isDebit ? formatMoney(tx.amountNum, false) : '—'}
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem', textAlign: 'left', fontWeight: '800', color: '#0f172a' }} dir="ltr">
                        {formatMoney(tx.balanceAfter, false)}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Total & Closing Balance Row */}
              <tr style={{
                backgroundColor: '#f1f5f9',
                borderTop: '2px solid #cbd5e1',
                fontWeight: '900',
                fontSize: '0.85rem'
              }}>
                <td colSpan={4} style={{ padding: '0.65rem 0.75rem', color: '#111827' }}>
                  إجمالي الفترة المنتهية في {summary.effectiveEndDate}
                </td>
                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'left', color: '#111827' }} dir="ltr">
                  {formatMoney(summary.periodCharges, false)}
                </td>
                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'left', color: '#111827' }} dir="ltr">
                  {formatMoney(summary.periodPayments, false)}
                </td>
                <td style={{ padding: '0.65rem 0.5rem', textAlign: 'left', color: '#111827' }} dir="ltr">
                  {formatMoney(summary.closingBalance, false)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>


        {/* Notes & Payment Instructions */}
        <div style={{
          fontSize: '0.8rem',
          color: '#475569',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.75rem',
          marginBottom: '1.75rem',
          pageBreakInside: 'avoid'
        }}>
          <div style={{ fontWeight: '800', color: '#1e293b', marginBottom: '0.35rem' }}>
            تنبيهات وملاحظات هامة:
          </div>
          <ul style={{ margin: 0, paddingRight: '1.25rem', lineHeight: '1.6' }}>
            <li>يعتبر هذا الكشف بياناً مالياً رسمياً بالحركات المسجلة بحساب الموكل حتى تاريخ إصداره.</li>
            <li>طرق السداد المعتمدة: نقداً بالخزينة، أو عبر خدمة إنستاباي (InstaPay)، أو التحويل البنكي لحساب المكتب.</li>
            {customNotes.trim() && <li>{customNotes.trim()}</li>}
          </ul>
        </div>

        {/* Signatures & Seal Block */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1.5px dashed #cbd5e1',
          pageBreakInside: 'avoid'
        }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f172a', marginBottom: '2.5rem' }}>
              توقيع الموكل بالعلم والاستلام:
            </div>
            <div style={{ borderBottom: '1px dotted #94a3b8', width: '100%', margin: '0 auto' }}></div>
          </div>

          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#111827', marginBottom: '2.5rem' }}>
              توقيع وختم الإدارة المالية للمكتب:
            </div>
            <div style={{ borderBottom: '1px dotted #94a3b8', width: '100%', margin: '0 auto' }}></div>
          </div>
        </div>

        {/* Footer Emblem (Centered with balanced lines on both sides) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          marginTop: '2rem',
          paddingTop: '0.5rem',
          color: '#94a3b8',
          fontSize: '0.76rem',
          fontWeight: '700',
          pageBreakInside: 'avoid',
          width: '100%'
        }}>
          <span style={{ height: '1px', background: '#e2e8f0', flex: 1 }}></span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
            {/* <span>معًا نحو تحقيق العدالة وإرساء سيادة القانون</span> */}
            <Scale size={14} color="#111827" />
          </div>
          <span style={{ height: '1px', background: '#e2e8f0', flex: 1 }}></span>
        </div>
      </div>
    </div>
  );

  return createPortal(printSheet, document.body);
}
