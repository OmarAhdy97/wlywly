import React, { useEffect, useMemo, useState } from 'react';
import { Search, Edit3, Trash2, Archive, Gavel, X, History } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, COURT_LEVELS, CASE_STATUSES, USER_ROLES } from '../lib/supabase';
import { formatMoney, getTransactionMeta, isDebitTransaction } from '../lib/financialCalculations';
import { takeFocusTarget, onFocusTarget } from '../lib/focusTarget';
import SessionDecisionModal from '../components/common/SessionDecisionModal';
import RowAction, { RowActions } from '../components/common/RowAction';
import { confirmDialog, notify } from '../lib/dialog';
import Select from '../components/common/Select';
import CourtInput from '../components/common/CourtInput';
import { buildTimeline, CaseTimeline, fmtDate } from '../components/history/CaseTimeline';
import DateInput from '../components/common/DateInput';

export default function CasesPage() {
  const {
    cases, clients, sessions, team, adminTasks, adminTaskUpdates, appeals, transactions, updateCase, deleteCase,
  } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [decisionCase, setDecisionCase] = useState(null);
  const [tab, setTab] = useState('log');
  const [openHistory, setOpenHistory] = useState(() => new Set());
  const toggleHistory = (id) => setOpenHistory((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const activeCases = cases.filter((c) => !c.is_archived);

  // opened from the global search
  useEffect(() => {
    const open = (t) => {
      const found = cases.find((c) => c.id === t.id);
      if (found) {
        setTab('log');
        setSelectedCase(found);
      }
    };
    const pending = takeFocusTarget('case');
    if (pending) open(pending);
    return onFocusTarget('case', open);
  }, [cases]);

  const filteredCases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return activeCases.filter((c) => {
      const matchesSearch =
        !q ||
        [c.case_number, c.case_title, c.plaintiff_name, c.defendant_name, c.court_name].some(
          (v) => v && String(v).toLowerCase().includes(q)
        );
      const matchesType =
        typeFilter === 'ALL' ||
        c.case_type === typeFilter ||
        (CASE_TYPES[typeFilter] && (c.case_type === CASE_TYPES[typeFilter] || c.case_type?.includes(CASE_TYPES[typeFilter]))) ||
        (c.case_type && CASE_TYPES[c.case_type] === CASE_TYPES[typeFilter]);
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [activeCases, searchTerm, typeFilter, statusFilter]);

  const handleArchiveCase = async (id) => {
    if (await confirmDialog('هل تريد نقل هذه القضية إلى الأرشيف؟')) {
      await updateCase(id, { is_archived: true, archive_date: new Date().toISOString() });
      if (selectedCase?.id === id) setSelectedCase(null);
    }
  };

  const handleDeleteCase = async (id) => {
    if (await confirmDialog('تحذير: سيتم حذف القضية وجميع بياناتها نهائياً. هل تريد المتابعة؟', { danger: true, confirmLabel: 'حذف' })) {
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
        court_room: editingCase.court_room || null,
        case_title: editingCase.case_title,
        plaintiff_name: editingCase.plaintiff_name,
        defendant_name: editingCase.defendant_name,
        status: editingCase.status,
        next_steps: editingCase.next_steps || null,
        next_session_date: editingCase.next_session_date || null,
        notes: editingCase.notes || null,
      });
      setEditingCase(null);
    } catch (err) {
      notify('خطأ أثناء تعديل القضية: ' + err.message);
    }
  };

  const setEdit = (field) => (e) => setEditingCase({ ...editingCase, [field]: e.target.value });

  const renderDetails = () => {
    const current = cases.find((c) => c.id === selectedCase.id) || selectedCase;
    const st = CASE_STATUSES[current.status] || CASE_STATUSES.active;
    const { items, caseTasks } = buildTimeline({ current, sessions, appeals, adminTasks, adminTaskUpdates });
    const assigned = team.find(
      (m) => m.id === current.next_steps || m.id === (current.next_steps || '').replace('assigned:', '')
    );
    const client = clients.find((c) => c.id === current.client_id);
    const caseTx = (transactions || []).filter((t) => String(t.case_id) === String(current.id));
    const billed = caseTx.filter((t) => isDebitTransaction(t.type)).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const paid = caseTx.filter((t) => !isDebitTransaction(t.type)).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const facts = [
      ['نوع الدعوى', CASE_TYPES[current.case_type] || current.case_type],
      ['درجة التقاضي', COURT_LEVELS[current.court_level] || current.court_level],
      ['المحكمة', [current.court_name, current.court_room && `دائرة ${current.court_room}`].filter(Boolean).join(' — ')],
      ['المدعي', current.plaintiff_name],
      ['المدعى عليه', current.defendant_name],
      ['الموكل', client?.name],
      ['المحامي المكلف', assigned ? `الأستاذ / ${assigned.name}` : ''],
      ['الجلسة القادمة', current.next_session_date ? fmtDate(current.next_session_date) : ''],
    ];

    return (
      <div className="modal-backdrop" onClick={() => setSelectedCase(null)}>
        <div className="modal-dialog case-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="case-dialog-title">
              <h3>قضية {current.case_number} / {current.case_year}</h3>
              <span className="status-chip" style={{ '--dot': st.color }}>{st.label}</span>
            </div>
            <button type="button" className="icon-btn" onClick={() => setSelectedCase(null)} aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body case-dialog-body">
            {current.case_title && <p className="case-subject">{current.case_title}</p>}

            <dl className="facts">
              {facts.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="case-dialog-actions">
              <button type="button" className="btn btn-primary" onClick={() => setDecisionCase(current)}>
                <Gavel size={16} /> تسجيل قرار / تأجيل
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingCase({ ...current }); }}>
                <Edit3 size={16} /> تعديل
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handleArchiveCase(current.id)}>
                <Archive size={16} /> أرشفة
              </button>
            </div>

            <div className="seg-tabs" role="tablist">
              {[
                ['log', `السجل (${items.length})`],
                ['tasks', `المهام (${caseTasks.length})`],
                ['money', 'الحسابات'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`seg-tab ${tab === id ? 'is-active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'log' && (
              items.length === 0 ? (
                <p className="empty-line">لا توجد جلسات أو قرارات مسجلة بعد. عند تسجيل قرار الجلسة يظهر هنا تلقائياً.</p>
              ) : (
                <CaseTimeline items={items} />
              )
            )}

            {tab === 'tasks' && (
              caseTasks.length === 0 ? (
                <p className="empty-line">لا توجد مهام إدارية مرتبطة بهذه القضية.</p>
              ) : (
                <ul className="mini-list">
                  {caseTasks.map((t) => (
                    <li key={t.id}>
                      <div>
                        <strong>{t.title}</strong>
                        <span className="cell-sub">{t.execution_date ? fmtDate(t.execution_date) : 'بدون موعد'}{t.location ? ` · ${t.location}` : ''}</span>
                      </div>
                      <span className={`badge ${t.status === 'completed' ? 'is-done' : ''}`}>
                        {t.status === 'completed' ? 'تم' : t.status === 'waiting' ? 'متوقف' : 'قيد الانتظار'}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            )}

            {tab === 'money' && (
              caseTx.length === 0 ? (
                <p className="empty-line">لا توجد معاملات مالية مسجلة على هذه القضية{client ? '' : '، ولم يتم ربطها بموكل'}.</p>
              ) : (
                <>
                  <div className="money-strip">
                    <div><span>مطلوب من الموكل</span><b>{formatMoney(billed)}</b></div>
                    <div><span>المسدد</span><b>{formatMoney(paid)}</b></div>
                    <div><span>المتبقي</span><b>{formatMoney(billed - paid)}</b></div>
                  </div>
                  <ul className="mini-list">
                    {caseTx.map((t) => {
                      const meta = getTransactionMeta(t.type);
                      return (
                        <li key={t.id}>
                          <div>
                            <strong>{meta.label}</strong>
                            <span className="cell-sub">{fmtDate(t.date, { day: 'numeric', month: 'short', year: 'numeric' })}{t.description ? ` · ${t.description}` : ''}</span>
                          </div>
                          <b>{formatMoney(t.amount)}</b>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>القضايا</h1>
          <p className="page-sub">{activeCases.length} قضية جارية</p>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="رقم القضية، الموضوع، الخصم، المحكمة"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select className="form-select toolbar-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="نوع القضية">
          <option value="ALL">كل الأنواع</option>
          {Object.entries(CASE_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select className="form-select toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="حالة القضية">
          <option value="ALL">كل الحالات</option>
          {Object.entries(CASE_STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
      </div>

      {filteredCases.length === 0 ? (
        <div className="card empty-block">
          <h3>لا توجد قضايا مطابقة</h3>
          <p>غيّر البحث أو الفلاتر، أو أضف قضية من زر «إضافة» في الأعلى.</p>
        </div>
      ) : (
        <div className="card row-list">
          {filteredCases.map((c) => {
            const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
            const isOpen = openHistory.has(c.id);
            const history = isOpen ? buildTimeline({ current: c, sessions, appeals, adminTasks, adminTaskUpdates }).items : [];
            const client = clients.find((k) => k.id === c.client_id);
            return (
              <article key={c.id} className={`list-row ${isOpen ? 'is-open' : ''}`}>
                <div className="list-row-main">
                  <div className="list-row-body is-clickable" onClick={() => { setTab('log'); setSelectedCase(c); }}>
                    <div className="list-row-top">
                      <button type="button" className="row-title row-title-link">
                        <span className="row-key">{c.case_number}/{c.case_year}</span>
                        <span className="row-title-text" title={c.case_title || ''}>{c.case_title || CASE_TYPES[c.case_type] || 'قضية'}</span>
                      </button>
                      <span className="status-chip" style={{ '--dot': st.color }}>{st.label}</span>
                    </div>
                    <p className="list-row-sub">
                      {[CASE_TYPES[c.case_type] || c.case_type, COURT_LEVELS[c.court_level] || c.court_level, c.court_name, c.court_room && `دائرة ${c.court_room}`].filter(Boolean).join(' · ')}
                    </p>
                    <p className="row-parties">
                      <span className="row-party"><small>المدعي</small>{c.plaintiff_name || '—'}</span>
                      <span className="row-vs">ضد</span>
                      <span className="row-party"><small>المدعى عليه</small>{c.defendant_name || '—'}</span>
                    </p>
                  </div>

                  <dl className="list-row-facts">
                    <div>
                      <dt>الجلسة القادمة</dt>
                      <dd>{c.next_session_date ? fmtDate(c.next_session_date, { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="cell-sub">غير محددة</span>}</dd>
                    </div>
                    <div>
                      <dt>الموكل</dt>
                      <dd className="row-owner">
                        {client ? (<>{client.name}</>) : <span className="cell-sub">غير مرتبط</span>}
                      </dd>
                    </div>
                  </dl>

                  <div className="list-row-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDecisionCase(c)}>
                      <Gavel size={14} /> قرار الجلسة
                    </button>
                    <RowActions>
                      <RowAction icon={History} label={isOpen ? 'إخفاء السجل' : 'سجل القضية'} onClick={() => toggleHistory(c.id)} />
                      <RowAction icon={Edit3} label="تعديل" onClick={() => setEditingCase({ ...c })} />
                      <RowAction icon={Archive} label="نقل للأرشيف" onClick={() => handleArchiveCase(c.id)} />
                      <RowAction icon={Trash2} label="حذف" tone="danger" onClick={() => handleDeleteCase(c.id)} />
                    </RowActions>
                  </div>
                </div>

                {isOpen && (
                  <div className="list-row-extra">
                    {history.length === 0
                      ? <p className="empty-line">لا توجد جلسات أو قرارات مسجلة بعد.</p>
                      : <CaseTimeline items={history} />}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {selectedCase && renderDetails()}

      {editingCase && (
        <div className="modal-backdrop" onClick={() => setEditingCase(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل قضية {editingCase.case_number} / {editingCase.case_year}</h3>
              <button type="button" className="icon-btn" onClick={() => setEditingCase(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">رقم الدعوى *</label>
                    <input type="text" className="form-input" required value={editingCase.case_number} onChange={setEdit('case_number')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">السنة القضائية *</label>
                    <input type="number" className="form-input" required value={editingCase.case_year} onChange={setEdit('case_year')} />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">نوع القضية</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="مدني، جنائي، أسرة…"
                      value={CASE_TYPES[editingCase.case_type] || editingCase.case_type || ''}
                      onChange={setEdit('case_type')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">درجة التقاضي</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ابتدائي، استئناف، نقض…"
                      value={COURT_LEVELS[editingCase.court_level] || editingCase.court_level || ''}
                      onChange={setEdit('court_level')}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">موضوع الدعوى</label>
                  <input type="text" className="form-input" value={editingCase.case_title || ''} onChange={setEdit('case_title')} />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">المحكمة</label>
                    <CourtInput value={editingCase.court_name || ''} onChange={(v) => setEditingCase((c) => ({ ...c, court_name: v }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الدائرة</label>
                    <input type="text" className="form-input" placeholder="الدائرة 3 مدني / قاعة 2" value={editingCase.court_room || ''} onChange={setEdit('court_room')} />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">حالة الدعوى</label>
                    <Select className="form-select" value={editingCase.status} onChange={setEdit('status')}>
                      {Object.entries(CASE_STATUSES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">المحامي المكلف</label>
                    <Select
                      className="form-select"
                      value={editingCase.next_steps || ''}
                      onChange={(e) => setEditingCase({ ...editingCase, next_steps: e.target.value || null })}
                    >
                      <option value="">غير مسندة</option>
                      {team.map((m) => (
                        <option key={m.id} value={m.id}>
                          الأستاذ / {m.name} ({USER_ROLES[m.role] || m.role})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">المدعي</label>
                    <input type="text" className="form-input" value={editingCase.plaintiff_name} onChange={setEdit('plaintiff_name')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المدعى عليه</label>
                    <input type="text" className="form-input" value={editingCase.defendant_name} onChange={setEdit('defendant_name')} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ الجلسة القادمة</label>
                  <DateInput
                    className="form-input"
                    value={editingCase.next_session_date ? editingCase.next_session_date.split('T')[0] : ''}
                    onChange={setEdit('next_session_date')} />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-textarea" value={editingCase.notes || ''} onChange={setEdit('notes')} />
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

      <SessionDecisionModal
        isOpen={!!decisionCase}
        caseItem={decisionCase}
        currentSessionDate={decisionCase?.next_session_date || new Date().toISOString().split('T')[0]}
        onClose={() => setDecisionCase(null)}
        onSuccess={(updates) => {
          if (selectedCase && selectedCase.id === decisionCase?.id) {
            setSelectedCase((prev) => ({ ...prev, ...updates }));
          }
        }}
      />
    </div>
  );
}
