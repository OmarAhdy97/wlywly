import React, { useMemo, useState } from 'react';
import { X, Search, Check, ArrowRight } from 'lucide-react';

const FILTERS = [
  ['ALL', 'الكل'],
  ['MINE', 'المحددة له'],
  ['FREE', 'غير مسندة'],
];

/**
 * One assignment dialog for cases, administrative tasks and bailiff papers.
 *
 * items         records that can be assigned
 * selectedIds   ids currently ticked
 * isTaken(item) true when the record already belongs to somebody (used by the "غير مسندة" filter)
 * ownerName(item) name of another assignee, shown on the row
 * matches(item, q) search predicate (q is lower-cased)
 * describe(item) -> { title, tag, meta: string[] }
 */
export default function AssignModal({
  title, noun, member, items, selectedIds, setSelectedIds, isTaken, ownerName, matches, describe,
  searchPlaceholder, saving, onSave, onClose, backLabel = null,
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('ALL');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const selected = selectedIds.includes(it.id);
      if (mode === 'MINE' && !selected) return false;
      if (mode === 'FREE' && (isTaken(it) || selected)) return false;
      return !q || matches(it, q);
    });
  }, [items, query, mode, selectedIds, isTaken, matches]);

  const toggle = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const visibleIds = visible.map((it) => it.id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog assign-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-stack">
            {backLabel && (
              <button type="button" className="modal-back" onClick={onClose}>
                <ArrowRight size={15} /> رجوع إلى {backLabel}
              </button>
            )}
            <h3>{title} — {member.name}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body assign-body">
          <div className="assign-tools">
            <div className="page-search">
              <Search size={16} />
              <input
                type="text"
                className="form-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="seg-tabs">
              {FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`seg-tab ${mode === id ? 'is-active' : ''}`}
                  onClick={() => setMode(id)}
                >
                  {label}
                  {id === 'ALL' && <span className="seg-count">{items.length}</span>}
                  {id === 'MINE' && <span className="seg-count">{selectedIds.length}</span>}
                </button>
              ))}
            </div>
          </div>

          {visibleIds.length > 0 && (
            <div className="assign-bulk">
              <span>المعروض: {visibleIds.length}</span>
              <span className="assign-bulk-actions">
                <button type="button" onClick={() => setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))}>
                  تحديد المعروض
                </button>
                <button type="button" onClick={() => setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))}>
                  إلغاء تحديد المعروض
                </button>
              </span>
            </div>
          )}

          {visible.length === 0 ? (
            <p className="empty-line">لا توجد نتائج مطابقة.</p>
          ) : (
            <ul className="assign-list">
              {visible.map((it) => {
                const selected = selectedIds.includes(it.id);
                const other = !selected ? ownerName(it) : null;
                const d = describe(it);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      className={`assign-row ${selected ? 'is-selected' : ''}`}
                      onClick={() => toggle(it.id)}
                      aria-pressed={selected}
                    >
                      <span className="assign-check">{selected && <Check size={14} strokeWidth={3} />}</span>
                      <span className="assign-main">
                        <span className="assign-title">
                          <strong>{d.title}</strong>
                          {d.tag && <span className="badge">{d.tag}</span>}
                        </span>
                        {d.meta.length > 0 && <span className="cell-sub">{d.meta.join(' · ')}</span>}
                      </span>
                      <span className="assign-state">
                        {selected ? 'محددة' : other ? `عند ${other}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="modal-footer assign-footer">
          <span className="cell-sub">{selectedIds.length} {noun} مسندة</span>
          <div className="assign-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{backLabel ? 'رجوع' : 'إلغاء'}</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={onSave}>
              {saving ? 'جارٍ الحفظ…' : 'حفظ الإسناد'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
