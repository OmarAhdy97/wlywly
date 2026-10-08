// In-app replacements for window.confirm / window.alert, rendered by <DialogHost />.
let listener = null;
let seq = 0;

export function subscribeDialogs(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}

function emit(item) {
  if (listener) listener(item);
  return item;
}

// Resolves true when confirmed, false when cancelled or dismissed.
export function confirmDialog(message, { title, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = false } = {}) {
  if (!listener) return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : false);
  return new Promise((resolve) => {
    emit({ id: ++seq, kind: 'confirm', message, title, confirmLabel, cancelLabel, danger, resolve });
  });
}

// A short message that disappears by itself. tone: 'info' | 'success' | 'error' | 'warn'.
export function notify(message, tone = 'error') {
  if (!listener) {
    if (typeof window !== 'undefined') window.alert(message);
    return;
  }
  emit({ id: ++seq, kind: 'toast', message: String(message), tone });
}
