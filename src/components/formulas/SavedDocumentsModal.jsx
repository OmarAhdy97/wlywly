import React from 'react';
import { X, FileText, Trash2, Edit3, Calendar, Download } from 'lucide-react';
import { exportDocumentToDocx } from '../../lib/documentExport';
import { useData } from '../../context/DataContext';

export default function SavedDocumentsModal({
  isOpen,
  onClose,
  savedDocs = [],
  onResumeDoc,
  onDeleteDoc
}) {
  const { officeProfile } = useData();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        maxWidth: '750px',
        width: '100%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-color)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={20} style={{ color: 'var(--accent-gold)' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>
              أرشيف المستندات المولدة ({savedDocs.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ width: '32px', height: '32px', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {savedDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>لا توجد مستندات محفوظة حتى الآن.</p>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem' }}>
                عند توليد أي مستند والضغط على "حفظ"، سيظهر هنا للرجوع إليه أو تصديره في أي وقت.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {savedDocs.map(doc => {
                const dateStr = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '';

                return (
                  <div
                    key={doc.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1rem',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontSize: '0.75rem' }}>
                          {doc.category || 'مستند'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={13} />
                          {dateStr}
                        </span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 'bold' }}>
                        {doc.title}
                      </h4>
                      {doc.formValues?.client_name && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          الموكل: <strong>{doc.formValues.client_name}</strong>
                          {doc.formValues.opponent_name && ` | الخصم: ${doc.formValues.opponent_name}`}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => exportDocumentToDocx({
                          title: doc.title,
                          content: doc.content,
                          officeProfile
                        })}
                        className="btn btn-secondary btn-sm"
                        title="تنزيل Word"
                        style={{ padding: '0.35rem 0.65rem' }}
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
                        className="btn btn-gold btn-sm"
                        style={{ padding: '0.35rem 0.75rem', fontWeight: 'bold' }}
                      >
                        <Edit3 size={14} />
                        <span>فتح بالمحرر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من حذف هذا المستند من الأرشيف؟')) {
                            onDeleteDoc(doc.id);
                          }
                        }}
                        className="btn btn-danger btn-icon"
                        style={{ width: '32px', height: '32px', padding: 0 }}
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
