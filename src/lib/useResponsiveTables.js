import { useEffect } from 'react';

/**
 * On phones the `.data-table` tables are shown as cards (see index.css). A card row needs
 * each cell to know its column title, so this copies the header text into `data-label`
 * on every cell. It runs once and again whenever the page content changes.
 * Print tables (`.print-table`) are left alone.
 */
export function labelTableCells(root = document) {
  root.querySelectorAll('table.data-table:not(.print-table)').forEach(table => {
    const heads = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    if (!heads.length) return;
    table.querySelectorAll('tbody tr').forEach(tr => {
      Array.from(tr.children).forEach((td, i) => {
        if (td.tagName !== 'TD') return;
        const label = heads[i] || '';
        if (td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
      });
    });
  });
}

export default function useResponsiveTables() {
  useEffect(() => {
    let frame = null;
    const run = () => {
      frame = null;
      labelTableCells();
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(run);
    };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
}
