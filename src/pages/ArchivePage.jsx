import React, { useEffect, useState } from 'react';
import { Search, RotateCcw, Trash2, X, History } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, COURT_LEVELS } from '../lib/supabase';
import { takeFocusTarget, onFocusTarget } from '../lib/focusTarget';
import RowAction, { RowActions } from '../components/common/RowAction';
import { confirmDialog } from '../lib/dialog';
import { buildTimeline, CaseTimeline } from '../components/history/CaseTimeline';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

export default function ArchivePage() {
  const { cases, clients, sessions, appeals, adminTasks, adminTaskUpdates, updateCase, deleteCase } = useData();
  const [openHistory, setOpenHistory] = useState(() => new Set());
  const toggleHistory = (id) => setOpenHistory((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  const archivedCases = cases.filter((c) => c.is_archived);

  useEffect(() => {
    const open = (t) => {
      const found = archivedCases.find((c) => c.id === t.id);
      if (found) setSelectedCase(found);
    };
    const pending = takeFocusTarget('case');
    if (pending) open(pending);
    return onFocusTarget('case', open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases]);

  const q = searchTerm.trim().toLowerCase();
  const filtered = archivedCases.filter(
    (c) =>
      !q ||
      [c.case_number, c.case_title, c.plaintiff_name, c.defendant_name, c.court_name, c.case_year].some(
        (v) => v && String(v).toLowerCase().includes(q)
      )
  );

  const handleRestore = async (id) => {
    if (await confirmDialog('هل تريد إعادة هذه القضية إلى القضايا الجارية؟')) {
      await updateCase(id, { is_archived: false, archive_date: null });
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const handleDelete = async (id) => {
    if (await confirmDialog('تحذير: سيتم حذف القضية من الأرشيف نهائياً.', { danger: true, confirmLabel: 'حذف' })) {
      await deleteCase(id);
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const facts = selectedCase && [
    ['نوع الدعوى', CASE_TYPES[selectedCase.case_type] || selectedCase.case_type],
    ['درجة التقاضي', COURT_LEVELS[selectedCase.court_level] || selectedCase.court_level],
    ['المحكمة', selectedCase.court_name],
    ['المدعي', selectedCase.plaintiff_name],
    ['المدعى عليه', selectedCase.defendant_name],
    ['تاريخ الأرشفة', selectedCase.archive_date ? fmt(selectedCase.archive_date) : ''],
  ];

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>أرشيف القضايا</h1>
          <p className="page-sub">{archivedCases.length} قضية مؤرشفة</p>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="رقم القضية، السنة، الخصوم، المحكمة"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-block">
          <h3>{archivedCases.length === 0 ? 'الأرشيف فارغ' : 'لا توجد نتائج'}</h3>
          <p>{archivedCases.length === 0 ? 'القضايا المنتهية التي تنقلها إلى الأرشيف تظهر هنا.' : 'جرّب كلمة بحث أخرى.'}</p>
        </div>
      ) : (
        <div className="card row-list">
          {filtered.map((c) => {
            const isOpen = openHistory.has(c.id);
            const history = isOpen ? buildTimeline({ current: c, sessions, appeals, adminTasks, adminTaskUpdates }).items : [];
            const client = (clients || []).find((k) => k.id === c.client_id);
            return (
              <article key={c.id} className={`list-row ${isOpen ? 'is-open' : ''}`}>
                <div className="list-row-main">
                  <div className="list-row-body is-clickable" onClick={() => setSelectedCase(c)}>
                    <div className="list-row-top">
                      <button type="button" className="row-title row-title-link">
                        <span className="row-key">{c.case_number}/{c.case_year}</span>
                        <span className="row-title-text" title={c.case_title || ''}>{c.case_title || CASE_TYPES[c.case_type] || 'قضية'}</span>
                      </button>
                      <span className="status-chip" style={{ '--dot': 'var(--text-subtle)' }}>مؤرشفة</span>
                    </div>
                    <p className="list-row-sub">
                      {[CASE_TYPES[c.case_type] || c.case_type, COURT_LEVELS[c.court_level] || c.court_level, c.court_name].filter(Boolean).join(' · ')}
                    </p>
                    <p className="row-parties">
                      <span className="row-party"><small>المدعي</small>{c.plaintiff_name || '—'}</span>
                      <span className="row-vs">ضد</span>
                      <span className="row-party"><small>المدعى عليه</small>{c.defendant_name || '—'}</span>
                    </p>
                  </div>

                  <dl className="list-row-facts">
                    <div><dt>تاريخ الأرشفة</dt><dd>{c.archive_date ? new Date(c.archive_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd></div>
                    <div>
                      <dt>الموكل</dt>
                      <dd className="row-owner">
                        {client ? (<>{client.name}</>) : <span className="cell-sub">غير مرتبط</span>}
                      </dd>
                    </div>
                  </dl>

                  <div className="list-row-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRestore(c.id)}>
                      <RotateCcw size={14} /> إعادة للجارية
                    </button>
                    <RowActions>
                      <RowAction icon={History} label={isOpen ? 'إخفاء السجل' : 'سجل القضية'} onClick={() => toggleHistory(c.id)} />
                      <RowAction icon={Trash2} label="حذف نهائي" tone="danger" onClick={() => handleDelete(c.id)} />
                    </RowActions>
                  </div>
                </div>

                {isOpen && (
                  <div className="list-row-extra">
                    {history.length === 0
                      ? <p className="empty-line">لا توجد جلسات أو قرارات مسجلة لهذه القضية.</p>
                      : <CaseTimeline items={history} />}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {selectedCase && (
        <div className="modal-backdrop" onClick={() => setSelectedCase(null)}>
          <div className="modal-dialog case-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="case-dialog-title">
                <h3>قضية {selectedCase.case_number} / {selectedCase.case_year}</h3>
                <span className="status-chip" style={{ '--dot': 'var(--text-subtle)' }}>مؤرشفة</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setSelectedCase(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body case-dialog-body">
              {selectedCase.case_title && <p className="case-subject">{selectedCase.case_title}</p>}
              <dl className="facts">
                {facts.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              {selectedCase.ruling_text && (
                <div className="ruling-box">
                  <strong>منطوق الحكم</strong>
                  <p>{selectedCase.ruling_text}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedCase(null)}>إغلاق</button>
              <button type="button" className="btn btn-primary" onClick={() => handleRestore(selectedCase.id)}>
                <RotateCcw size={16} /> إعادة إلى القضايا الجارية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
