import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Landmark } from 'lucide-react';
import { searchCourtDirectory } from '../../lib/egyptCourts';

/*
 * A text field for a court name with a searchable directory of Egyptian courts.
 * The lawyer can pick a suggestion or keep typing any name; the value is plain text.
 * onChange receives the new string.
 */
export default function CourtInput({ value, onChange, className = 'form-input', placeholder = 'ابحث باسم المحكمة أو المحافظة أو المركز', required, id, extra = [] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const results = useMemo(() => {
    const found = searchCourtDirectory(value || '', 60);
    const q = (value || '').trim();
    const local = extra
      .filter((n) => n && (!q || n.includes(q)) && !found.some((f) => f.name === n))
      .slice(0, 5)
      .map((name) => ({ name, typeLabel: 'مستخدمة سابقاً', governorate: '' }));
    return [...local, ...found];
  }, [value, extra]);

  const place = useCallback(() => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (inputRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (court) => {
    onChange?.(court.name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && open && active >= 0 && results[active]) { e.preventDefault(); pick(results[active]); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'Tab') setOpen(false);
  };

  let pop = null;
  if (open && rect && results.length > 0) {
    const below = window.innerHeight - rect.bottom;
    const up = below < 260 && rect.top > below;
    pop = createPortal(
      <div
        ref={listRef}
        className="select-pop"
        dir="rtl"
        style={{
          position: 'fixed',
          left: rect.left,
          width: Math.max(rect.width, 260),
          ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
          maxHeight: Math.min(320, (up ? rect.top : below) - 16),
        }}
      >
        <ul id={listId} role="listbox" className="select-list">
          {results.map((c, i) => (
            <li
              key={c.name}
              data-index={i}
              role="option"
              aria-selected={c.name === value}
              className={`select-option court-option ${i === active ? 'is-active' : ''} ${c.name === value ? 'is-selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
            >
              <span className="court-option-name">{c.name}</span>
              <span className="court-option-meta">{[c.typeLabel, c.governorate].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
      </div>,
      document.body
    );
  }

  return (
    <div className="court-input">
      <Landmark size={15} className="court-input-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={className}
        value={value || ''}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange?.(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
      />
      {pop}
    </div>
  );
}
