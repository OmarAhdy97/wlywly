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
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-700)', textTransform: 'uppercase' }}>
              السجلات المؤرشفة والقضايا المنتهية
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            أرشيف القضايا المنتهية
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontWeight: '700', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
            {filtered.length} قضية مؤرشفة
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.15rem', borderRadius: '14px' }}>
        <div className="header-search" style={{ width: '100%', minHeight: '40px', borderRadius: '10px' }}>
          <Search size={17} style={{ color: 'var(--text-subtle)' }} />
          <input 
            type="text" 
            placeholder="بحث في الأرشيف برقم القضية، السنة، أو أسماء الخصوم..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '0.88rem' }}
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
          <div className="modal-dialog" style={{ maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
                  <Archive size={20} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
                  ملف القضية المؤرشفة رقم {selectedCase.case_number}/{selectedCase.case_year}
                </h3>
              </div>
              <button className="btn btn-secondary btn-icon" style={{ borderRadius: '8px', width: '36px', height: '36px', padding: 0 }} onClick={() => setSelectedCase(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <FileText size={20} color="var(--primary-800)" />
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                      {selectedCase.case_title || `دعوى رقم ${selectedCase.case_number}`}
                    </h4>
                  </div>
                  <span className="badge" style={{ background: 'var(--status-dismissed-bg)', color: 'var(--status-dismissed)', fontWeight: '700', padding: '0.35rem 0.85rem' }}>
                    مؤرشفة
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', textAlign: 'center', padding: '0.5rem 0' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>نوع الدعوى</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{CASE_TYPES[selectedCase.case_type] || selectedCase.case_type || '—'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>درجة التقاضي</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{COURT_LEVELS[selectedCase.court_level] || selectedCase.court_level || '—'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المحكمة</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{selectedCase.court_name || '—'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المدعي</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{selectedCase.plaintiff_name || '—'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المدعى عليه</span>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{selectedCase.defendant_name || '—'}</div>
                  </div>
                </div>
              </div>

              {selectedCase.ruling_text && (
                <div style={{ padding: '1.25rem', background: 'var(--status-judgment-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--status-judgment)' }}>منطوق الحكم النهائي الصادر:</strong>
                  <p style={{ marginTop: '0.5rem', lineHeight: '1.6', fontSize: '0.95rem' }}>{selectedCase.ruling_text}</p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" style={{ borderRadius: '8px', padding: '0.55rem 1.5rem', fontWeight: '700' }} onClick={() => setSelectedCase(null)}>
                إغلاق
              </button>
              <button className="btn btn-primary" style={{ background: 'var(--primary-800)', borderRadius: '8px', padding: '0.55rem 1.35rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleRestore(selectedCase.id)}>
                <RotateCcw size={16} />
                <span>استعادة إلى القضايا المتداولة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
