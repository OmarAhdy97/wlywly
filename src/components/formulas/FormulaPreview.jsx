import React from 'react';
import { Eye, Edit3, ArrowRight, Printer, Download, Copy, Check } from 'lucide-react';
import LawFirmPrintHeader from '../common/LawFirmPrintHeader';

export default function FormulaPreview({
  formula,
  generatedContent,
  formValues = {},
  onContinueToEditor,
  onBackToForm
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header bar */}
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
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={onBackToForm}
            className="btn btn-secondary btn-sm"
          >
            ← العودة للتعديل
          </button>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>معاينة المستند المولد</div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>{formula?.title}</h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            onClick={onContinueToEditor}
            className="btn btn-gold btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}
          >
            <Edit3 size={15} />
            <span>فتح في محرر المستندات A4 ←</span>
          </button>
        </div>
      </div>

      {/* Sheet Preview */}
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
          maxWidth: '780px',
          background: '#ffffff',
          color: '#1f2937',
          padding: '40px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          borderRadius: '4px',
          fontFamily: "'Simplified Arabic', Cairo, Arial, sans-serif",
          fontSize: '15px',
          lineHeight: '1.8',
          textAlign: 'justify',
          direction: 'rtl',
          whiteSpace: 'pre-wrap'
        }}>
          <LawFirmPrintHeader />
          <div style={{ marginTop: '1.5rem' }}>
            {generatedContent}
          </div>
        </div>
      </div>
    </div>
  );
}
