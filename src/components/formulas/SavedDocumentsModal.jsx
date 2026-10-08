import React from 'react';
import { X, Trash2, Edit3, Download } from 'lucide-react';
import { exportDocumentToDocx } from '../../lib/documentExport';
import { useData } from '../../context/DataContext';
import { confirmDialog } from '../../lib/dialog';

export default function SavedDocumentsModal({
  isOpen,
  onClose,
  savedDocs = [],
  onResumeDoc,
  onDeleteDoc,
}) {
  const { officeProfile } = useData();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop saved-backdrop" onClick={onClose}>
      <div className="modal-dialog saved-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>المستندات المحفوظة ({savedDocs.length})</h3>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body saved-body">
          {savedDocs.length === 0 ? (
            <div className="empty-block">
              <h3>لا توجد مستندات محفوظة</h3>
              <p>عند توليد مستند والضغط على «حفظ» يظهر هنا للرجوع إليه أو تصديره في أي وقت.</p>
            </div>
          ) : (
            <ul className="mini-list saved-list">
              {savedDocs.map((doc) => {
                const dateStr = doc.updatedAt
                  ? new Date(doc.updatedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <li key={doc.id} className="saved-item">
                    <div className="saved-info">
                      <strong>{doc.title}</strong>
                      <span className="cell-sub">
                        {[doc.category || 'مستند', dateStr].filter(Boolean).join(' · ')}
                      </span>
                      {doc.formValues?.client_name && (
                        <span className="cell-sub">
                          الموكل: {doc.formValues.client_name}
                          {doc.formValues.opponent_name && ` · الخصم: ${doc.formValues.opponent_name}`}
                        </span>
                      )}
                    </div>

                    <div className="saved-actions">
                      <button
                        type="button"
                        onClick={() => exportDocumentToDocx({ title: doc.title, content: doc.content, officeProfile })}
                        className="btn btn-secondary btn-sm"
                        title="تنزيل Word"
                      >
                        <Download size={14} />
                        <span>Word</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onResumeDoc(doc);
                          onClose();
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <Edit3 size={14} />
                        <span>فتح بالمحرر</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirmDialog('هل تريد حذف هذا المستند من الأرشيف؟', { danger: true, confirmLabel: 'حذف' })) {
                            onDeleteDoc(doc.id);
                          }
                        }}
                        className="icon-btn is-danger"
                        title="حذف"
                        aria-label="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
