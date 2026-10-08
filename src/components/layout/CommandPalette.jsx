import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Briefcase, Users, CornerDownLeft, LayoutGrid } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { NAV_GROUPS } from '../../lib/navigation';
import { setFocusTarget } from '../../lib/focusTarget';

const norm = (s) =>
  String(s || '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();

const PAGES = NAV_GROUPS.flatMap((g) => g.items).map((i) => ({ id: i.id, label: i.label }));

export default function CommandPalette({ isOpen, onClose, setActiveTab }) {
  const { cases, clients } = useData();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = norm(query);
    const out = [];
    if (!q) {
      PAGES.slice(0, 8).forEach((p) => out.push({ kind: 'page', key: 'p' + p.id, title: p.label, run: () => setActiveTab(p.id) }));
      return out;
    }
    PAGES.filter((p) => norm(p.label).includes(q)).slice(0, 3).forEach((p) =>
      out.push({ kind: 'page', key: 'p' + p.id, title: p.label, sub: 'انتقال إلى الصفحة', run: () => setActiveTab(p.id) })
    );
    (cases || [])
      .filter((c) => norm([c.case_number, c.case_year, c.case_title, c.plaintiff_name, c.defendant_name, c.court_name].join(' ')).includes(q))
      .slice(0, 6)
      .forEach((c) =>
        out.push({
          kind: 'case',
          key: 'c' + c.id,
          title: `قضية ${c.case_number}/${c.case_year}${c.case_title ? ' — ' + c.case_title : ''}`,
          sub: [c.plaintiff_name, c.defendant_name].filter(Boolean).join(' ضد ') + (c.court_name ? ' · ' + c.court_name : ''),
          run: () => {
            setActiveTab(c.is_archived ? 'archive' : 'cases');
            setFocusTarget({ type: 'case', id: c.id });
          },
        })
      );
    (clients || [])
      .filter((c) => norm([c.name, c.phone, c.national_id].join(' ')).includes(q))
      .slice(0, 5)
      .forEach((c) =>
        out.push({
          kind: 'client',
          key: 'k' + c.id,
          title: c.name,
          sub: c.phone || '',
          run: () => {
            setActiveTab('clients');
            setFocusTarget({ type: 'client', id: c.id, name: c.name });
          },
        })
      );
    return out;
  }, [query, cases, clients, setActiveTab]);

  useEffect(() => setIndex(0), [query]);

  if (!isOpen) return null;

  const choose = (item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[index]);
    }
  };

  const Icon = { page: LayoutGrid, case: Briefcase, client: Users };

  return (
    <div className="modal-backdrop palette-backdrop" onClick={onClose}>
      <div className="palette" role="dialog" aria-label="بحث سريع" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="palette-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث برقم القضية أو اسم الموكل أو الصفحة…"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list">
          {results.length === 0 ? (
            <div className="palette-empty">لا توجد نتائج لـ «{query}»</div>
          ) : (
            results.map((r, i) => {
              const I = Icon[r.kind];
              return (
                <button
                  type="button"
                  key={r.key}
                  className={`palette-item ${i === index ? 'is-active' : ''}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => choose(r)}
                >
                  <I size={16} />
                  <span className="palette-text">
                    <span className="palette-title">{r.title}</span>
                    {r.sub && <span className="palette-sub">{r.sub}</span>}
                  </span>
                  {i === index && <CornerDownLeft size={14} />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
