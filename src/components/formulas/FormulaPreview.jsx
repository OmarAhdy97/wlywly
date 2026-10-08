import React, { useState } from 'react';
import { Edit3, Printer, Download, Copy, Check, AlertTriangle } from 'lucide-react';
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
    <div className="ff-page fp-page">
      <div className="no-print fp-bar">
        <div className="fp-title">
          <button type="button" onClick={onBackToForm} className="formula-back">← العودة لتعديل البيانات</button>
          <h2>{formula?.title}</h2>
          <span className="cell-sub">معاينة المستند قبل الطباعة أو التصدير</span>
        </div>

        <div className="fp-actions">
          <button type="button" onClick={handleCopy} className="btn btn-secondary btn-sm">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportRealDocx}
            disabled={exporting}
            className="btn btn-secondary btn-sm"
            title="تصدير ملف Word (.docx) متوافق مع كل الإصدارات"
          >
            <Download size={15} />
            <span>{exporting ? 'جارٍ التصدير…' : 'تصدير Word'}</span>
          </button>
          <button type="button" onClick={handlePrint} className="btn btn-secondary btn-sm">
            <Printer size={15} />
            <span>طباعة</span>
          </button>
          <button type="button" onClick={onContinueToEditor} className="btn btn-primary btn-sm">
            <Edit3 size={15} />
            <span>فتح في المحرر</span>
          </button>
        </div>
      </div>

      {hasUnresolvedPlaceholders && (
        <div className="no-print auth-alert is-warn fp-warning" role="alert">
          <AlertTriangle size={18} />
          <span>
            <strong>تنبيه:</strong> يحتوي المستند على بيانات لم تُملأ (مشار إليها بالرمز ⚠️). راجعها بالعودة للنموذج أو عدّلها مباشرة في المحرر قبل الاستخدام.
          </span>
        </div>
      )}

      <div className="formula-preview-bg fp-bg">
        <div id="formula-printable-sheet" className="formula-sheet fp-sheet">
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
