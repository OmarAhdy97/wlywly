import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  Save,
  RotateCcw,
  ArrowRight,
  Bold,
  Italic,
  Underline,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  FileText,
  Building,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import LawFirmPrintHeader from '../common/LawFirmPrintHeader';
import { printWithTitle } from '../../lib/printUtils';
import { exportDocumentToDocx, exportDocumentToTxt } from '../../lib/documentExport';
import { saveDocument } from '../../lib/documentStorage';

export default function LegalDocumentEditor({
  formula,
  initialContent,
  formValues = {},
  contextData = {},
  onBack
}) {
  const { officeProfile } = useData();
  const { user } = useAuth();

  const [documentContent, setDocumentContent] = useState(initialContent || '');
  const [includeOfficialHeader, setIncludeOfficialHeader] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Editor Styling State
  const [fontSize, setFontSize] = useState('16px');
  const [lineHeight, setLineHeight] = useState('1.8');
  const [textAlign, setTextAlign] = useState('justify');
  const [isBold, setIsBold] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const editorRef = useRef(null);

  useEffect(() => {
    setDocumentContent(initialContent || '');
  }, [initialContent]);

  const handleContentChange = (e) => {
    setDocumentContent(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(documentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    const docTitle = `${formula?.title || 'مستند قضائي'} - ${formValues.client_name || formValues.first_party_name || ''}`;
    printWithTitle(docTitle);
  };

  const handleDownloadWord = () => {
    exportDocumentToDocx({
      title: formula?.title || 'مستند_قانوني',
      content: documentContent,
      officeProfile
    });
  };

  const handleDownloadTxt = () => {
    exportDocumentToTxt({
      title: formula?.title || 'مستند_قانوني',
      content: documentContent
    });
  };

  const handleSave = async () => {
    try {
      await saveDocument({
        formulaId: formula?.id,
        title: formula?.title || 'مستند قانوني',
        category: formula?.category,
        content: documentContent,
        formValues,
        caseId: contextData?.selectedCaseId || null,
        clientId: contextData?.selectedClientId || null
      }, user?.id);

      setHasUnsavedChanges(false);
      setSavedNotice('تم حفظ المستند في السحابة وأرشيف المستندات بنجاح!');
      setTimeout(() => setSavedNotice(''), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = () => {
    if (window.confirm('هل تريد إعادة النص إلى صيغته المولدة الأولى وإلغاء أي تعديلات؟')) {
      setDocumentContent(initialContent || '');
      setHasUnsavedChanges(false);
    }
  };

  const handleBackRequest = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Action Bar */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-color)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleBackRequest}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowRight size={16} />
            <span>رجوع للبيانات</span>
          </button>

          <div>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
              {formula?.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {hasUnsavedChanges ? 'توجد تعديلات قيد التحرير' : 'تم توليد المستند جاهزاً'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyText}
            className="btn btn-secondary btn-sm"
            title="نسخ النص للحافظة"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {copied ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="btn btn-secondary btn-sm"
            title="حفظ محلياً"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Save size={16} />
            <span>حفظ</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWord}
            className="btn btn-secondary btn-sm"
            title="تنزيل ملف وورد حقيقي قابل للتعديل"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1d4ed8' }}
          >
            <Download size={16} />
            <span>تصدير Word (.doc)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="btn btn-secondary btn-sm"
            title="تنزيل ملف نصي"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileText size={16} />
            <span>ملف نصي</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-gold btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}
          >
            <Printer size={16} />
            <span>طباعة المستند A4</span>
          </button>
        </div>
      </div>

      {/* Saved Notice */}
      {savedNotice && (
        <div style={{
          background: 'var(--status-won-bg, rgba(34, 197, 94, 0.1))',
          color: 'var(--success, #16a34a)',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem'
        }} className="no-print">
          <CheckCircle2 size={16} />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Word-like Editor Formatting Toolbar */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-md, 8px) var(--radius-md, 8px) 0 0',
        border: '1px solid var(--border-color)',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }} className="no-print">
        {/* Left Toolbar Items (Formatting) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Bold */}
          <button
            type="button"
            onClick={() => setIsBold(!isBold)}
            className={`btn btn-secondary btn-icon ${isBold ? 'active' : ''}`}
            style={{ width: '32px', height: '32px', padding: 0, fontWeight: 'bold' }}
            title="خط عريض"
          >
            <Bold size={15} />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => setIsUnderline(!isUnderline)}
            className={`btn btn-secondary btn-icon ${isUnderline ? 'active' : ''}`}
            style={{ width: '32px', height: '32px', padding: 0 }}
            title="تحته خط"
          >
            <Underline size={15} />
          </button>

          <span style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.2rem' }}></span>

          {/* Align Right */}
          <button
            type="button"
            onClick={() => setTextAlign('right')}
            className={`btn btn-secondary btn-icon ${textAlign === 'right' ? 'active' : ''}`}
            style={{ width: '32px', height: '32px', padding: 0 }}
            title="محاذاة لليمين"
          >
            <AlignRight size={15} />
          </button>

          {/* Align Center */}
          <button
            type="button"
            onClick={() => setTextAlign('center')}
            className={`btn btn-secondary btn-icon ${textAlign === 'center' ? 'active' : ''}`}
            style={{ width: '32px', height: '32px', padding: 0 }}
            title="توسيط"
          >
            <AlignCenter size={15} />
          </button>

          {/* Align Justify */}
          <button
            type="button"
            onClick={() => setTextAlign('justify')}
            className={`btn btn-secondary btn-icon ${textAlign === 'justify' ? 'active' : ''}`}
            style={{ width: '32px', height: '32px', padding: 0 }}
            title="ضبط النص (Justify)"
          >
            <AlignJustify size={15} />
          </button>

          <span style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.2rem' }}></span>

          {/* Font Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
            <span>حجم الخط:</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                fontSize: '0.82rem',
                background: 'var(--bg-card)'
              }}
            >
              <option value="14px">صغير (14)</option>
              <option value="16px">افتراضي (16)</option>
              <option value="18px">متوسط (18)</option>
              <option value="20px">كبير (20)</option>
              <option value="22px">عريض (22)</option>
            </select>
          </div>

          {/* Line Height Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
            <span>التباعد:</span>
            <select
              value={lineHeight}
              onChange={(e) => setLineHeight(e.target.value)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                fontSize: '0.82rem',
                background: 'var(--bg-card)'
              }}
            >
              <option value="1.5">1.5</option>
              <option value="1.8">1.8 (رسمي)</option>
              <option value="2.0">2.0 (متباعد)</option>
            </select>
          </div>
        </div>

        {/* Right Toolbar Items (Header toggle & Reset) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeOfficialHeader}
              onChange={(e) => setIncludeOfficialHeader(e.target.checked)}
            />
            <span>إظهار ترويسة المكتب الرسمية</span>
          </label>

          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            title="إعادة النص للأصل"
          >
            <RotateCcw size={13} />
            <span>إعادة تعيين</span>
          </button>
        </div>
      </div>

      {/* A4 Sheet Container (Word-like document viewport) */}
      <div style={{
        background: 'var(--bg-app)',
        padding: '2rem 1rem',
        borderRadius: '0 0 var(--radius-lg, 12px) var(--radius-lg, 12px)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'center',
        overflowX: 'auto'
      }}>
        {/* The Authentic A4 Page */}
        <div
          id="legal-document-print-area"
          style={{
            width: '100%',
            maxWidth: '820px',
            minHeight: '1100px',
            background: '#ffffff',
            color: '#1a1a1a',
            padding: '45px 50px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
            borderRadius: '2px',
            direction: 'rtl',
            fontFamily: "'Simplified Arabic', 'Traditional Arabic', 'Amiri', Cairo, Arial, sans-serif",
            fontSize: fontSize,
            lineHeight: lineHeight,
            textAlign: textAlign,
            fontWeight: isBold ? 'bold' : 'normal',
            textDecoration: isUnderline ? 'underline' : 'none',
            boxSizing: 'border-box',
            position: 'relative'
          }}
        >
          {/* Printable Official Law Firm Header */}
          {includeOfficialHeader && (
            <LawFirmPrintHeader />
          )}

          {/* Document Content Area (Editable textarea for screen) */}
          <textarea
            ref={editorRef}
            className="no-print"
            value={documentContent}
            onChange={handleContentChange}
            placeholder="اكتب أو عدل نص المستند هنا..."
            style={{
              width: '100%',
              minHeight: '850px',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              background: 'transparent',
              color: '#111827',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              textAlign: 'inherit',
              fontWeight: 'inherit',
              textDecoration: 'inherit',
              padding: 0,
              boxShadow: 'none'
            }}
          />

          {/* Clean Printed Content for Paper / PDF Output */}
          <div
            className="only-print"
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: fontSize,
              lineHeight: lineHeight,
              textAlign: textAlign,
              fontWeight: isBold ? 'bold' : 'normal',
              textDecoration: isUnderline ? 'underline' : 'none'
            }}
          >
            {documentContent}
          </div>

          {/* Footer note in document */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px dashed #d1d5db',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#6b7280'
          }} className="document-signature-footer">
            <span>تحريراً في: {formValues.session_date || formValues.action_date || formValues.contract_date || new Date().toISOString().substring(0, 10)}</span>
            <span>توقيع المحامي الوكيل: ............................................</span>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '1.5rem',
            borderRadius: '12px',
            maxWidth: '420px',
            width: '90%',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', marginBottom: '0.75rem' }}>
              <AlertTriangle size={22} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>تنبيه: تغييرات غير محفوظة</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 1.25rem 0' }}>
              لديك تعديلات قمت بكتابتها داخل المستند ولم تحفظها، هل تريد حفظ المستند قبل المغادرة أم المغادرة بدون حفظ؟
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowExitConfirm(false);
                  onBack();
                }}
              >
                مغادرة بدون حفظ
              </button>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={() => {
                  handleSave();
                  setShowExitConfirm(false);
                  onBack();
                }}
              >
                حفظ والمغادرة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
