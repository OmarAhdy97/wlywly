import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/*
 * A compact list where each entry opens in place to show its history.
 * items: [{ id, title, sub, chip: { label, color }, meta, render: () => node }]
 */
export default function ExpandList({ items, empty }) {
  const [open, setOpen] = useState(null);
  if (!items.length) return <p className="empty-line">{empty}</p>;
  return (
    <ul className="xlist">
      {items.map((it) => {
        const isOpen = open === it.id;
        return (
          <li key={it.id} className={`xlist-item ${isOpen ? 'is-open' : ''}`}>
            <button type="button" className="xlist-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : it.id)}>
              <span className="xlist-text">
                <span className="xlist-title">{it.title}</span>
                {it.sub && <span className="xlist-sub">{it.sub}</span>}
              </span>
              {it.meta && <span className="xlist-meta">{it.meta}</span>}
              {it.chip && <span className="status-chip" style={{ '--dot': it.chip.color }}>{it.chip.label}</span>}
              <ChevronDown size={16} className="xlist-chevron" aria-hidden="true" />
            </button>
            {isOpen && <div className="xlist-body">{it.render()}</div>}
          </li>
        );
      })}
    </ul>
  );
}
