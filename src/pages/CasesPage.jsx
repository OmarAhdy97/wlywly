import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  Archive, 
  Calendar, 
  User, 
  FileText,
  X,
  Check
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, COURT_LEVELS, CASE_STATUSES } from '../lib/supabase';

export default function CasesPage({ onOpenQuickAction }) {
  const { cases, clients, updateCase, deleteCase } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Selected Case for Details Modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);

  // Active (non-archived) cases
  const activeCases = cases.filter(c => !c.is_archived);

  // Filtered List
  const filteredCases = activeCases.filter(c => {
    const matchesSearch = 
      (c.case_number && c.case_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.case_title && c.case_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.court_name && c.court_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'ALL' || c.case_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleArchiveCase = async (id) => {
    if (window.confirm('هل أنت متأكد من رغبتك في نقل هذه القضية إلى الأرشيف؟')) {
      await updateCase(id, { is_archived: true, archive_date: new Date().toISOString() });
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const handleDeleteCase = async (id) => {
    if (window.confirm('تحذير: سيتم حذف القضية وجميع بياناتها نهائياً! هل تريد المتابعة؟')) {
      await deleteCase(id);
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCase) return;
    try {
      await updateCase(editingCase.id, {
        case_number: editingCase.case_number,
        case_year: parseInt(editingCase.case_year, 10),
        case_type: editingCase.case_type,
        court_level: editingCase.court_level,
        court_name: editingCase.court_name,
        case_title: editingCase.case_title,
        plaintiff_name: editingCase.plaintiff_name,
        defendant_name: editingCase.defendant_name,
        status: editingCase.status,
        court_room: editingCase.court_room || null,
        next_session_date: editingCase.next_session_date || null,
        notes: editingCase.notes || null,
      });
      setEditingCase(null);
    } catch (err) {
      alert('خطأ أثناء تعديل القضية: ' + err.message);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>إدارة القضايا والدعاوى المتداولة</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            سجل كامل بجميع الدعاوى، الدوائر القضائية، الخصوم، ومواعيد الجلسات.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenQuickAction}>
          <Plus size={18} />
          <span>إضافة دعوى جديدة</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          
          <div className="header-search" style={{ width: '100%' }}>
            <Search size={18} style={{ color: 'var(--text-subtle)' }} />
            <input 
              type="text" 
              placeholder="بحث برقم القضية، الموكل، أو الخصم..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)' }}>النوع:</span>
            <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">جميع الأنواع</option>
              {Object.entries(CASE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)' }}>الحالة:</span>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">جميع الحالات</option>
              {Object.entries(CASE_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Cases Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <Briefcase size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لم يتم العثور على قضايا مطابقة</h3>
            <p style={{ fontSize: '0.9rem' }}>جرب تعديل خيارات البحث أو قم بإضافة قضية جديدة.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الدعوى والسنة</th>
                  <th>موضوع الدعوى</th>
                  <th>المحكمة / الدائرة</th>
                  <th>المدعي والمدعى عليه</th>
                  <th>الجلسة القادمة</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>{c.case_number}</strong> / {c.case_year}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{CASE_TYPES[c.case_type] || c.case_type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', maxWidth: '220px' }}>{c.case_title || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{COURT_LEVELS[c.court_level] || c.court_level}</div>
                      </td>
                      <td>
                        <div>{c.court_name}</div>
                        {c.court_room && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>قاعة: {c.court_room}</div>}
                      </td>
                      <td>
                        <div><strong>المدعي:</strong> {c.plaintiff_name}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}><strong>المدعى عليه:</strong> {c.defendant_name}</div>
                      </td>
                      <td>
                        {c.next_session_date ? (
                          <div style={{ fontWeight: '600', color: 'var(--primary-600)' }}>
                            {new Date(c.next_session_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>غير محدد</span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
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
                            title="تعديل القضية"
                            onClick={() => setEditingCase({ ...c })}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            title="نقل للأرشيف"
                            onClick={() => handleArchiveCase(c.id)}
                          >
                            <Archive size={15} />
                          </button>
                          <button 
                            className="btn btn-danger btn-icon" 
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            title="حذف"
                            onClick={() => handleDeleteCase(c.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={20} color="var(--primary-600)" />
                تفاصيل الدعوى رقم {selectedCase.case_number}/{selectedCase.case_year}
              </h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedCase(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--primary-800)', marginBottom: '0.4rem' }}>{selectedCase.case_title}</h4>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                    نوع الدعوى: {CASE_TYPES[selectedCase.case_type] || selectedCase.case_type}
                  </span>
                  <span className="badge" style={{ background: 'var(--status-judgment-bg)', color: 'var(--status-judgment)' }}>
                    درجة التقاضي: {COURT_LEVELS[selectedCase.court_level] || selectedCase.court_level}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المحكمة والدائرة:</span>
                  <div style={{ fontWeight: '600' }}>{selectedCase.court_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>القاعة / الدائرة:</span>
                  <div style={{ fontWeight: '600' }}>{selectedCase.court_room || 'غير محددة'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المدعي:</span>
                  <div style={{ fontWeight: '600' }}>{selectedCase.plaintiff_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المدعى عليه:</span>
                  <div style={{ fontWeight: '600' }}>{selectedCase.defendant_name}</div>
                </div>
              </div>

              {selectedCase.ruling_text && (
                <div style={{ padding: '1rem', background: 'var(--status-judgment-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--status-judgment)' }}>منطوق الحكم / القرار:</span>
                  <p style={{ marginTop: '0.3rem', fontSize: '0.92rem' }}>{selectedCase.ruling_text}</p>
                </div>
              )}

              {selectedCase.notes && (
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ملاحظات ومستندات مطلوبة:</span>
                  <p style={{ marginTop: '0.2rem', fontSize: '0.92rem' }}>{selectedCase.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCase(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Case Modal */}
      {editingCase && (
        <div className="modal-backdrop" onClick={() => setEditingCase(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل بيانات القضية رقم {editingCase.case_number}/{editingCase.case_year}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setEditingCase(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">رقم الدعوى *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={editingCase.case_number} 
                      onChange={(e) => setEditingCase({ ...editingCase, case_number: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">السنة القضائية *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      value={editingCase.case_year} 
                      onChange={(e) => setEditingCase({ ...editingCase, case_year: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">موضوع الدعوى</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingCase.case_title || ''} 
                    onChange={(e) => setEditingCase({ ...editingCase, case_title: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">المحكمة</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingCase.court_name} 
                      onChange={(e) => setEditingCase({ ...editingCase, court_name: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">حالة الدعوى</label>
                    <select 
                      className="form-select" 
                      value={editingCase.status} 
                      onChange={(e) => setEditingCase({ ...editingCase, status: e.target.value })}
                    >
                      {Object.entries(CASE_STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">المدعي</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingCase.plaintiff_name} 
                      onChange={(e) => setEditingCase({ ...editingCase, plaintiff_name: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المدعى عليه</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingCase.defendant_name} 
                      onChange={(e) => setEditingCase({ ...editingCase, defendant_name: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ الجلسة القادمة</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={editingCase.next_session_date ? editingCase.next_session_date.split('T')[0] : ''} 
                    onChange={(e) => setEditingCase({ ...editingCase, next_session_date: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات وقرارات</label>
                  <textarea 
                    className="form-textarea" 
                    value={editingCase.notes || ''} 
                    onChange={(e) => setEditingCase({ ...editingCase, notes: e.target.value })} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCase(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
