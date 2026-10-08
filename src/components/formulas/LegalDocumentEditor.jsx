import React, { useState, useRef, useEffect } from 'react';
import { Printer, Download, Copy, Check, Save, RotateCcw, ArrowRight, Bold, Underline, AlignRight, AlignCenter, AlignJustify, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import LawFirmPrintHeader from '../common/LawFirmPrintHeader';
import { printWithTitle } from '../../lib/printUtils';
import { exportTextToDocx, exportDocumentToDocx, exportDocumentToTxt } from '../../lib/documentExport';
import { saveDocument } from '../../lib/documentStorage';
import { confirmDialog, notify } from '../../lib/dialog';
import Select from '../common/Select';

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
  const [isExportingDocx, setIsExportingDocx] = useState(false);

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

  const handleDownloadRealDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportTextToDocx({
        title: formula?.title || 'مستند_قانوني',
        content: documentContent,
        officeProfile
      });
    } catch (err) {
      console.warn('Real DOCX export error, falling back to .doc:', err);
      exportDocumentToDocx({
        title: formula?.title || 'مستند_قانوني',
        content: documentContent,
        officeProfile
      });
    } finally {
      setIsExportingDocx(false);
    }
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
      notify(err.message);
    }
  };

  const handleReset = async () => {
    if (await confirmDialog('هل تريد إعادة النص إلى صيغته المولدة الأولى وإلغاء أي تعديلات؟')) {
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

  const tool = (active, onClick, title, Icon) => (
    <button
      type="button"
      onClick={onClick}
      className={`icon-btn ${active ? 'is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      <Icon size={15} />
    </button>
  );

  const hasMissing = documentContent.includes('⚠️ بيان مطلوب') || documentContent.includes('{{');
  const textStyle = {
    fontSize,
    lineHeight,
    textAlign,
    fontWeight: isBold ? 'bold' : 'normal',
    textDecoration: isUnderline ? 'underline' : 'none',
  };

  return (
    <div className="editor-page">
      <div className="no-print fp-bar">
        <div className="fp-title">
          <button type="button" onClick={handleBackRequest} className="formula-back">
            <ArrowRight size={14} /> رجوع للبيانات
          </button>
          <h2>{formula?.title}</h2>
          <span className="cell-sub">{hasUnsavedChanges ? 'توجد تعديلات لم تُحفظ' : 'المستند جاهز'}</span>
        </div>

        <div className="fp-actions">
          <button type="button" onClick={handleCopyText} className="btn btn-secondary btn-sm" title="نسخ النص">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>
          <button type="button" onClick={handleSave} className="btn btn-secondary btn-sm">
            <Save size={15} />
            <span>حفظ</span>
          </button>
          <button type="button" onClick={handleDownloadRealDocx} disabled={isExportingDocx} className="btn btn-secondary btn-sm" title="ملف Word (.docx)">
            <Download size={15} />
            <span>{isExportingDocx ? 'جارٍ التصدير…' : 'Word'}</span>
          </button>
          <button type="button" onClick={handleDownloadWord} className="btn btn-secondary btn-sm" title="صيغة Word القديمة (.doc)">
            <span>.doc</span>
          </button>
          <button type="button" onClick={handleDownloadTxt} className="btn btn-secondary btn-sm" title="ملف نصي">
            <span>نص</span>
          </button>
          <button type="button" onClick={handlePrint} className="btn btn-primary btn-sm">
            <Printer size={15} />
            <span>طباعة A4</span>
          </button>
        </div>
      </div>

      {hasMissing && (
        <div className="no-print auth-alert is-warn fp-warning" role="alert">
          <AlertTriangle size={18} />
          <span>توجد بيانات ناقصة في المستند مسبوقة بالرمز ⚠️. استبدلها بالبيانات الصحيحة قبل الطباعة أو التصدير.</span>
        </div>
      )}

      {savedNotice && <div className="no-print inline-notice" role="status">{savedNotice}</div>}

      <div className="no-print editor-toolbar">
        <div className="editor-tools">
          {tool(isBold, () => setIsBold(!isBold), 'خط عريض', Bold)}
          {tool(isUnderline, () => setIsUnderline(!isUnderline), 'تحته خط', Underline)}
          <span className="editor-sep" />
          {tool(textAlign === 'right', () => setTextAlign('right'), 'محاذاة لليمين', AlignRight)}
          {tool(textAlign === 'center', () => setTextAlign('center'), 'توسيط', AlignCenter)}
          {tool(textAlign === 'justify', () => setTextAlign('justify'), 'ضبط النص', AlignJustify)}
          <span className="editor-sep" />
          <label className="editor-select">
            <span>الخط</span>
            <Select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="form-select">
              <option value="14px">صغير (14)</option>
              <option value="16px">افتراضي (16)</option>
              <option value="18px">متوسط (18)</option>
              <option value="20px">كبير (20)</option>
              <option value="22px">عريض (22)</option>
            </Select>
          </label>
          <label className="editor-select">
            <span>التباعد</span>
            <Select value={lineHeight} onChange={(e) => setLineHeight(e.target.value)} className="form-select">
              <option value="1.5">1.5</option>
              <option value="1.8">1.8 (رسمي)</option>
              <option value="2.0">2.0 (متباعد)</option>
            </Select>
          </label>
        </div>

        <div className="editor-tools">
          <label className="editor-check">
            <input type="checkbox" checked={includeOfficialHeader} onChange={(e) => setIncludeOfficialHeader(e.target.checked)} />
            <span>ترويسة المكتب</span>
          </label>
          <button type="button" onClick={handleReset} className="btn btn-secondary btn-sm" title="إعادة النص للأصل">
            <RotateCcw size={13} />
            <span>إعادة تعيين</span>
          </button>
        </div>
      </div>

      <div className="editor-viewport">
        <div id="legal-document-print-area" className="legal-editor-sheet editor-sheet" style={textStyle}>
          {includeOfficialHeader && <LawFirmPrintHeader />}

          <textarea
            ref={editorRef}
            className="no-print editor-textarea"
            value={documentContent}
            onChange={handleContentChange}
            placeholder="اكتب أو عدّل نص المستند هنا"
          />

          <div className="only-print editor-printed" style={textStyle}>
            {documentContent}
          </div>

          <div className="document-signature-footer editor-footer">
            <span>تحريراً في: {formValues.session_date || formValues.action_date || formValues.contract_date || new Date().toISOString().substring(0, 10)}</span>
            <span>توقيع المحامي الوكيل: ............................................</span>
          </div>
        </div>
      </div>

      {showExitConfirm && (
        <div className="modal-backdrop confirm-backdrop">
          <div className="modal-dialog confirm-dialog">
            <div className="modal-header">
              <h3>تعديلات غير محفوظة</h3>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                لديك تعديلات داخل المستند لم تُحفظ. هل تريد حفظ المستند قبل المغادرة؟
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowExitConfirm(false);
                  onBack();
                }}
              >
                مغادرة بدون حفظ
              </button>
              <button
                type="button"
                className="btn btn-primary"
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
