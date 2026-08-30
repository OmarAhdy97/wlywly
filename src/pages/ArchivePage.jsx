import React, { useState } from 'react';
import { Archive, Search, RotateCcw, Trash2, Eye, X, FileText, CheckCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, COURT_LEVELS } from '../lib/supabase';

export default function ArchivePage() {
  const { cases, updateCase, deleteCase } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  const archivedCases = cases.filter(c => c.is_archived);

  const filtered = archivedCases.filter(c => {
    return (
      (c.case_number && c.case_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.case_title && c.case_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.court_name && c.court_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleRestore = async (id) => {
    if (window.confirm('هل تريد استعادة هذه القضية إلى القضايا النشطة المتداولة؟')) {
      await updateCase(id, { is_archived: false, archive_date: null });
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('تحذير: سيتم حذف القضية من الأرشيف نهائياً!')) {
      await deleteCase(id);
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>أرشيف القضايا المنتهية</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            سجل القضايا المحكومة، المنتهية صلحاً، أو المؤرشفة لحفظ السجلات والمستندات.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div className="header-search" style={{ width: '100%', maxWidth: '500px' }}>
          <Search size={18} style={{ color: 'var(--text-subtle)' }} />
          <input 
            type="text" 
            placeholder="بحث في الأرشيف برقم القضية، السنة، أو أسماء الخصوم..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Archive Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <Archive size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لا توجد قضايا مؤرشفة</h3>
            <p style={{ fontSize: '0.9rem' }}>يمكنك أرشفة أي قضية منتهية من صفحة إدارة القضايا لتظهر هنا.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الدعوى والسنة</th>
                  <th>موضوع الدعوى</th>
                  <th>المحكمة</th>
                  <th>المدعي والخصم</th>
                  <th>تاريخ الأرشفة</th>
                  <th style={{ textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{c.case_number}</strong> / {c.case_year}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{CASE_TYPES[c.case_type] || c.case_type}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{c.case_title || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{COURT_LEVELS[c.court_level] || c.court_level}</div>
                    </td>
                    <td>{c.court_name}</td>
                    <td>
                      <div>{c.plaintiff_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ضد: {c.defendant_name}</div>
                    </td>
                    <td>
                      {c.archive_date ? new Date(c.archive_date).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ width: '32px', height: '32px', padding: 0 }}
                          title="عرض التفاصيل"
                          onClick={() => setSelectedCase(c)}
                        >
                          <Eye size={15} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ width: '32px', height: '32px', padding: 0 }}
                          title="استعادة للقضايا النشطة"
                          onClick={() => handleRestore(c.id)}
                        >
                          <RotateCcw size={15} color="var(--primary-600)" />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon" 
                          style={{ width: '32px', height: '32px', padding: 0 }}
                          title="حذف نهائي"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="modal-backdrop" onClick={() => setSelectedCase(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ملف القضية المؤرشفة رقم {selectedCase.case_number}/{selectedCase.case_year}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedCase(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '1rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <h4>{selectedCase.case_title}</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>المحكمة: {selectedCase.court_name}</p>
              </div>

              {selectedCase.ruling_text && (
                <div style={{ padding: '1rem', background: 'var(--status-judgment-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <strong>منطوق الحكم النهائي:</strong>
                  <p style={{ marginTop: '0.3rem' }}>{selectedCase.ruling_text}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCase(null)}>إغلاق</button>
              <button className="btn btn-primary" onClick={() => handleRestore(selectedCase.id)}>
                استعادة إلى القضايا المتداولة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
