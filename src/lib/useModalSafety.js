import { useEffect } from 'react';

/**
 * A dialog that holds form fields must not close because of a stray click on the dimmed
 * backdrop (the lawyer would lose everything typed). Read-only dialogs still close on a
 * backdrop click. The X and Cancel buttons always work.
 */
export default function useModalSafety() {
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target;
      if (!(el instanceof Element) || !el.classList.contains('modal-backdrop')) return;
      if (el.querySelector('form, textarea, input:not([type="hidden"]):not([readonly]), select')) {
        e.stopPropagation();
      }
    };
    // capture phase: runs before React's own onClick on the backdrop
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
}
