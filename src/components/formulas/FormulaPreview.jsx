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
      <div className="no-print" style={{
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
        <div className="no-print" style={{
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
      <div className="formula-preview-bg" style={{
        background: 'var(--bg-app)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div id="formula-printable-sheet" className="formula-sheet" style={{
          width: '100%',
          maxWidth: '820px',
          background: '#ffffff',
          color: '#1f2937',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          borderRadius: '4px',
          fontFamily: "'Simplified Arabic', Cairo, 'Traditional Arabic', Arial, sans-serif",
          lineHeight: '1.9',
          textAlign: 'justify',
          direction: 'rtl'
        }}>
          <LawFirmPrintHeader />
          {(() => {
            const bodyStyle = { whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#111827' };
            if (formula?.layout !== 'announcement' || !formula?.subject || !generatedContent) {
              // contracts and plain papers: «## عنوان» lines are centred headings (contract title)
              const lines = (generatedContent || '').split('\n');
              return (
                <div style={{ marginTop: '1.5rem', ...bodyStyle }}>
                  {lines.map((l, i) => l.startsWith('## ')
                    ? <div key={i} style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.25em', margin: '0.6rem 0' }}>{l.slice(3)}</div>
                    : <div key={i} style={{ minHeight: l.trim() ? undefined : '0.9em' }}>{l}</div>)}
                </div>
              );
            }
            // Court-paper layout: the «الموضوع» box sits beside the opening block
            // (date, requester, bailiff, addressee); the rest runs full width.
            const lines = generatedContent.split('\n');
            let cut = lines.findIndex(l => /^\s*(وأعلنته|وأنذرته|وأعلنتهما)/.test(l));
            if (cut < 0) cut = Math.min(5, lines.length);
            const opening = lines.slice(0, cut).join('\n');
            const rest = lines.slice(cut).join('\n');
            return (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="formula-open-row">
                  <div style={{ flex: 1, ...bodyStyle }}>{opening}</div>
                  <div className="formula-subject-box" style={{
                    width: '150px', flexShrink: 0, border: '1.5px solid #111827',
                    textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem'
                  }}>
                    <div style={{ borderBottom: '1.5px solid #111827', padding: '0.35rem', background: '#f3f4f6' }}>الموضوع</div>
                    <div style={{ padding: '0.7rem 0.4rem', lineHeight: 1.6 }}>{formula.subject}</div>
                    <div style={{ borderTop: '1px solid #111827', margin: '0 0.6rem', padding: '0.35rem 0', fontWeight: 'normal', fontSize: '0.85rem' }}>المحامي</div>
                  </div>
                </div>
                <div style={{ marginTop: '0.25rem', ...bodyStyle }}>{rest}</div>
              </div>
            );
          })()}

          {/* Footer signature line (not on court papers: the paper ends with «ولأجل العلم») */}
          {formula?.layout !== 'announcement' && <div style={{
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
          </div>}
        </div>
      </div>
    </div>
  );
}
