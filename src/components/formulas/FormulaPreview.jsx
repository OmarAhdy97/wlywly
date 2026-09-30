import React, { useState } from 'react';
import { Eye, Edit3, ArrowRight, Printer, Download, Copy, Check, AlertTriangle, FileText, Sparkles } from 'lucide-react';
import LawFirmPrintHeader from '../common/LawFirmPrintHeader';
import { printWithTitle } from '../../lib/printUtils';
import { exportTextToDocx, exportDocumentToRealDocx, exportDocumentToDocx } from '../../lib/documentExport';
import { useData } from '../../context/DataContext';

export default function FormulaPreview({
  formula,
  generatedContent,
  documentModel = null,
  formValues = {},
  onContinueToEditor,
  onBackToForm
}) {
  const { officeProfile } = useData();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Check for unresolved placeholders
  const hasUnresolvedPlaceholders = generatedContent && (
    generatedContent.includes('⚠️ بيان مطلوب') ||
    generatedContent.includes('{{')
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    const docTitle = `${formula?.title || 'مستند قضائي'} - ${formValues.client_name || formValues.first_party_name || ''}`;
    printWithTitle(docTitle);
  };

  const handleExportRealDocx = async () => {
    setExporting(true);
    try {
      if (documentModel) {
        await exportDocumentToRealDocx(documentModel, formula?.title || 'مستند_قانوني');
      } else {
        await exportTextToDocx({
          title: formula?.title || 'مستند_قانوني',
          content: generatedContent,
          officeProfile
        });
      }
    } catch (err) {
      console.error('Export error, falling back to legacy:', err);
      exportDocumentToDocx({
        title: formula?.title || 'مستند_قانوني',
        content: generatedContent,
        officeProfile
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-color)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={onBackToForm}
            className="btn btn-secondary btn-sm"
          >
            ← العودة لتعديل البيانات
          </button>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>معاينة المستند القانوني المولد</div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{formula?.title}</h3>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {copied ? <Check size={15} style={{ color: 'var(--success)' }} /> : <Copy size={15} />}
            <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportRealDocx}
            disabled={exporting}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1d4ed8' }}
            title="تصدير ملف Word (.docx) أصلي متوافق مع كافة الإصدارات"
          >
            <Download size={15} />
            <span>{exporting ? 'جاري التصدير...' : 'تصدير Word (.docx)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Printer size={15} />
            <span>طباعة فورية</span>
          </button>

          <button
            type="button"
            onClick={onContinueToEditor}
            className="btn btn-gold btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}
          >
            <Edit3 size={15} />
            <span>فتح في المحرر والتنسيق ←</span>
          </button>
        </div>
      </div>

      {/* Warning Alert if Placeholders are missing */}
      {hasUnresolvedPlaceholders && (
        <div style={{
          background: 'rgba(234, 88, 12, 0.1)',
          border: '1px solid rgba(234, 88, 12, 0.4)',
          color: '#c2410c',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.88rem'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>تنبيه قانوني:</strong> يحتوي هذا المستند على بيانات لم يتم ملؤها (مشار إليها بالرمز ⚠️). يرجى مراجعتها وتعبئتها بالعودة للنموذج أو التعديل المباشر في المحرر لتجنب بطلان الإجراءات.
          </span>
        </div>
      )}

      {/* Sheet Preview A4 Style */}
      <div style={{
        background: 'var(--bg-app)',
        padding: '1.5rem 1rem',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '820px',
          background: '#ffffff',
          color: '#1f2937',
          padding: '45px 50px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          borderRadius: '4px',
          fontFamily: "'Simplified Arabic', Cairo, 'Traditional Arabic', Arial, sans-serif",
          fontSize: '15px',
          lineHeight: '1.9',
          textAlign: 'justify',
          direction: 'rtl'
        }}>
          <LawFirmPrintHeader />
          <div style={{
            marginTop: '1.5rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#111827'
          }}>
            {generatedContent}
          </div>

          {/* Footer signature line */}
          <div style={{
            marginTop: '3.5rem',
            paddingTop: '1rem',
            borderTop: '1px dashed #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            color: '#4b5563'
          }}>
            <div>تاريخ التحرير: {new Date().toLocaleDateString('ar-EG')}</div>
            <div style={{ fontWeight: 'bold' }}>
              توقيع المحامي الوكيل: ............................................
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
